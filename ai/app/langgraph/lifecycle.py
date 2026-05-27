# 인수인계 메모: 챗봇 LangGraph 실행 계층입니다. 질문을 분기하고 정형 조회, 검색, 답변 생성, 초안 액션 순서로 흘려보냅니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from dataclasses import dataclass, field

from app.langgraph.state import GraphState


@dataclass(frozen=True)
class LifecyclePhasePlan:
    phase_scope: str | None = None
    phase_filters: dict[str, str] = field(default_factory=dict)
    reasons: list[str] = field(default_factory=list)


PHASE_KEYWORDS = (
    ("유상 전환", "PAID_MAINTENANCE"),
    ("전환 후보", "PAID_MAINTENANCE"),
    ("발굴", "DISCOVERY"),
    ("활동", "ACTIVITY"),
    ("영업활동", "ACTIVITY"),
    ("rfp", "RFP_ANALYZED"),
    ("RFP", "RFP_ANALYZED"),
    ("prb 결과", "PRB_APPROVED"),
    ("PRB 결과", "PRB_APPROVED"),
    ("prb", "PRB_APPROVED"),
    ("PRB", "PRB_APPROVED"),
    ("제안", "PROPOSAL_SUBMITTED"),
    ("입찰", "BID_DECIDED"),
    ("실주", "BID_DECIDED"),
    ("수주 보고서", "WON_REPORTED"),
    ("수주보고서", "WON_REPORTED"),
    ("수주보고", "WON_REPORTED"),
    ("수주", "WON_REPORTED"),
    ("계약", "CONTRACTED"),
    ("결과보고", "PROJECT_REPORTED"),
    ("프로젝트", "PROJECT_ACTIVE"),
    ("무상 유지보수", "WARRANTY_MAINTENANCE"),
    ("무상유지보수", "WARRANTY_MAINTENANCE"),
    ("유상 유지보수", "PAID_MAINTENANCE"),
    ("유상유지보수", "PAID_MAINTENANCE"),
)


def build_lifecycle_phase_plan(*, query: str, graph_state: GraphState) -> LifecyclePhasePlan:
    reasons: list[str] = []
    phase_scope = detect_phase_scope(query=query, graph_state=graph_state)
    if phase_scope:
        reasons.append("phase_keyword")
    phase_filters = {}
    if phase_scope in {"WARRANTY_MAINTENANCE", "PAID_MAINTENANCE"}:
        phase_filters["maintenance_contract_type"] = "무상" if phase_scope == "WARRANTY_MAINTENANCE" else "유상"
        reasons.append("maintenance_contract_phase")
    if "무상" in query and "유상" in query and phase_scope == "PAID_MAINTENANCE":
        phase_filters["lifecycle_transition"] = "warranty_to_paid"
        reasons.append("maintenance_transition")
    if phase_scope == "PROJECT_REPORTED":
        phase_filters["requires_result_report"] = "true"
    return LifecyclePhasePlan(
        phase_scope=phase_scope,
        phase_filters=phase_filters,
        reasons=reasons,
    )


def detect_phase_scope(*, query: str, graph_state: GraphState) -> str | None:
    for keyword, phase_scope in PHASE_KEYWORDS:
        if keyword in query:
            return phase_scope

    document_scope = graph_state.slots.get("document_scope")
    if document_scope and document_scope.value:
        mapping = {
            "RFP": "RFP_ANALYZED",
            "RFP_ANALYSIS": "RFP_ANALYZED",
            "PRB": "PRB_APPROVED",
            "PRB_RESULT": "PRB_APPROVED",
            "PROPOSAL": "PROPOSAL_SUBMITTED",
            "BID_RESULT": "BID_DECIDED",
            "LOST": "BID_DECIDED",
            "WON": "WON_REPORTED",
            "ORDER_REPORT": "WON_REPORTED",
            "CONTRACT": "CONTRACTED",
            "PROJECT_RESULT_REPORT": "PROJECT_REPORTED",
            "MAINTENANCE_QUOTE": "PAID_MAINTENANCE",
        }
        return mapping.get(str(document_scope.value))

    if graph_state.domain == "maintenance":
        return "PAID_MAINTENANCE"
    if graph_state.domain == "project":
        return "PROJECT_ACTIVE"
    if graph_state.domain == "contract":
        return "CONTRACTED"
    return None
