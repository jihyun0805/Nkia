# 인수인계: AI 서버 공통 인프라 패키지입니다.
# 핵심 흐름: 환경변수 설정, PostgreSQL pool, 내부 API 보안 헬퍼처럼 모든 요청이 공유하는 기반 코드입니다.
# 같이 확인: 설정은 config.py, DB 연결 생명주기는 main.py lifespan과 database.py를 같이 보세요.
