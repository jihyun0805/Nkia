# 인수인계: 질문과 그래프 상태에서 어떤 근거 범위를 우선해야 하는지 판단합니다.
# 핵심 흐름: 정확 코드/문서 단계/부모 엔티티 힌트를 search_service에 넘길 준비를 합니다.
# 같이 확인: 검색 누락 이슈는 metadata_filter와 함께 확인하세요.
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
