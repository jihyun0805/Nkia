"""Tool executor: SQL 실행 + 권한 적용.

4가지 tool 을 지원한다:
  - aggregate_metric
  - list_entities
  - lookup_entity
  - search_documents
"""

from __future__ import annotations

import logging
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.core.config import settings as _settings
from app.models.user_context import UserContext
from app.repositories.backend_query_repository import (
    build_backend_database_url as _build_owner_database_url,
)
from app.tools.domain_registry import DomainSpec, get_domain


def build_backend_database_url() -> str:
    """tool executor 전용 read-only connection URL.

    AI 는 public schema 에서 SELECT 만 가능해야 한다는 보안 요구를 충족.
    AI_DATABASE_URL (orbis_ai user — SELECT only) 우선, 미설정 시 owner 로 fallback.
    """
    url = getattr(_settings, "ai_database_url", None)
    if url:
        return url
    return _build_owner_database_url()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 포맷 헬퍼
# ---------------------------------------------------------------------------

try:
    from app.services.structured_answer_service import format_number
except ImportError:
    def format_number(value: Any, suffix: str = "원") -> str:  # type: ignore[misc]
        if value is None:
            return "미기재"
        try:
            return f"{int(value):,}{suffix}"
        except (TypeError, ValueError):
            return str(value)


# ---------------------------------------------------------------------------
# 화이트리스트 (SQL Injection 방지)
# ---------------------------------------------------------------------------
# 도메인별 컬럼/공개 여부 매핑은 app.tools.domain_registry 가 단일 출처.

_ALLOWED_OPS: frozenset[str] = frozenset({"sum", "avg", "min", "max", "count"})


# ---------------------------------------------------------------------------
# 내부 유틸
# ---------------------------------------------------------------------------

def _validate_domain(domain: str) -> DomainSpec:
    spec = get_domain(domain)
    if spec is None:
        raise ValueError(f"허용되지 않은 domain: {domain!r}")
    return spec


def _validate_op(op: str) -> str:
    op_lower = op.lower()
    if op_lower not in _ALLOWED_OPS:
        raise ValueError(f"허용되지 않은 op: {op!r}")
    return op_lower


def _validate_sort_dir(sort_dir: str) -> str:
    upper = sort_dir.upper()
    if upper not in {"ASC", "DESC"}:
        raise ValueError(f"허용되지 않은 sort_dir: {sort_dir!r}")
    return upper


def _err(msg: str, exc: Exception | None = None) -> dict[str, Any]:
    err_str = f"{msg}: {exc}" if exc else msg
    logger.warning("tool executor error: %s", err_str)
    return {
        "ok": False,
        "rows": [],
        "summary": f"실행 실패: {err_str}",
        "metric_value": None,
        "error": err_str,
    }


def _opportunity_codes_from_context(user_context: UserContext) -> list[str] | None:
    """accessible_source_ids 에서 PROJECT_OPPORTUNITY:: 접두어를 가진 코드 추출."""
    if user_context.accessible_source_ids is None:
        return None  # 제한 없음
    codes = []
    for sid in user_context.accessible_source_ids:
        if "::" in sid:
            source_type, _, code = sid.partition("::")
            if source_type == "PROJECT_OPPORTUNITY" and code:
                codes.append(code)
        # 접두어 없는 경우 opportunity code 로 간주
    return codes


def _build_permission_clause(
    spec: DomainSpec,
    user_context: UserContext | None,
    params: list[Any],
) -> str:
    """권한 WHERE 절 반환. 제한 없으면 빈 문자열."""
    if user_context is None or user_context.is_unrestricted():
        return ""
    if spec.is_public:
        return ""

    codes = _opportunity_codes_from_context(user_context)
    if codes is None:
        return ""

    is_opportunity_table = spec.name == "project_opportunity"
    if not codes:
        params.append(["__NEVER__"])
    else:
        params.append(codes)

    if is_opportunity_table:
        return " AND opportunity_code = ANY(%s)"
    return (
        " AND project_opportunity_id IN "
        "(SELECT id FROM project_opportunity WHERE opportunity_code = ANY(%s))"
    )


# ---------------------------------------------------------------------------
# Tool 구현
# ---------------------------------------------------------------------------

