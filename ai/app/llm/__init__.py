# 인수인계: 외부 LLM 호출 패키지입니다.
# 핵심 흐름: 현재는 gms_client.py가 query planner, grounded answer, 초안 slot 추출 프롬프트를 모두 담당합니다.
# 같이 확인: LLM provider나 모델을 바꾸면 gms_client.py와 services/query_plan_service.py 호출 계약을 같이 보세요.
