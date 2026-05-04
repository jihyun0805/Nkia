from dataclasses import dataclass, field

from app.langgraph.state import GraphState


@dataclass(frozen=True)
class WorkflowResolverPlan:
    workflow_scope: str | None = None
    workflow_filters: dict[str, str] = field(default_factory=dict)
    reasons: list[str] = field(default_factory=list)


WORKFLOW_KEYWORDS = (
    ("결재", "APPROVAL"),
    ("승인", "APPROVAL"),
    ("반려", "APPROVAL"),
    ("기안", "APPROVAL"),
    ("접수", "ACTIVITY_REQUEST"),
    ("활동 요청", "ACTIVITY_REQUEST"),
    ("활동요청", "ACTIVITY_REQUEST"),
    ("심의", "PRB_DECISION"),
    ("수주 보고서", "WON_REPORT_APPROVAL"),
    ("수주보고서", "WON_REPORT_APPROVAL"),
    ("수주보고", "WON_REPORT_APPROVAL"),
)


def build_workflow_resolver_plan(*, query: str, graph_state: GraphState) -> WorkflowResolverPlan:
    reasons: list[str] = []
    scope = None
    for keyword, candidate in WORKFLOW_KEYWORDS:
        if keyword in query:
            scope = candidate
            reasons.append("workflow_keyword")
            break

    if scope is None:
        if graph_state.phaseScope == "PRB_APPROVED":
            scope = "PRB_DECISION"
        elif graph_state.phaseScope == "WON_REPORTED":
            scope = "WON_REPORT_APPROVAL"

    workflow_filters: dict[str, str] = {}
    if "대기" in query:
        workflow_filters["status_family"] = "PENDING"
        reasons.append("workflow_pending")
    if "반려" in query:
        workflow_filters["status_family"] = "REJECTED"
        reasons.append("workflow_rejected")
    if "승인" in query and "대기" not in query and "반려" not in query:
        workflow_filters["status_family"] = "APPROVED"
        reasons.append("workflow_approved")

    return WorkflowResolverPlan(
        workflow_scope=scope,
        workflow_filters=workflow_filters,
        reasons=reasons,
    )
