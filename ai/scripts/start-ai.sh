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

start_api() {
    workers="${AI_UVICORN_WORKERS:-1}"
    echo "Starting AI API with ${workers} worker(s)..." >&2
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${workers}"
}

wait_for_postgres
run_migration
start_api
