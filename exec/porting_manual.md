# 포팅 매뉴얼

## 1. 문서 개요

- 문서명: Orbis Porting Manual
- 버전: v1.0
- 작성일: 2026-05-14
- 작성자: 김소은, 박유신, 여희림, 이수인, 정서영, 최준, 최지현
- 작성 목적: Orbis를 새로운 환경에 설치하고 실행하기 위한 포팅 절차 설명

---

## 2. 서비스 개요

- 서비스 이름: Orbis
- 주요 기능: 본 서비스는 B2B 소프트웨어 기업 Nkia의 영업 프로세스를 통합 관리하기 위한 영업관리 시스템으로, 영업 기회 발굴부터 계약, 사업 수행, 유지보수까지 전체 영업 라이프사이클을 하나의 플랫폼에서 관리할 수 있도록 설계되었다. 서비스는 다음과 같은 핵심 기능으로 구성된다.

<!-- 검색기능??? -->

    - 영업관리 기능
        1. 발굴: 신규 영업 기회와 고객 정보 등록 및 관리
        2. 활동: 영업 활동과 견적 관련 업무 기록 및 관리
        3. 입찰: 입찰 및 제안 관련 업무 관리
        4. 계약: 수주와 수주 이후 계약 및 라이선스 관리
        5. 사업: 수행된 사업과 청구 및 수금 업무 관리
        6. 유지보수: 유지보수 계약과 고객지원 활동 관리

    - 관리자 기능
        1. 계정: 사용자 계정 관리
        2. 권한: 역할 기반 권한 관리(RBAC)
        3. 결재 엔진: 결재 프로세스 관리

    - 공통 기능
        1. 문서 업로드/다운로드: 시스템내에서 업로드될 문서 관리
        2. 알림: 시스템 내 주요 이벤트와 업무 요청 사항을 사용자에게 실시간으로 전달

    - AI 기능
        1. 챗봇
        2. OCR
        3. rfp 요약 분석 사업기회에서!
        4. 유사 견적서 추천
        5. 수/실주 원인 분석 보조(X)
        6. 경영리포트()

- 서비스 도메인: https://k14s106.p.ssafy.io/

---

## 3. 시스템 구성 개요

1. Gateway Layer
    - Nginx (HTTPS 종단 및 라우팅)
    - Certbot (TLS 인증서 관리)
2. Application Layer
    - Frontend 컨테이너
    - Backend 컨테이너
    - AI 컨테이너
3. Data & Storage Layer
    - PostgreSQL
    - Redis
    - MinIO
4. Monitoring Layer
    - Prometheus
    - Loki
    - Promtail
    - Grafana
5. Automation Layer
    - Jenkins CI/CD

---

## 4 개발 환경

### 4.1 EC2 서버 환경

- OS: Ubuntu 24.04 LTS
- CPU:  Intel(R) Xeon(R) CPU E5-2686 v4 @ 2.30GHz(4 Core)
- RAM: 15GB
- Disk: 309GB
- 필수 패키지
    - Docker
    - Docker Compose
    - Git
    - Jenkins

### 4.2 프론트엔드

- Language: TypeScript
- Framework: Next.js 16
- Web Server: Nginx
- Styling: Tailwind CSS

### 4.3 백엔드

- Language: Java 21
- Framework: Spring Boot
- Build Tool: Gradle
- 인증 방식: JWT

### 4.4 DB

- PostgreSQL 15 + pgvector
- Docker Compose를 통해 PostgreSQL 컨테이너로 실행
- PostgreSQL 컨테이너는 Docker 네트워크 내에서 Backend와 통신
- 데이터는 Docker Volume(postgres_data)을 통해 영구 저장
- AI 검색 기능을 위한 pgvector 확장 사용
- PostgreSQL 컨테이너는 Docker 네트워크 내부에서 Backend 컨테이너와 통신
- 외부 접근이 필요한 경우에만 포트를 개방하며, 보안 그룹을 통해 접근 제한
- 서버 접근은 SSH(pem 키)를 통해 수행하며, DB 관리 작업은 서버 내부에서 진행
- DB 계정 및 스키마 사전 생성
- Jenkins-credential 환경변수에 DB 접속 정보 세팅

### 4.5 AI

- Language: Python 3.10
- Framework: FastAPI

---

## 5. 네트워크 및 포트 설정

