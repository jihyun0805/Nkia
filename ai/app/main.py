import logging
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
async def lifespan(app: FastAPI):
    exit_stack = ExitStack()
    open_pool()
    with pool.connection() as conn:
        validate_indexing_schema(conn)
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
    yield
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