def _aggregate_metric(
    domain: str,
    metric: str | None,
    op: str,
    filters: dict[str, Any],
    user_context: UserContext | None,
) -> dict[str, Any]:
    """SELECT op(metric) FROM domain WHERE ... AND deleted=false"""
    try:
        spec = _validate_domain(domain)
        op = _validate_op(op)
    except ValueError as exc:
        return _err(str(exc))

    params: list[Any] = []
    where_clauses = ["deleted = false"]

    _apply_filters(spec, filters, where_clauses, params)

    perm_clause = _build_permission_clause(spec, user_context, params)
    if perm_clause:
        where_clauses.append(perm_clause.lstrip(" AND "))

    if user_context and not user_context.is_unrestricted() and not spec.is_public:
        codes = _opportunity_codes_from_context(user_context)
        if codes is not None and len(codes) == 0:
            return {
                "ok": False,
                "rows": [],
                "summary": "접근 가능한 데이터 없음",
                "metric_value": None,
                "error": "접근 가능한 데이터 없음",
            }

    if op == "count":
        select_expr = "COUNT(*) AS count, COUNT(*) AS _count_n"
    else:
        if not metric:
            return _err("op이 count가 아닐 때 metric 은 필수입니다")
        if not _is_safe_identifier(metric):
            return _err(f"허용되지 않은 metric 컬럼명: {metric!r}")
        select_expr = f"{op.upper()}({metric}) AS {op}, COUNT(*) AS _count_n"

    where_sql = " AND ".join(where_clauses)
    sql = f"SELECT {select_expr} FROM {spec.name} WHERE {where_sql}"

    try:
        with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                row = cur.fetchone() or {}
    except Exception as exc:
        return _err("DB 조회 오류", exc)

    n = int(row.get("_count_n") or 0)
    if op == "count":
        val = int(row.get("count") or 0)
    else:
        val = row.get(op)

    metric_label = "건수" if op == "count" else metric
    if val is None:
        summary = f"{spec.name} {metric_label} {op} = 데이터 없음"
    else:
        try:
            val_int = int(val)
            formatted = f"{val_int:,}"
        except (TypeError, ValueError):
            formatted = str(val)
        suffix = "건" if op == "count" else "원"
        summary = f"{spec.name} {metric_label} {op} = {formatted}{suffix} ({n:,}건)"

    result_row = {op: val, "_count_n": n}
    return {
        "ok": True,
        "rows": [result_row],
        "summary": summary,
        "metric_value": val,
        "error": None,
    }


def _list_entities(
    domain: str,
    sort_by: str | None,
    sort_dir: str,
    top_n: int,
    filters: dict[str, Any],
    user_context: UserContext | None,
) -> dict[str, Any]:
    """SELECT * FROM domain WHERE ... ORDER BY sort_by sort_dir LIMIT top_n"""
    try:
        spec = _validate_domain(domain)
        sort_dir = _validate_sort_dir(sort_dir)
    except ValueError as exc:
        return _err(str(exc))

    if sort_by and not _is_safe_identifier(sort_by):
        return _err(f"허용되지 않은 sort_by 컬럼명: {sort_by!r}")

    top_n = max(1, min(int(top_n or 10), 200))

    if user_context and not user_context.is_unrestricted() and not spec.is_public:
        codes = _opportunity_codes_from_context(user_context)
        if codes is not None and len(codes) == 0:
            return {
                "ok": False,
                "rows": [],
                "summary": "접근 가능한 데이터 없음",
                "metric_value": None,
                "error": "접근 가능한 데이터 없음",
            }

    params: list[Any] = []
    where_clauses = ["deleted = false"]

    _apply_filters(spec, filters, where_clauses, params)

    perm_clause = _build_permission_clause(spec, user_context, params)
    if perm_clause:
        where_clauses.append(perm_clause.lstrip(" AND "))

    where_sql = " AND ".join(where_clauses)
    # PG 기본은 DESC→NULLS FIRST / ASC→NULLS LAST. metric 정렬 시 NULL row 가
    # TOP 으로 튀어오르는 회귀 방지 위해 항상 NULLS LAST 강제.
    null_pos = "NULLS LAST"
    order_sql = f"ORDER BY {sort_by} {sort_dir} {null_pos}" if sort_by else ""
    sql = f"SELECT * FROM {spec.name} WHERE {where_sql} {order_sql} LIMIT {top_n}"

    try:
        with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall() or []
    except Exception as exc:
        return _err("DB 조회 오류", exc)

    return {
        "ok": True,
        "rows": [dict(r) for r in rows],
        "summary": f"{spec.name} 상위 {len(rows)}건",
        "metric_value": None,
        "error": None,
    }


def _lookup_entity(
    domain: str,
    code: str,
    user_context: UserContext | None,
) -> dict[str, Any]:
    """domain 별 code 컬럼으로 단건 조회."""
    try:
        spec = _validate_domain(domain)
    except ValueError as exc:
        return _err(str(exc))

    if not spec.code_column:
        return _err(f"domain {spec.name!r} 에 대한 code 컬럼 매핑 없음")

    if user_context and not user_context.is_unrestricted() and not spec.is_public:
        codes = _opportunity_codes_from_context(user_context)
        if codes is not None:
            # project_opportunity 는 code == opportunity_code
            if spec.name == "project_opportunity":
                if code not in codes:
                    return {
                        "ok": False,
                        "rows": [],
                        "summary": "접근 권한 없음",
                        "metric_value": None,
                        "error": "접근 권한 없음",
                    }
            elif len(codes) == 0:
                return {
                    "ok": False,
                    "rows": [],
                    "summary": "접근 가능한 데이터 없음",
                    "metric_value": None,
                    "error": "접근 가능한 데이터 없음",
                }

    deleted_clause = "" if spec.is_public else " AND deleted = false"
    sql = f"SELECT * FROM {spec.name} WHERE {spec.code_column} = %s{deleted_clause} LIMIT 1"
    params: list[Any] = [code]

    try:
        with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall() or []
    except Exception as exc:
        return _err("DB 조회 오류", exc)

    if not rows:
        return {
            "ok": True,
            "rows": [],
            "summary": f"{spec.name} {code} 조회 결과 없음",
            "metric_value": None,
            "error": None,
        }

    return {
        "ok": True,
        "rows": [dict(rows[0])],
        "summary": f"{code} 단건 조회",
        "metric_value": None,
        "error": None,
    }