| 서비스         | 포트   |
| ------------- | ----- |
| HTTP          | 80    |
| HTTPS         | 443   |
| Backend       | 8080  |
| Frontend      | 80    |
| PostgreSQL    | 5432  |
| Redis         | 6379  |
| Prometheus    | 8090  |
| Loki          | 8100  |
| Grafana       | 8030  |
| MinIO API     | 8000  |
| MinIO Console | 8001  |
| Jenkins UI    | 8081  |
| Jenkins Agent | 50000 |
| AI Server     | 8002  |


- HTTP(80) 요청은 HTTPS(443)로 리다이렉트된다.
- 내부 서비스 간 통신은 Docker 네트워크를 통해 이루어진다.
- PostgreSQL Docker 컨테이너로 실행되며, Docker 네트워크 내부에서 접근된다.

---

## 6. Gateway 라우팅

Nginx를 이용하여 HTTPS 기반 Reverse Proxy 구성

- HTTP → HTTPS Redirect

- /api/v1/ → Backend 컨테이너
- /grafana/ → Grafana 대시보드
- /minio/ → MinIO API
- /minio-admin/ → MinIO Console
- 그 외 경로 → Frontend 컨테이너
- Nginx는 SSL 인증서를 적용하여 HTTPS 통신을 제공
- Certbot을 통해 인증서 자동 발급 및 갱신

---

## 7. 준비사항

- AWS EC2 서버
    - Ubuntu 24.04 LTS
    - Docker / Docker Compose 설치
    - Git 설치
    - Jenkins 설치
    - 프로젝트 소스코드 배포
- 환경 설정
    - .env.prod 환경변수 파일 준비
    - SSL 인증서 저장 디렉토리 준비
        - ./certbot/conf
        - ./certbot/www
- 네트워크 설정
    - 포트 사용 가능 여부 확인
        - 80, 443, 8080, 3306, 6379, 9090, 3100, 3000, 9000, 9001
- 데이터베이스 준비
    - Docker Compose를 통해 PostgreSQL 컨테이너 실행
    - orbis_db 데이터베이스 생성
    - 사용자 계정 및 권한 설정
- Docker 실행 환경
    - Docker daemon 정상 동작 확인
    - docker-compose 명령어 사용 가능 여부 확인

---

## 8. 환경 변수

- 비밀 키는 “`SECRET-KEY`”로 명시

### 8.1  EC2 환경변수 (Jenkins-credential)

- 경로: /S14P31S106/backend/Orbis/

```
# PostgreSQL 설정
POSTGRES_USER=`SECRET-KEY`
POSTGRES_PASSWORD=`SECRET-KEY`
POSTGRES_DB=`SECRET-KEY`
POSTGRES_PORT=`SECRET-KEY`
POSTGRES_URL=`SECRET-KEY`

# Redis 설정
REDIS_HOST=`SECRET-KEY`
REDIS_PASSWORD=`SECRET-KEY`
REDIS_PORT=`SECRET-KEY`

# Spring 서버 설정
SERVER_PORT=`SECRET-KEY`

# 모니터링 설정
PROMETHEUS_PORT=`SECRET-KEY`
LOKI_PORT=`SECRET-KEY`
GRAFANA_PORT=`SECRET-KEY`
GRAFANA_USER=`SECRET-KEY`
GRAFANA_PASSWORD=`SECRET-KEY`
GRAFANA_DOMAIN=`SECRET-KEY`
GRAFANA_ALLOWED_ORIGINS=`SECRET-KEY`

# Minio 설정
MINIO_API_PORT=`SECRET-KEY`
MINIO_CONSOLE_PORT=`SECRET-KEY`
MINIO_ENDPOINT=`SECRET-KEY`
MINIO_ACCESS_KEY=`SECRET-KEY`
MINIO_SECRET_KEY=`SECRET-KEY`
MINIO_BUCKET=`SECRET-KEY`
APP_STORAGE_URL=`SECRET-KEY`
MINIO_BROWSER_REDIRECT_URL=`SECRET-KEY`

# JWT 설정
JWT_SECRET=`SECRET-KEY`
# Access Token: 30분 (1800000 ms)
JWT_ACCESS_EXPIRATION=`SECRET-KEY`
# Refresh Token: 7일 (604800000 ms)
JWT_REFRESH_EXPIRATION=`SECRET-KEY`

# AI 서버 설정
AI_SERVER_PORT=`SECRET-KEY`
AI_API_BASE_URL=`SECRET-KEY`
AI_INTERNAL_TOKEN=`SECRET-KEY`
AI_CONNECT_TIMEOUT_MS=`SECRET-KEY`
AI_REQUEST_TIMEOUT_MS=`SECRET-KEY`
AI_DB_USER=`SECRET-KEY`
AI_DB_PASSWORD=`SECRET-KEY`
AI_DATABASE_URL=`SECRET-KEY`
GMS_KEY=`SECRET-KEY`
```

