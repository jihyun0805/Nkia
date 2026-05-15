#!/usr/bin/env bash
# Orbis 배포서버 오토시드 - SQL 없이 100% API 호출 기반.
#
# 흐름:
#   [1/6] .env.prod 로드
#   [2/6] (옵션) Postgres/Redis 볼륨 down -v → up (DB 깨끗하게)
#   [3/6] Backend 컨테이너 재시작 → Initializer 가 부서/유저4명/권한/모듈/워크플로우 시드
#   [4/6] Backend health 대기 (/api/v1/auth/login)
#   [5/6] AI 색인 테이블 초기화 (ai schema TRUNCATE) — public 데이터 아니므로 별도 처리
#   [6/6] python seed_local.py 실행 → 50건 사업기회 + 연관 데이터 시드
#   [7/7] AI 재색인 트리거 (reindex_orbis_data.py)
#
# 사용:
#   bash run_deploy.sh                  # 전체 자동화 (DB 초기화 포함)
#   bash run_deploy.sh --keep-data      # DB 보존, 시드만 추가 (idempotent)
#   bash run_deploy.sh --skip-reindex   # 재색인 스킵
#
# 환경변수 override:
#   REPO_ROOT (기본: /var/jenkins_home/workspace/S14P31S106)
#   ORBIS_BASE_URL (기본: http://localhost:${SERVER_PORT}/api/v1)

set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEFAULT_REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
REPO_ROOT="${REPO_ROOT:-$DEFAULT_REPO_ROOT}"

KEEP_DATA=0
SKIP_REINDEX=0
for arg in "$@"; do
    case "$arg" in
        --keep-data) KEEP_DATA=1 ;;
        --skip-reindex) SKIP_REINDEX=1 ;;
        --help|-h)
            sed -n '1,30p' "$0"
            exit 0
            ;;
        *) echo "Unknown option: $arg" >&2; exit 1 ;;
    esac
done

BACKEND_DIR="$REPO_ROOT/backend/Orbis"
AI_DIR="$REPO_ROOT/ai"
BACKEND_ENV_FILE="$BACKEND_DIR/.env.prod"
AI_ENV_FILE="$AI_DIR/.env.prod"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-Orbis-Postgres}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-Orbis-Server}"
AI_CONTAINER="${AI_CONTAINER:-Orbis-AI-API}"

# ──────────────────────────────────────────────

log() { echo "[$(date '+%H:%M:%S')] $*"; }
err() { echo "[$(date '+%H:%M:%S')] ERROR: $*" >&2; }

require_file() {
    [[ -f "$1" ]] || { err "Required file not found: $1"; exit 1; }
}

load_env_file() {
    set -a
    # shellcheck disable=SC1090
    . "$1"
    set +a
}

require_container() {
    if ! docker ps --format '{{.Names}}' | grep -Fxq "$1"; then
        err "Container is not running: $1"
        exit 1
    fi
}

wait_backend_ready() {
    local url="$1"
    local max_attempts=60
    log "Backend health-check: $url"
    for i in $(seq 1 $max_attempts); do
        if curl -sS -m 3 -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"${ORBIS_ADMIN_EMAIL:-admin@admin.com}\",\"password\":\"${ORBIS_ADMIN_PASSWORD:-admin}\"}" \
            2>/dev/null | grep -q '"accessToken"'; then
            log "Backend ready (attempt $i)"
            return 0
        fi
        sleep 5
    done
    err "Backend did not become ready in $((max_attempts * 5))s"
    return 1
}

# ──────────────────────────────────────────────
# [1/6] env 로드
# ──────────────────────────────────────────────
log "[1/6] Loading environment files"
require_file "$BACKEND_ENV_FILE"
require_file "$AI_ENV_FILE"
load_env_file "$BACKEND_ENV_FILE"
load_env_file "$AI_ENV_FILE"

export ORBIS_BASE_URL="${ORBIS_BASE_URL:-http://localhost:${SERVER_PORT:-8080}/api/v1}"
log "  REPO_ROOT      = $REPO_ROOT"
log "  ORBIS_BASE_URL = $ORBIS_BASE_URL"
log "  KEEP_DATA      = $KEEP_DATA"
log "  SKIP_REINDEX   = $SKIP_REINDEX"