def _search_documents(
    query: str,
    source_types: list[str] | None,
    user_context: UserContext | None,
) -> dict[str, Any]:
    """기존 search_knowledge 서비스 위임."""
    try:
        from app.services.search_service import search_knowledge
        from app.embeddings.model import EmbeddingModel

        embedder = EmbeddingModel()
        result = search_knowledge(
            query=query,
            limit=10,
            source_types=source_types,
            attachment_session_id=None,
            start_at=None,
            end_at=None,
            embedder=embedder,
            user_context=user_context,
        )
        # SearchResponse → dict 변환
        rows: list[dict[str, Any]] = []
        for item in (result.results or []):
            try:
                rows.append(item.model_dump() if hasattr(item, "model_dump") else dict(item))
            except Exception:
                rows.append({"content": str(item)})

        return {
            "ok": True,
            "rows": rows,
            "summary": f"문서 검색 '{query}' — {len(rows)}건",
            "metric_value": None,
            "error": None,
        }
    except Exception as exc:
        return _err("문서 검색 오류", exc)


# ---------------------------------------------------------------------------
# Filter 적용 헬퍼
# ---------------------------------------------------------------------------

def _apply_filters(
    spec: DomainSpec,
    filters: dict[str, Any],
    where_clauses: list[str],
    params: list[Any],
) -> None:
    if not filters:
        return

    status_val = filters.get("status")
    if status_val is not None:
        where_clauses.append(f"{spec.status_column} = %s")
        params.append(status_val)

    time_from = filters.get("time_from")
    time_to = filters.get("time_to")
    if spec.date_column:
        if time_from is not None:
            where_clauses.append(f"{spec.date_column} >= %s")
            params.append(time_from)
        if time_to is not None:
            where_clauses.append(f"{spec.date_column} <= %s")
            params.append(time_to)

    # customer_name: 도메인에 customer_name 컬럼이 있으면 LIKE 검색
    customer_name = filters.get("customer_name")
    if customer_name is not None:
        where_clauses.append("customer_name ILIKE %s")
        params.append(f"%{customer_name}%")

    # opportunity_code: 직접 컬럼이 있으면 exact match
    opp_code = filters.get("opportunity_code")
    if opp_code is not None:
        where_clauses.append("opportunity_code = %s")
        params.append(opp_code)

    # 기타 임의 필터 (허용된 identifier 컬럼명에 한해)
    _KNOWN_FILTER_KEYS = {"status", "time_from", "time_to", "customer_name", "opportunity_code"}
    for key, val in filters.items():
        if key in _KNOWN_FILTER_KEYS:
            continue
        if not _is_safe_identifier(key):
            logger.warning("필터 키 무시 (안전하지 않은 식별자): %r", key)
            continue
        if val is None:
            continue
        where_clauses.append(f"{key} = %s")
        params.append(val)


def _is_safe_identifier(name: str) -> bool:
    """컬럼/테이블명으로 허용 가능한 identifier 인지 확인 (영문자, 숫자, 밑줄만 허용)."""
    import re
    return bool(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name))


# ---------------------------------------------------------------------------
# 공개 인터페이스
# ---------------------------------------------------------------------------

def execute_tool(
    name: str,
    args: dict,
    user_context: UserContext | None,
) -> dict:
    """Tool 실행 진입점.

    Returns:
        {
            'ok': bool,
            'rows': list[dict],
            'summary': str,
            'metric_value': Any | None,
            'error': str | None,
        }
    """
    try:
        if name == "aggregate_metric":
            return _aggregate_metric(
                domain=args.get("domain", ""),
                metric=args.get("metric"),
                op=args.get("op", "count"),
                filters=args.get("filters") or {},
                user_context=user_context,
            )
        elif name == "list_entities":
            return _list_entities(
                domain=args.get("domain", ""),
                sort_by=args.get("sort_by"),
                sort_dir=args.get("sort_dir", "desc"),
                top_n=args.get("top_n", 10),
                filters=args.get("filters") or {},
                user_context=user_context,
            )
        elif name == "lookup_entity":
            return _lookup_entity(
                domain=args.get("domain", ""),
                code=args.get("code", ""),
                user_context=user_context,
            )
        elif name == "search_documents":
            return _search_documents(
                query=args.get("query", ""),
                source_types=args.get("source_types"),
                user_context=user_context,
            )
        else:
            return _err(f"알 수 없는 tool name: {name!r}")
    except Exception as exc:
        return _err(f"예상치 못한 오류 (tool={name})", exc)
