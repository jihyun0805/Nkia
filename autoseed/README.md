# Orbis 오토시드 (Auto-Seed)

백엔드 API를 인증된 호출로 호출하여 실데이터를 적재하는 시드 스크립트.

> **중요**: 이 오토시드는 **DB 에 직접 SQL 을 쏘지 않는다.** 모든 데이터는
> 백엔드 REST API (`/api/v1/...`) 를 인증 토큰으로 호출하여 생성된다.
> `psycopg`, `psql`, raw INSERT/UPDATE/COPY 같은 게 의존성에 없는지 확인할 것.

## 동작 원리

1. 백엔드가 `application.yaml`의 Initializer로 생성하는 데이터(부서 15개, 권한/롤,
   워크플로우 템플릿, ProductModule, 기본 유저 4명)는 건드리지 않는다.
2. 그 위에 **JWT 로그인 → API POST** 흐름으로 사업기회 50여건과 라이프사이클 데이터를 채운다.
3. `created_by` / `updated_by` 는 백엔드의 `@CreatedBy` / `@LastModifiedBy` 가 토큰의 유저로
   자동 채워주므로, **시드 단계마다 적절한 역할의 유저로 로그인**한다.

## 데이터 라이프사이클 (검토의견 04_계약 / 06_유지보수 기반)

`target_stage` 라벨로 각 사업기회의 목표 단계를 표시 (Phase 2~ 에서 단계 전이):

| 라벨 | 의미 |
|---|---|
| FINDING | 발굴 단계 (활동 없음) |
| ACTIVITY | 영업활동 진행 중 (RFP 수령 전후) |
| BID_PROPOSING | 제안서 제출 후 결과 대기 |
| **BID_LOST** | **실주** — BidResult.outcome=LOSS, **이후 단계(수주/계약/사업/유지보수) 모두 없음** |
| CONTRACT | 수주보고 + 계약 체결 완료, 사업 착수 전 |
| PROJECT | 사업 수행 중 (납품/검수) |
| MAINTENANCE_FREE | 검수 완료 후 무상유지보수 진행 중 (대개 1년) |
| MAINTENANCE_PAID | 무상 종료 → 별도 수주보고 + 유상유지보수 1년차 |
| **MAINTENANCE_LONG** | **유상유지보수 장기 진행 중 (3~7년차, 연 단위 재계약)** |
| MAINTENANCE_JP | 일본 사업 특수 — 무상 없이 유상유지보수 직행 |

### 계약 흐름 패턴 (Phase 2~ 에서 분기 처리)

1. **수주보고 → 계약 → 무상유지보수 → 수주보고(유상) → 유상유지보수** (대다수)
2. **수주보고 + 매입계약 → 계약 → 무상 → ...** (`has_purchase_contract=True`)
3. **수주보고만, 계약서 없음** (소액 사업)
4. **수주보고 → 유상유지보수 직행** (일본 사업)

## 사전 조건

- Postgres + Backend(`/api/v1`) 가 떠 있어야 한다.
- 기본 유저 (백엔드 UserInitializer 가 만든 4명) 가 로그인 가능해야 한다.
  - admin@admin.com / admin
  - director@orbis.com / 1234
  - leader@orbis.com / 1234
  - member@orbis.com / 1234

## 사용

### 로컬 (Spring Boot 가 호스트에서 IntelliJ 등으로 떠 있는 환경)

```bash
cd autoseed
# requests 만 필요 (시스템에 있으면 그대로)
python3 seed_local.py

# 다른 백엔드 주소를 쓰는 경우
ORBIS_BASE_URL="http://localhost:8080/api/v1" python3 seed_local.py

# admin 계정을 바꿔둔 경우
ORBIS_ADMIN_EMAIL="admin@example.com" \
ORBIS_ADMIN_PASSWORD="secret" \
  python3 seed_local.py
```

### 배포서버 (모두 도커 컨테이너로 떠 있는 환경)

`run_deploy.sh` 가 전체 흐름 자동화:
- `.env.prod` 로드 → Postgres/Backend 볼륨 down -v + up → Initializer 실행 대기 →
  AI 색인 테이블 초기화 → `seed_local.py` 실행 → `reindex_orbis_data.py` 실행

```bash
# Jenkins 등에서 워크스페이스 루트가 자동 감지됨
cd autoseed
bash run_deploy.sh                  # 전체 자동화 (DB 초기화 포함, 권장)
bash run_deploy.sh --keep-data      # DB 보존, 시드만 idempotent 추가
bash run_deploy.sh --skip-reindex   # AI 재색인 스킵
```

내부적으로 사용하는 환경 변수 (자동 override 가능):
- `REPO_ROOT` (기본: 스크립트의 ../)
- `ORBIS_BASE_URL` (기본: `http://localhost:${SERVER_PORT}/api/v1`)
- `POSTGRES_CONTAINER` / `BACKEND_CONTAINER` / `AI_CONTAINER`
- `PYTHON_BIN` (기본: python3)

### 멱등성

`seed_local.py` 는 재실행 시:
- 이미 존재하는 유저/회사/담당자/사업기회를 자동 스킵
- 안전하게 여러 번 돌릴 수 있음

## Phase 1 (현재)

- 추가 유저 ~20명 생성 (영업1팀/영업2팀/사업수행팀/IoT사업팀 등에 분산)
- 고객사/협력사 + 고객사 담당자 풀 생성
- 사업기회 50건 (상태 균등 분포: 발굴/RFP/제안/실주/수주/완료)

## Phase 2~6 (향후)

- 활동, RFP 분석, 견적, PRB, 입찰 결과, 수주, 계약, 프로젝트, 유지보수, 청구
