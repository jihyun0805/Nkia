# 인수인계: 검색/정형/요약 근거를 프론트가 보여줄 typedEvidences 구조로 묶는 서비스입니다.
# 핵심 흐름: 근거 탭의 “검색 근거/정형 근거/요약 근거” 분리는 여기 결과를 프론트가 그대로 렌더링합니다.
# 같이 확인: 근거 타입 추가 시 schemas/answer.py와 frontend ChatEvidence 렌더링을 같이 확인하세요.
from app.schemas.answer import AnswerEvidence, AnswerEvidenceGroups


def group_answer_evidences(evidences: list[AnswerEvidence]) -> AnswerEvidenceGroups:
    retrieved: list[AnswerEvidence] = []
    structured: list[AnswerEvidence] = []
    derived: list[AnswerEvidence] = []

    for evidence in evidences:
        evidence_type = evidence.evidenceType or "retrieved_evidence"
        if evidence_type == "structured_evidence":
            structured.append(evidence)
        elif evidence_type == "derived_summary_evidence":
            derived.append(evidence)
        else:
            retrieved.append(evidence)

    return AnswerEvidenceGroups(
        retrievedEvidence=retrieved,
        structuredEvidence=structured,
        derivedSummaryEvidence=derived,
    )
