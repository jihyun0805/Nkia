# 인수인계 메모: 챗봇 서비스 계층입니다. 색인, 검색, 근거 선별, 답변 생성, 추천/비교 등 실제 업무 로직이 모여 있습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
"""
pg_notify 기반 실시간 AI 색인 리스너.

PostgreSQL LISTEN 'ai_index_change' 채널을 구독하고, 실 엔티티 테이블의
INSERT / UPDATE / DELETE 이벤트를 수신해 즉시 임베딩을 생성/갱신/삭제한다.

흐름:
  Spring CUD → DB 트리거 → pg_notify('ai_index_change', payload)
                                       ↓
                           listen_and_index() 수신
                                       ↓
                INSERT/UPDATE → row 조회 → build_document → index_documents()
                DELETE        → ai_knowledge_sources 역조회 → index_documents(DELETE)
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.core.database import pool
from app.embeddings.model import EmbeddingModel
from app.repositories.backend_query_repository import build_backend_database_url
from app.schemas.indexing import IndexDocumentRequest
from app.services.document_builder import DocumentConfig, TABLE_TO_CONFIG, build_document
from app.services.indexing_service import index_documents

logger = logging.getLogger(__name__)

_CHANNEL = "ai_index_change"
_RECONNECT_DELAY = 5  # seconds


# ---------------------------------------------------------------------------
# 공개 진입점
# ---------------------------------------------------------------------------

async def listen_and_index(*, embedder: EmbeddingModel) -> None:
    """
    FastAPI lifespan 에서 asyncio.create_task 로 실행.
    연결이 끊기면 _RECONNECT_DELAY 초 후 자동 재접속한다.
    pg_notify 는 커밋 이후 접속 중인 리스너에게만 전달되므로, 장애 중 누락분은 reindex_orbis_data.py 로 보정한다.
    """
    db_url = build_backend_database_url()
    while True:
        try:
            async with await psycopg.AsyncConnection.connect(db_url) as conn:
                await conn.set_autocommit(True)
                await conn.execute(f"LISTEN {_CHANNEL}")
                logger.info("[index_listener] LISTEN %s 시작", _CHANNEL)
                async for notify in conn.notifies():
                    # 알림 처리는 별도 태스크로 분리해 LISTEN 루프를 블록하지 않음
                    asyncio.create_task(
                        _handle_notification(notify.payload, embedder=embedder),
                        name=f"ai_index_{notify.payload[:40]}",
                    )
        except asyncio.CancelledError:
            logger.info("[index_listener] 종료 (CancelledError)")
            return
        except Exception as exc:
            logger.warning("[index_listener] 연결 끊김: %s — %ds 후 재접속", exc, _RECONNECT_DELAY)
            await asyncio.sleep(_RECONNECT_DELAY)


# ---------------------------------------------------------------------------
# 알림 처리
# ---------------------------------------------------------------------------

async def _handle_notification(payload_str: str, *, embedder: EmbeddingModel) -> None:
    try:
        payload = json.loads(payload_str)
        table: str = payload["table"]
        op: str = payload["op"]          # INSERT | UPDATE | DELETE
        row_id: int = int(payload["id"])
        event_at: str | None = payload.get("eventAt")
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.warning("[index_listener] 잘못된 payload: %s (%s)", payload_str, exc)
        return

    config = TABLE_TO_CONFIG.get(table)
    if config is None:
        return  # 색인 대상이 아닌 테이블

    try:
        if op == "DELETE":
            await _handle_delete(config=config, row_id=row_id, event_at=event_at, embedder=embedder)
        else:
            await _handle_upsert(config=config, row_id=row_id, op=op, event_at=event_at, embedder=embedder)
    except Exception as exc:
        logger.exception("[index_listener] %s %s#%s 처리 중 오류: %s", op, table, row_id, exc)


async def _handle_upsert(*, config: DocumentConfig, row_id: int, op: str, event_at: str | None, embedder: EmbeddingModel) -> None:
    db_url = build_backend_database_url()
    row = await _fetch_row(table=config.table, row_id=row_id, db_url=db_url)
    if row is None:
        logger.warning("[index_listener] %s: %s#%d row 없음", op, config.table, row_id)
        return

    doc = build_document(config=config, row=dict(row))
    if doc is None:
        logger.warning("[index_listener] %s: %s#%d doc 빌드 실패 (source_id 없음)", op, config.table, row_id)
        return
    doc["eventId"] = build_notify_event_id(table=config.table, op=op, row_id=row_id, event_at=event_at)
    if event_at:
        doc["occurredAt"] = event_at

    req = _to_request(doc)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: index_documents(documents=[req], embedder=embedder))
    logger.info("[index_listener] %s %s#%d → %s:%s", op, config.table, row_id, doc["sourceType"], doc["sourceId"])


async def _handle_delete(*, config: DocumentConfig, row_id: int, event_at: str | None, embedder: EmbeddingModel) -> None:
    # ai_knowledge_sources 에서 dbPk 로 source_id 역조회
    loop = asyncio.get_event_loop()
    source_id = await loop.run_in_executor(
        None,
        lambda: _lookup_source_id(source_type=config.source_type, db_pk=str(row_id)),
    )

    if source_id is None:
        logger.warning("[index_listener] DELETE: %s#%d 에 해당하는 색인 레코드 없음 (dbPk 미보유 — 다음 재색인 시 정리됨)", config.table, row_id)
        return

    req = IndexDocumentRequest(
        sourceType=config.source_type,
        sourceId=source_id,
        operation="DELETE",
        title="",
        payload={},
        metadata={"origin": "notify", "sourceTable": config.table},
        eventId=build_notify_event_id(table=config.table, op="DELETE", row_id=row_id, event_at=event_at),
        occurredAt=_parse_event_at(event_at),
    )
    await loop.run_in_executor(None, lambda: index_documents(documents=[req], embedder=embedder))
    logger.info("[index_listener] DELETE %s#%d → %s:%s", config.table, row_id, config.source_type, source_id)


# ---------------------------------------------------------------------------
# 내부 헬퍼
# ---------------------------------------------------------------------------

async def _fetch_row(*, table: str, row_id: int, db_url: str) -> dict[str, Any] | None:
    try:
        async with await psycopg.AsyncConnection.connect(db_url, row_factory=dict_row) as conn:
            async with conn.cursor() as cur:
                if table == "sales_activity":
                    await cur.execute(
                        """
                        SELECT a.*,
                               o.opportunity_name,
                               c.name AS customer_name
                        FROM public.sales_activity a
                        LEFT JOIN public.project_opportunity o ON o.id = a.project_opportunity_id
                        LEFT JOIN public.company c ON c.id = o.customer_company_id
                        WHERE a.id = %s
                        """,
                        (row_id,),
                    )
                else:
                    await cur.execute(f"SELECT * FROM public.{table} WHERE id = %s", (row_id,))
                return await cur.fetchone()
    except Exception as exc:
        logger.warning("[index_listener] row 조회 실패 table=%s id=%d: %s", table, row_id, exc)
        return None


def _lookup_source_id(*, source_type: str, db_pk: str) -> str | None:
    """
    ai.ai_knowledge_sources 에서 dbPk 메타데이터로 source_id 를 역조회.
    build_metadata 가 dbPk 를 저장하는 리스너 경유 색인 레코드에만 유효.
    """
    try:
        with pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    SELECT source_id
                    FROM ai.ai_knowledge_sources
                    WHERE source_type = %s
                      AND metadata->>'dbPk' = %s
                      AND NOT is_deleted
                    LIMIT 1
                    """,
                    (source_type, db_pk),
                )
                row = cur.fetchone()
        return row["source_id"] if row else None
    except Exception as exc:
        logger.warning("[index_listener] source_id 역조회 실패 %s dbPk=%s: %s", source_type, db_pk, exc)
        return None


