#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEFAULT_REPO_ROOT="/home/yusin/testtesttt/S14P31S106"
REPO_ROOT="${1:-${REPO_ROOT:-$DEFAULT_REPO_ROOT}}"

PUBLIC_SEED_SQL="${PUBLIC_SEED_SQL:-$SCRIPT_DIR/orbis_db_testtesttt_entity_subset_20260504.sql}"
FULL_DUMP_SQL="${FULL_DUMP_SQL:-$SCRIPT_DIR/orbis_db_full_20260504_131616.sql}"
REINDEX_SCRIPT="${REINDEX_SCRIPT:-$(cd "$SCRIPT_DIR/.." && pwd)/ai/scripts/load_dump_and_reindex.py}"

BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-$REPO_ROOT/backend/Orbis/.env.prod}"
AI_ENV_FILE="${AI_ENV_FILE:-$REPO_ROOT/ai/.env.prod}"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-Orbis-Postgres}"
AI_CONTAINER="${AI_CONTAINER:-Orbis-AI-API}"
TEMP_DB="${TEMP_DB:-orbis_ai_seed_db}"
KEEP_TEMP_DB="${KEEP_TEMP_DB:-false}"

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Required file not found: $path" >&2
    exit 1
  fi
}

require_container() {
  local container="$1"
  if ! docker ps --format '{{.Names}}' | grep -Fxq "$container"; then
    echo "Container is not running: $container" >&2
    exit 1
  fi
}

load_env_file() {
  local path="$1"
  set -a
  # shellcheck disable=SC1090
  . "$path"
  set +a
}

psql_in_container() {
  local db_name="$1"
  shift
  docker exec -i \
    -e PGPASSWORD="$POSTGRES_PASSWORD" \
    "$POSTGRES_CONTAINER" \
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$db_name" "$@"
}

run_sql_file_in_container() {
  local db_name="$1"
  local sql_file="$2"
  psql_in_container "$db_name" -f - < "$sql_file"
}

drop_and_create_temp_db() {
  psql_in_container postgres -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '$TEMP_DB' AND pid <> pg_backend_pid();
  " >/dev/null
  psql_in_container postgres -c "DROP DATABASE IF EXISTS \"$TEMP_DB\";" >/dev/null
  psql_in_container postgres -c "CREATE DATABASE \"$TEMP_DB\";" >/dev/null
}

reset_public_tables() {
  psql_in_container "$POSTGRES_DB" -c "
    TRUNCATE TABLE
      customer_support_other_department_user,
      customer_support,
      maintenance_quotation,
      maintenance,
      collection,
      billing,
      project_result_report,
      project,
      license,
      contract,
      order_report_other,
      order_report_service,
      order_report_purchase,
      order_report_maintenance_amount,
      order_report_maintenance,
      order_report,
      bid_result_competitor_score,
      bid_result,
      prb_result_attendee_opinion,
      prb_result,
      prb_general_overhead_expense,
      prb_purchase_product,
      prb_purchase_human_resource,
      prb_personnel_expense,
      prb,
      rfp_analyze_result,
      quotation_labor_item,
      quotation_solution_item,
      quotation,
      sales_activity_request,
      sales_activity_attendee,
      sales_activity,
      project_opportunity_product_module,
      project_opportunity_partner_company,
      proposal,
      project_opportunity,
      upload_file,
      company_manager,
      company,
      permission,
      alarm,
      workflow,
      users,
      department
    RESTART IDENTITY CASCADE;
  " >/dev/null
}

reset_main_ai_tables() {
  psql_in_container "$POSTGRES_DB" -c "
    TRUNCATE TABLE ai.ai_knowledge_chunks, ai.ai_knowledge_sources, ai.ai_embedding_jobs
    RESTART IDENTITY CASCADE;
  " >/dev/null
}

