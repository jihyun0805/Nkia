# 인수인계: structured_answer_service에서 분리한 정형 질의 executor 패키지입니다.
# 핵심 흐름: 현재는 opportunity_risk.py의 사업기회 리스크 집중 질의 응답 함수를 재수출합니다.
# 같이 확인: 정형 답변 파일이 더 커지면 도메인별 executor를 이 패키지로 옮기고 import 경로를 정리하세요.
from app.services.structured_executors.opportunity_risk import answer_entity_risk_focus_query

__all__ = ["answer_entity_risk_focus_query"]
