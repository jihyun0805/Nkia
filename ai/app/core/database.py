# 인수인계 메모: AI 챗봇 공통 코드입니다. 다른 계층에서 재사용하는 설정, 보안, 어댑터, 도구 함수를 담습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
