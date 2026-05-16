#!/bin/sh
set -eu

wait_for_postgres() {
python - <<'PY'
import os
import sys
import time
from urllib.parse import quote_plus

import psycopg

host = os.environ["POSTGRES_HOST"]
port = os.environ.get("POSTGRES_PORT", "5432")
user = os.environ["POSTGRES_USER"]
password = os.environ["POSTGRES_PASSWORD"]
database = os.environ["POSTGRES_DB"]
timeout = int(os.environ.get("AI_DB_WAIT_TIMEOUT", "180"))

dsn = (
    f"postgresql://{quote_plus(user)}:{quote_plus(password)}"
    f"@{host}:{port}/{database}"
)
deadline = time.time() + timeout
last_error = None

while time.time() < deadline:
    try:
        with psycopg.connect(dsn, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        print("PostgreSQL is ready.", flush=True)
        sys.exit(0)
    except Exception as exc:
        last_error = exc
        print(f"Waiting for PostgreSQL: {exc}", flush=True)
        time.sleep(2)

print(f"PostgreSQL wait timeout: {last_error}", file=sys.stderr, flush=True)
sys.exit(1)
PY
}

run_migration() {
    echo "Running AI DB migration..." >&2
    sh ./db/migrate_existing_db.sh
}

apply_notify_trigger() {
    # pg_notify trigger 자동 등록 (idempotent).
    # backend(Spring Boot) ddl-auto 가 public 테이블을 생성한 후에만 trigger 등록 성공.
    # 백엔드 시작 타이밍이 늦을 수 있으므로 최대 60초까지 5초 간격 retry.
    # 002 SQL 은 IF EXISTS 보호 — 테이블 없으면 RAISE NOTICE 만 (idempotent).
    echo "Applying ai_index_notify trigger (idempotent)..." >&2
    attempt=0
    max_attempts=12
    while [ "${attempt}" -lt "${max_attempts}" ]; do
        attempt=$((attempt + 1))
        # 가장 흔한 public 테이블 (project_opportunity) 존재 확인
        if PGPASSWORD="${POSTGRES_PASSWORD}" psql \
            --host "${POSTGRES_HOST}" --port "${POSTGRES_PORT:-5432}" \
            --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" \
            -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_opportunity'" 2>/dev/null \
            | grep -q 1; then
            echo "  public schema ready (attempt ${attempt}), applying trigger SQL..." >&2
            if sh ./db/apply_ai_index_notify_trigger.sh >&2; then
                echo "  ai_index_notify trigger applied successfully." >&2
            else
                echo "  Trigger apply failed (non-fatal); manual check recommended." >&2
            fi
            return 0
        fi
        echo "  public schema not ready yet (attempt ${attempt}/${max_attempts}); sleep 5s." >&2
        sleep 5
    done
    echo "  Backend ddl never completed within timeout; trigger NOT applied (will retry on next AI restart)." >&2
    return 0  # non-fatal — AI 본체는 정상 시작
}

start_api() {
    workers="${AI_UVICORN_WORKERS:-1}"
    echo "Starting AI API with ${workers} worker(s)..." >&2
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${workers}"
}

wait_for_postgres
run_migration
apply_notify_trigger
start_api
