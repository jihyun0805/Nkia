#!/usr/bin/env bash
# testtesttt 로컬 DB 덤프 기반 배포서버 시드 + AI 재색인 스크립트
# 사용법: bash run_local_seed_and_reindex.sh [REPO_ROOT]
#
# 필요 환경:
#   - Orbis-Postgres 컨테이너 실행 중
#   - Orbis-AI-API  컨테이너 실행 중
#   - REPO_ROOT 아래 backend/Orbis/.env.prod, ai/.env.prod 존재
#
# 단순화 포인트 (기존 스크립트 대비):
#   - 풀 덤프(67MB) 필요 없음
#   - 임시 DB 생성/삭제 없음
#   - 시드 덤프를 메인 DB에 직접 로드 후 메인 DB 대상 재색인
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEFAULT_REPO_ROOT="/var/jenkins_home/workspace/S14P31S106"
REPO_ROOT="${1:-${REPO_ROOT:-$DEFAULT_REPO_ROOT}}"

SEED_SQL="${SEED_SQL:-$SCRIPT_DIR/orbis_local_testtesttt_20260505_seed_v2.sql}"
REINDEX_SCRIPT="${REINDEX_SCRIPT:-$REPO_ROOT/ai/scripts/reindex_orbis_data.py}"

BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-$REPO_ROOT/backend/Orbis/.env.prod}"
AI_ENV_FILE="${AI_ENV_FILE:-$REPO_ROOT/ai/.env.prod}"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-Orbis-Postgres}"
AI_CONTAINER="${AI_CONTAINER:-Orbis-AI-API}"

# ──────────────────────────────────────────────

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Required file not found: $1" >&2
    exit 1
  fi
}

require_container() {
  if ! docker ps --format '{{.Names}}' | grep -Fxq "$1"; then
    echo "Container is not running: $1" >&2
    exit 1
  fi
}

load_env_file() {
  set -a
  . "$1"
  set +a
}

psql_exec() {
  local db_name="$1"; shift
  docker exec -i \
    -e PGPASSWORD="$POSTGRES_PASSWORD" \
    "$POSTGRES_CONTAINER" \
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$db_name" "$@"
}

run_sql_file() {
  local db_name="$1"
  local sql_file="$2"
  psql_exec "$db_name" -f - < "$sql_file"
}

reset_public_tables() {
  # maintenance_service_info, maintenance_amount_reason 은 seed SQL 에서 CREATE IF NOT EXISTS 로 생성됨
  # 재실행 시 CASCADE 로 자동 TRUNCATE 되므로 별도 나열 불필요
  psql_exec "$POSTGRES_DB" -c "
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
  # product_module 은 seed SQL 내 TRUNCATE 로 처리되므로 스크립트에서 별도 제거 필요 없음
}

reset_ai_tables() {
  psql_exec "$POSTGRES_DB" -c "
    TRUNCATE TABLE ai.ai_knowledge_chunks, ai.ai_knowledge_sources, ai.ai_embedding_jobs
    RESTART IDENTITY CASCADE;
  " >/dev/null
}

run_reindex() {
  docker cp "$REINDEX_SCRIPT" "$AI_CONTAINER:/tmp/reindex_orbis_data.py"
  docker exec "$AI_CONTAINER" \
    python /tmp/reindex_orbis_data.py \
      --db-url "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@orbis_postgres:${POSTGRES_PORT:-5432}/${POSTGRES_DB}" \
      --ai-base-url "http://127.0.0.1:8000" \
      --ai-internal-token "${AI_INTERNAL_TOKEN}"
}

print_summary() {
  echo
  echo "=== public table counts ==="
  psql_exec "$POSTGRES_DB" -c "
    SELECT 'project_opportunity'   AS table_name, COUNT(*) FROM project_opportunity
    UNION ALL SELECT 'sales_activity',            COUNT(*) FROM sales_activity
    UNION ALL SELECT 'quotation',                 COUNT(*) FROM quotation
    UNION ALL SELECT 'quotation_solution_item',   COUNT(*) FROM quotation_solution_item
    UNION ALL SELECT 'rfp_analyze_result',        COUNT(*) FROM rfp_analyze_result
    UNION ALL SELECT 'prb',                       COUNT(*) FROM prb
    UNION ALL SELECT 'prb_result',                COUNT(*) FROM prb_result
    UNION ALL SELECT 'bid_result',                COUNT(*) FROM bid_result
    UNION ALL SELECT 'order_report',              COUNT(*) FROM order_report
    UNION ALL SELECT 'project',                   COUNT(*) FROM project
    UNION ALL SELECT 'maintenance',               COUNT(*) FROM maintenance
    UNION ALL SELECT 'maintenance_quotation',     COUNT(*) FROM maintenance_quotation
    UNION ALL SELECT 'product_module',            COUNT(*) FROM product_module
    UNION ALL SELECT 'project_result_report',     COUNT(*) FROM project_result_report;
  "
  echo
  echo "=== ai index counts ==="
  psql_exec "$POSTGRES_DB" -c "
    SELECT COUNT(*) AS sources FROM ai.ai_knowledge_sources;
    SELECT COUNT(*) AS chunks  FROM ai.ai_knowledge_chunks;
  "
}

# ──────────────────────────────────────────────

main() {
  require_file "$SEED_SQL"
  require_file "$REINDEX_SCRIPT"
  require_file "$BACKEND_ENV_FILE"
  require_file "$AI_ENV_FILE"

  load_env_file "$BACKEND_ENV_FILE"
  load_env_file "$AI_ENV_FILE"

  require_container "$POSTGRES_CONTAINER"
  require_container "$AI_CONTAINER"

  echo "[1/5] public 테이블 초기화 (TRUNCATE)"
  reset_public_tables

  echo "[2/5] 로컬 덤프 로드 → ${POSTGRES_DB}"
  run_sql_file "$POSTGRES_DB" "$SEED_SQL"

  echo "[3/5] AI 색인 테이블 초기화"
  reset_ai_tables

  echo "[4/5] AI 재색인 실행 (임베딩 생성)"
  run_reindex

  echo "[5/5] 완료"
  print_summary
}

main "$@"
