# 인수인계: psycopg connection pool 관리 파일입니다. AI 스키마 조회, 검색, 색인 서비스가 모두 같은 pool을 사용합니다.
# 핵심 흐름: FastAPI lifespan에서 open_pool/close_pool을 호출하고, 서비스는 pool.connection()만 사용합니다.
# 같이 확인: DB URL/스키마 변경 시 config.py와 repository SQL의 schema prefix를 같이 확인하세요.
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import settings


pool = ConnectionPool(
    conninfo=settings.ai_database_url,
    min_size=settings.ai_database_pool_min_size,
    max_size=settings.ai_database_pool_max_size,
    kwargs={"row_factory": dict_row},
    open=False,
)


def open_pool() -> None:
    pool.open(wait=True)


def close_pool() -> None:
    pool.close()


def ping_database() -> bool:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 AS ok")
            row = cur.fetchone()
            return bool(row and row["ok"] == 1)
