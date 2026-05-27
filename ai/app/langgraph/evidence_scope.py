# 인수인계 메모: 챗봇 LangGraph 실행 계층입니다. 질문을 분기하고 정형 조회, 검색, 답변 생성, 초안 액션 순서로 흘려보냅니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from dataclasses import dataclass, field

from app.langgraph.state import GraphState


@dataclass(frozen=True)
class EvidenceScopePlan:
    evidence_scope: str
    evidence_mode: str
    required_evidence_types: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)


def build_evidence_scope_plan(*, query: str, graph_state: GraphState) -> EvidenceScopePlan:
    if graph_state.attachmentSessionId and any(keyword in query for keyword in ("내가 올린", "업로드한", "첨부한", "이 파일", "첨부파일")):
        return EvidenceScopePlan(
            evidence_scope="SESSION_ONLY",
            evidence_mode="retrieved_only",
            required_evidence_types=["retrieved_evidence"],
            reasons=["session_attachment_directive"],
        )

    if "첨부된" in query or "문서에 첨부" in query:
        return EvidenceScopePlan(
            evidence_scope="DOCUMENT_FAMILY",
            evidence_mode="structured_plus_retrieved",
            required_evidence_types=["retrieved_evidence"],
            reasons=["document_family_directive"],
        )

    if graph_state.route == "FAST_STRUCTURED":
        return EvidenceScopePlan(
            evidence_scope="ENTITY_LOCAL" if graph_state.populationScope == "SINGLE_ENTITY" else "GLOBAL_INDEX",
            evidence_mode="structured_only",
            required_evidence_types=["structured_evidence"],
            reasons=["fast_structured"],
        )

    if graph_state.route == "DISCOVERY" and graph_state.intent in {"pattern_discovery", "result_highlight"}:
        return EvidenceScopePlan(
            evidence_scope="GLOBAL_INDEX",
            evidence_mode="derived_summary",
            required_evidence_types=["derived_summary_evidence"],
            reasons=["discovery_summary"],
        )

    if graph_state.populationScope in {"SINGLE_ENTITY", "FILTERED_SET"}:
        return EvidenceScopePlan(
            evidence_scope="ENTITY_LOCAL",
            evidence_mode="structured_plus_retrieved",
            required_evidence_types=["structured_evidence", "retrieved_evidence"],
            reasons=["entity_local_scope"],
        )

    return EvidenceScopePlan(
        evidence_scope="GLOBAL_INDEX",
        evidence_mode="retrieved_only" if graph_state.route == "DISCOVERY" else "structured_plus_retrieved",
        required_evidence_types=["retrieved_evidence"],
        reasons=["global_scope"],
    )
