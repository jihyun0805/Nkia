# 인수인계: FastAPI 앱 진입점입니다. lifespan에서 DB 풀, 색인 스키마 검증, 임베딩 모델, LangGraph, pg_notify 리스너를 한 번에 초기화합니다.
# 핵심 흐름: 요청 처리 중에는 app.state.embedder와 app.state.orbis_answer_graph를 재사용하므로 여기 초기화 순서가 챗봇 전체 기동 순서입니다.
# 같이 확인: 설정 변경 시 app/core/config.py, app/services/index_listener.py, app/orchestration/langgraph_runtime.py를 같이 확인하세요.
import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import ExitStack, asynccontextmanager
from urllib.parse import quote

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.postgres import PostgresSaver
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.router import api_router
from app.core.config import settings
from app.core.database import close_pool, open_pool, ping_database, pool
from app.embeddings.model import EmbeddingConfig, EmbeddingModel
from app.orchestration import create_orbis_agent_graph
from app.repositories.index_repository import validate_indexing_schema
from app.services.answer_service import build_answer_graph_callbacks
from app.services.index_listener import listen_and_index


logger = logging.getLogger(__name__)


def _build_langgraph_checkpoint_url() -> str:
    if settings.langgraph_checkpoint_url:
        return settings.langgraph_checkpoint_url

    if all([settings.postgres_host, settings.postgres_user, settings.postgres_password, settings.postgres_db]):
        search_path = quote(f"-csearch_path={settings.langgraph_checkpoint_schema},public")
        return (
            f"postgresql://{settings.postgres_user}:{settings.postgres_password}"
            f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
            f"?options={search_path}"
        )

    return settings.ai_database_url


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    exit_stack = ExitStack()
    # 앱 기동 시점에 AI 전용 DB 풀과 색인 스키마를 먼저 확인한다.
    # 여기서 실패하면 검색/챗봇 API가 반쪽 상태로 뜨지 않게 서버 기동을 중단한다.
    open_pool()
    with pool.connection() as conn:
        validate_indexing_schema(conn)
    # 임베딩 모델은 무거운 리소스라 요청마다 만들지 않고 app.state에 싱글턴으로 보관한다.
    app.state.embedder = EmbeddingModel(EmbeddingConfig.from_settings(settings))
    callbacks = build_answer_graph_callbacks()
    checkpointer = InMemorySaver()
    if settings.langgraph_use_official_runtime:
        checkpoint_url = _build_langgraph_checkpoint_url()
        try:
            checkpointer = exit_stack.enter_context(PostgresSaver.from_conn_string(checkpoint_url))
            checkpointer.setup()
            logger.info("LangGraph Postgres checkpointer initialized.")
        except Exception as exc:
            logger.exception("LangGraph Postgres checkpointer initialization failed, falling back to in-memory saver: %s", exc)
            checkpointer = InMemorySaver()
    app.state.orbis_answer_graph = create_orbis_agent_graph(
        embedder=app.state.embedder,
        callbacks=callbacks,
        checkpointer=checkpointer,
    )
    # PostgreSQL pg_notify 기반 실시간 색인 리스너다.
    # 알림은 영속 큐가 아니므로, 누락 가능성이 생기면 reindex 스크립트로 보정해야 한다.
    listener_task = asyncio.create_task(
        listen_and_index(embedder=app.state.embedder),
        name="ai_index_listener",
    )
    logger.info("AI index listener task started.")
    yield
    listener_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        pass
    exit_stack.close()
    close_pool()


openapi_tags = [
    {
        "name": "Health",
        "description": "AI API와 pgvector DB 상태 확인 API",
    },
    {
        "name": "Search",
        "description": "pgvector 기반 하이브리드 검색 API",
    },
    {
        "name": "Answer",
        "description": "검색 근거 기반 자연어 답변 생성 API",
    },
    {
        "name": "Indexing",
        "description": "백엔드 CRUD 이벤트 기반 문서 색인 API",
    },
    {
        "name": "OCR",
        "description": "OCR 기반 문서/명함 추출 API",
    },
]


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Orbis AI service API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=openapi_tags,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator(
    excluded_handlers=["/health", "/health/db", "/metrics"],
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.get("/health", tags=["Health"], summary="AI API liveness check")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db", tags=["Health"], summary="pgvector DB readiness check")
def health_db() -> dict[str, str]:
    ping_database()
    return {"status": "ok"}


app.include_router(api_router)
