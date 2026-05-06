#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SQL_FILE="${SCRIPT_DIR}/migrations/002_ai_index_notify_trigger.sql"

if [ ! -f "${SQL_FILE}" ]; then
  echo "Trigger SQL file not found: ${SQL_FILE}" >&2
  exit 1
fi

export PGPASSWORD="${POSTGRES_PASSWORD}"

run_psql() {
  "$@" \
    --host "${POSTGRES_HOST}" \
    --port "${POSTGRES_PORT}" \
    --username "${POSTGRES_USER}" \
    --dbname "${POSTGRES_DB}" \
    -v ON_ERROR_STOP=1 \
    -f "${SQL_FILE}"
}

if command -v psql >/dev/null 2>&1; then
  run_psql psql
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "psql or docker is required to apply AI index notify trigger." >&2
  exit 127
fi

docker run --rm \
  --network host \
  -e PGPASSWORD="${POSTGRES_PASSWORD}" \
  -v "${SQL_FILE}:/trigger.sql:ro" \
  pgvector/pgvector:pg15 \
  psql \
    --host "${POSTGRES_HOST}" \
    --port "${POSTGRES_PORT}" \
    --username "${POSTGRES_USER}" \
    --dbname "${POSTGRES_DB}" \
    -v ON_ERROR_STOP=1 \
    -f /trigger.sql