# ──────────────────────────────────────────────
# [2/6] DB 초기화 (옵션)
# ──────────────────────────────────────────────
if [[ $KEEP_DATA -eq 0 ]]; then
    log "[2/6] Resetting Postgres + Redis volumes (this drops all data)"
    cd "$BACKEND_DIR"
    docker compose --env-file .env.prod \
        -f docker-compose.yml -f docker-compose.prod.yml \
        down -v
    docker compose --env-file .env.prod \
        -f docker-compose.yml -f docker-compose.prod.yml \
        up -d
    cd "$SCRIPT_DIR"
else
    log "[2/6] Skipping DB reset (--keep-data)"
fi

# ──────────────────────────────────────────────
# [3/6] Backend health (Initializer 실행 완료 대기)
# ──────────────────────────────────────────────
log "[3/6] Waiting for backend container to be healthy"
sleep 3
require_container "$POSTGRES_CONTAINER"
if [[ $KEEP_DATA -eq 1 ]]; then
    # 데이터를 보존하는 경우라도 Backend 재기동으로 Initializer 멱등 처리되게
    if docker ps --format '{{.Names}}' | grep -Fxq "$BACKEND_CONTAINER"; then
        log "  Restarting backend container: $BACKEND_CONTAINER"
        docker restart "$BACKEND_CONTAINER" >/dev/null
    fi
fi

wait_backend_ready "$ORBIS_BASE_URL/auth/login"

# ──────────────────────────────────────────────
# [4/6] AI 색인 테이블 초기화
# ──────────────────────────────────────────────
if [[ $KEEP_DATA -eq 0 ]]; then
    log "[4/6] Truncating AI index tables"
    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" \
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
        TRUNCATE TABLE ai.ai_knowledge_chunks, ai.ai_knowledge_sources, ai.ai_embedding_jobs
        RESTART IDENTITY CASCADE;
        " >/dev/null
else
    log "[4/6] Skipping AI index truncate (--keep-data)"
fi

# ──────────────────────────────────────────────
# [5/6] Python autoseed 실행
# ──────────────────────────────────────────────
log "[5/6] Running Python autoseed (API-based, no SQL)"
cd "$SCRIPT_DIR"
PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! "$PYTHON_BIN" -c "import requests" 2>/dev/null; then
    log "  installing 'requests' for $PYTHON_BIN"
    "$PYTHON_BIN" -m pip install --user --quiet requests
fi
"$PYTHON_BIN" seed_local.py

# ──────────────────────────────────────────────
# [6/6] AI 재색인
# ──────────────────────────────────────────────
if [[ $SKIP_REINDEX -eq 0 ]]; then
    log "[6/6] Triggering AI reindex"
    require_container "$AI_CONTAINER"
    REINDEX_SCRIPT="$AI_DIR/scripts/reindex_orbis_data.py"
    if [[ -f "$REINDEX_SCRIPT" ]]; then
        docker cp "$REINDEX_SCRIPT" "$AI_CONTAINER:/tmp/reindex_orbis_data.py"
        docker exec "$AI_CONTAINER" \
            python /tmp/reindex_orbis_data.py \
                --db-url "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@orbis_postgres:${POSTGRES_PORT:-5432}/${POSTGRES_DB}" \
                --ai-base-url "http://127.0.0.1:8000" \
                --ai-internal-token "${AI_INTERNAL_TOKEN}"
    else
        log "  Reindex script not found at $REINDEX_SCRIPT — skipping"
    fi
else
    log "[6/6] Skipping AI reindex (--skip-reindex)"
fi

log "=== Deploy autoseed completed ==="

# ──────────────────────────────────────────────
# 요약
# ──────────────────────────────────────────────
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
    SELECT 'users' AS table_name,                COUNT(*) FROM users
    UNION ALL SELECT 'department',               COUNT(*) FROM department
    UNION ALL SELECT 'company',                  COUNT(*) FROM company
    UNION ALL SELECT 'company_manager',          COUNT(*) FROM company_manager
    UNION ALL SELECT 'project_opportunity',      COUNT(*) FROM project_opportunity
    UNION ALL SELECT 'ai_knowledge_sources',     COUNT(*) FROM ai.ai_knowledge_sources
    UNION ALL SELECT 'ai_knowledge_chunks',      COUNT(*) FROM ai.ai_knowledge_chunks
    ORDER BY table_name;
    "
