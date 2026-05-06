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
