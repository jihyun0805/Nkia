#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
AI_DB_USER="${AI_DB_USER:-orbis_ai}"
AI_DB_PASSWORD="${AI_DB_PASSWORD:-orbis_ai}"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SQL_FILE="${SCRIPT_DIR}/migrations/001_bootstrap_ai_schema.sql"
TMP_SQL_FILE="$(mktemp)"

cleanup() {
  rm -f "${TMP_SQL_FILE}"
}
trap cleanup EXIT

export PGPASSWORD="${POSTGRES_PASSWORD}"

escape_sed() {
  printf '%s' "$1" | sed 's/[\\/&]/\\\\&/g'
}

sed \
  -e "s/__AI_DB_USER__/$(escape_sed "${AI_DB_USER}")/g" \
  -e "s/__AI_DB_PASSWORD__/$(escape_sed "${AI_DB_PASSWORD}")/g" \
  "${SQL_FILE}" > "${TMP_SQL_FILE}"

run_psql() {
  "$@" \
    --host "${POSTGRES_HOST}" \
    --port "${POSTGRES_PORT}" \
    --username "${POSTGRES_USER}" \
    --dbname "${POSTGRES_DB}" \
    -f "${TMP_SQL_FILE}"
}

if command -v psql >/dev/null 2>&1; then
  run_psql psql
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "psql or docker is required to run AI DB migration." >&2
  exit 127
fi

docker run --rm \
  --network host \
  -e PGPASSWORD="${POSTGRES_PASSWORD}" \
  -v "${TMP_SQL_FILE}:/migration.sql:ro" \
  pgvector/pgvector:pg15 \
  psql \
    --host "${POSTGRES_HOST}" \
    --port "${POSTGRES_PORT}" \
    --username "${POSTGRES_USER}" \
    --dbname "${POSTGRES_DB}" \
    -f /migration.sql