bootstrap_temp_ai_schema() {
  POSTGRES_HOST="127.0.0.1" \
  POSTGRES_PORT="${POSTGRES_PORT}" \
  POSTGRES_USER="${POSTGRES_USER}" \
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  POSTGRES_DB="${TEMP_DB}" \
  AI_DB_USER="${AI_DB_USER}" \
  AI_DB_PASSWORD="${AI_DB_PASSWORD}" \
  sh "$REPO_ROOT/ai/db/migrate_existing_db.sh"
}

run_reindex() {
  docker cp "$REINDEX_SCRIPT" "$AI_CONTAINER:/tmp/load_dump_and_reindex.py"
  docker exec \
    "$AI_CONTAINER" \
    python /tmp/load_dump_and_reindex.py \
      --db-url "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@orbis_postgres:${POSTGRES_PORT}/${TEMP_DB}" \
      --ai-base-url "http://127.0.0.1:8000" \
      --ai-internal-token "${AI_INTERNAL_TOKEN}" \
      --skip-dump-reset
}

print_summary() {
  echo
  echo "[public table counts]"
  psql_in_container "$POSTGRES_DB" -c "
    SELECT 'project_opportunity' AS table_name, COUNT(*) FROM project_opportunity
    UNION ALL SELECT 'sales_activity', COUNT(*) FROM sales_activity
    UNION ALL SELECT 'quotation', COUNT(*) FROM quotation
    UNION ALL SELECT 'rfp_analyze_result', COUNT(*) FROM rfp_analyze_result
    UNION ALL SELECT 'prb', COUNT(*) FROM prb
    UNION ALL SELECT 'prb_result', COUNT(*) FROM prb_result
    UNION ALL SELECT 'bid_result', COUNT(*) FROM bid_result
    UNION ALL SELECT 'order_report', COUNT(*) FROM order_report
    UNION ALL SELECT 'project', COUNT(*) FROM project
    UNION ALL SELECT 'maintenance', COUNT(*) FROM maintenance;
  "
  echo
  echo "[ai index counts]"
  psql_in_container "$POSTGRES_DB" -c "
    SELECT COUNT(*) AS sources FROM ai.ai_knowledge_sources;
    SELECT COUNT(*) AS chunks FROM ai.ai_knowledge_chunks;
  "
}

cleanup() {
  if [[ "$KEEP_TEMP_DB" == "true" ]]; then
    return
  fi
  psql_in_container postgres -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '$TEMP_DB' AND pid <> pg_backend_pid();
  " >/dev/null || true
  psql_in_container postgres -c "DROP DATABASE IF EXISTS \"$TEMP_DB\";" >/dev/null || true
}

main() {
  require_file "$PUBLIC_SEED_SQL"
  require_file "$FULL_DUMP_SQL"
  require_file "$REINDEX_SCRIPT"
  require_file "$BACKEND_ENV_FILE"
  require_file "$AI_ENV_FILE"
  require_file "$REPO_ROOT/ai/db/migrate_existing_db.sh"

  load_env_file "$BACKEND_ENV_FILE"
  load_env_file "$AI_ENV_FILE"

  require_container "$POSTGRES_CONTAINER"
  require_container "$AI_CONTAINER"

  trap cleanup EXIT

  echo "[1/7] reset public tables in ${POSTGRES_DB}"
  reset_public_tables

  echo "[2/7] load public seed dump"
  run_sql_file_in_container "$POSTGRES_DB" "$PUBLIC_SEED_SQL"

  echo "[3/7] recreate temp dump database: ${TEMP_DB}"
  drop_and_create_temp_db

  echo "[4/7] load full dump into temp database"
  run_sql_file_in_container "$TEMP_DB" "$FULL_DUMP_SQL"

  echo "[5/7] bootstrap ai schema in temp database"
  bootstrap_temp_ai_schema

  echo "[6/7] reset main ai schema tables"
  reset_main_ai_tables

  echo "[7/7] rebuild ai index from temp database"
  run_reindex

  print_summary
}

main "$@"
