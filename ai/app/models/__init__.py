# 인수인계: AI 내부 실행 모델 패키지입니다.
# 핵심 흐름: API 스키마가 아니라 LangGraph, 검색, planner, draft service가 공유하는 dataclass/Pydantic 모델을 둡니다.
# 같이 확인: 필드 추가 시 실제 소비부가 많은 편이라 rg로 모델명을 찾아 runtime/service/test fixture를 함께 수정하세요.
"""AI models package."""