def build_notify_event_id(*, table: str, op: str, row_id: int, event_at: str | None) -> str:
    event_marker = event_at or "na"
    return f"notify:{table}:{op}:{row_id}:{event_marker}"


def _parse_event_at(event_at: str | None) -> datetime | None:
    if not event_at:
        return None
    try:
        dt = datetime.fromisoformat(event_at)
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _to_request(doc: dict[str, Any]) -> IndexDocumentRequest:
    occurred_at = doc.get("occurredAt")
    if isinstance(occurred_at, str):
        try:
            dt = datetime.fromisoformat(occurred_at)
            if dt.tzinfo is None:
                occurred_at = dt.replace(tzinfo=timezone.utc)
            else:
                occurred_at = dt
        except ValueError:
            occurred_at = None
    elif isinstance(occurred_at, datetime) and occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)

    deleted_at = doc.get("deletedAt")
    if isinstance(deleted_at, str):
        try:
            dt = datetime.fromisoformat(deleted_at)
            if dt.tzinfo is None:
                deleted_at = dt.replace(tzinfo=timezone.utc)
            else:
                deleted_at = dt
        except ValueError:
            deleted_at = None
    elif isinstance(deleted_at, datetime) and deleted_at.tzinfo is None:
        deleted_at = deleted_at.replace(tzinfo=timezone.utc)

    return IndexDocumentRequest(
        sourceType=doc["sourceType"],
        sourceId=doc["sourceId"],
        operation=doc.get("operation", "UPSERT"),
        title=doc.get("title"),
        sourcePath=doc.get("sourcePath"),
        content=doc.get("content"),
        payload=doc.get("payload", {}),
        metadata=doc.get("metadata", {}),
        deleted=bool(doc.get("deleted", False)),
        deletedAt=deleted_at,
        eventId=doc.get("eventId"),
        occurredAt=occurred_at,
    )
