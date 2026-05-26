# 인수인계: SQL repository 패키지입니다.
# 핵심 흐름: 서비스 계층이 직접 SQL을 흩뿌리지 않도록 검색 후보 조회, 색인 upsert/delete, 백엔드 원본 조회를 분리합니다.
# 같이 확인: SQL 조건 변경 시 권한 필터와 metadata key가 빠지지 않았는지 search/indexing service에서 함께 검증하세요.
