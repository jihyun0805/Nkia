from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.database import close_pool, open_pool, ping_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    open_pool()
    yield
    close_pool()


openapi_tags = [
    {
        "name": "Health",
        "description": "AI API와 pgvector DB 상태 확인 API",
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