### 8.2  AI 환경변수

- 경로: /S14P31S106/ai/

```
# AI 서버 포트 설정
AI_SERVER_PORT=`SECRET-KEY`

# 메인 PostgreSQL 접근 설정
POSTGRES_HOST=`SECRET-KEY`
POSTGRES_PORT=`SECRET-KEY`
POSTGRES_USER=`SECRET-KEY`
POSTGRES_PASSWORD=`SECRET-KEY`
POSTGRES_DB=`SECRET-KEY`

# AI DB Role 설정 (same PostgreSQL instance, ai schema only)
AI_DB_USER=`SECRET-KEY`
AI_DB_PASSWORD=`SECRET-KEY`

# PostgreSQL ready 대기 시간 (초)
AI_DB_WAIT_TIMEOUT=`SECRET-KEY`

# AI DB 연결 설정
AI_DATABASE_URL=`SECRET-KEY`
AI_DATABASE_POOL_MIN_SIZE=`SECRET-KEY`
AI_DATABASE_POOL_MAX_SIZE=`SECRET-KEY`

# Backend -> AI 내부 통신 토큰
AI_INTERNAL_TOKEN=`SECRET-KEY`

# 임베딩 모델 설정
AI_EMBEDDING_MODEL=`SECRET-KEY`
AI_EMBEDDING_DIMENSION=`SECRET-KEY`
AI_EMBEDDING_DEVICE=`SECRET-KEY`
AI_EMBEDDING_BATCH_SIZE=`SECRET-KEY`
AI_EMBEDDING_MAX_LENGTH=`SECRET-KEY`
AI_ENABLE_DRAFT_ACTIONS=`SECRET-KEY`

# FastAPI 실행 설정
AI_UVICORN_WORKERS=`SECRET-KEY`

# 외부 연동 키
GMS_KEY=`SECRET-KEY`
GMS_CHAT_MODEL=gpt-5-mini

```

---

## 9. 서비스 통신 흐름

1. 사용자가 웹 브라우저를 통해 서비스에 접속한다.
2. Nginx가 HTTPS 요청을 수신한다.
3. 정적 요청은 Frontend 컨테이너로 전달된다.
4. /api/v1/ 요청은 Backend 컨테이너로 전달된다.
5. Backend는 PostgreSQL, Redis, MinIO 및 AI 서버와 연동하여 데이터를 처리한다.
6. Prometheus, Loki, Promtail을 통해 로그 및 메트릭이 수집된다.
7. Grafana를 통해 모니터링 대시보드를 확인할 수 있다.

---

## 10. 빌드 및 배포 절차

### 10.1 CI/CD 구조

- Jenkins 배포 흐름
    - GitLab Multibranch Pipeline
    - develop 브랜치 → Dev 배포
    - main 브랜치 → Prod 배포
- 배포 과정
    1. GitLab 저장소에서 최신 소스를 가져온다.
    2. Jenkins Credential에 저장된 환경변수 파일(.env.prod)을 생성한다.
    3. Docker Compose를 이용하여 컨테이너를 빌드 및 실행한다.
    4. 변경된 Backend/Frontend/AI 서비스만 선택적으로 재배포한다.
    5. Jenkins Pipeline을 통해 Docker 이미지 빌드 및 컨테이너 재기동을 수행한다.

---

## 11. 외부 서비스 연동

- PostgreSQL
    - 영업 데이터, 계약 정보, 유지보수 정보 등 주요 데이터 저장
- Redis
    - 인증 토큰 및 캐시 데이터 관리
- MinIO
    - 계약서, 제안서, 첨부파일 저장소
- GMS
    - gpt-5-mini 기반 LLM API

---

## 12. DB 덤프파일 최신본
- 

---

## 13. 시연 시나리오
