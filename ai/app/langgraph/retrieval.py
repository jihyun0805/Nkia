from dataclasses import dataclass

from app.langgraph.search_mode import decide_search_mode
from app.langgraph.state import GraphState


@dataclass(frozen=True)
class RetrievalExecutionPlan:
    route: str
    search_mode: str
    limit: int
    source_types: list[str]
    use_reranker: bool


DOCUMENT_SCOPE_SOURCE_TYPES = {
    "PRB": ["PRB", "PRB_RESULT"],
    "PRB_RESULT": ["PRB_RESULT", "PRB"],
    "RFP": ["RFP", "RFP_ANALYSIS", "ATTACHMENT"],
    "RFP_ANALYSIS": ["RFP_ANALYSIS", "RFP", "ATTACHMENT"],
    "PROPOSAL": ["PROPOSAL", "ATTACHMENT"],
    "WON": ["WON", "ORDER_REPORT", "CONTRACT", "ATTACHMENT"],
    "LOST": ["LOST", "BID_RESULT", "ATTACHMENT"],
    "ORDER_REPORT": ["ORDER_REPORT", "WON", "CONTRACT", "ATTACHMENT"],
    "CONTRACT": ["CONTRACT", "ATTACHMENT"],
    "PROJECT_RESULT_REPORT": ["PROJECT_RESULT_REPORT", "PROJECT", "ATTACHMENT"],
    "MAINTENANCE_QUOTE": ["MAINTENANCE_QUOTE", "MAINTENANCE", "ATTACHMENT"],
}


def build_retrieval_execution_plan(
    *,
    graph_state: GraphState,
    requested_limit: int,
    requested_source_types: list[str] | None,
) -> RetrievalExecutionPlan | None:
    if graph_state.route == "FAST_STRUCTURED":
        return None

    search_mode_decision = decide_search_mode(
        graph_state=graph_state,
        requested_limit=requested_limit,
    )

    scoped_source_types = determine_scoped_source_types(graph_state, requested_source_types)

    if graph_state.route == "MIXED":
        source_types = scoped_source_types or determine_mixed_source_types(graph_state, requested_source_types)
        return RetrievalExecutionPlan(
            route=graph_state.route,
            search_mode=search_mode_decision.search_mode,
            limit=search_mode_decision.limit,
            source_types=source_types,
            use_reranker=search_mode_decision.use_reranker,
        )

    source_types = scoped_source_types
    if not source_types:
        source_types = requested_source_types or list(graph_state.sourceTypeFilters) or list(graph_state.sourceTypeHints)
    if not source_types:
        source_types = ["PROJECT_RESULT_REPORT", "PRB", "PRB_RESULT", "RFP", "RFP_ANALYSIS", "PROPOSAL", "ATTACHMENT"]
    return RetrievalExecutionPlan(
        route=graph_state.route,
        search_mode=search_mode_decision.search_mode,
        limit=search_mode_decision.limit,
        source_types=source_types,
        use_reranker=search_mode_decision.use_reranker,
    )


def determine_scoped_source_types(graph_state: GraphState, requested_source_types: list[str] | None) -> list[str]:
    if requested_source_types:
        return requested_source_types
    if graph_state.sourceTypeFilters:
        return list(graph_state.sourceTypeFilters)
    document_scope = None
    if "document_scope" in graph_state.slots:
        document_scope = graph_state.slots["document_scope"].value
    if document_scope and document_scope in DOCUMENT_SCOPE_SOURCE_TYPES:
        return DOCUMENT_SCOPE_SOURCE_TYPES[document_scope]
    return []


def determine_mixed_source_types(graph_state: GraphState, requested_source_types: list[str] | None) -> list[str]:
    if requested_source_types:
        return requested_source_types

    tool_plan = set(graph_state.toolPlan)
    if "retrieve_reason_evidence" in tool_plan:
        return ["BID_RESULT", "LOST", "PRB_RESULT", "PRB", "RFP", "RFP_ANALYSIS", "ATTACHMENT"]
    if "retrieve_decision_evidence" in tool_plan:
        return ["PROJECT_OPPORTUNITY", "SALES_ACTIVITY", "RFP", "RFP_ANALYSIS", "ATTACHMENT"]
    if "get_maintenance_quote_detail" in tool_plan:
        return ["MAINTENANCE_QUOTE", "MAINTENANCE", "CUSTOMER_SUPPORT", "ATTACHMENT"]
    if "get_project_snapshot" in tool_plan:
        return ["PROJECT", "PROJECT_RESULT_REPORT", "ATTACHMENT"]
    if "get_contract_snapshot" in tool_plan:
        return ["WON", "CONTRACT", "ORDER_REPORT", "ATTACHMENT"]
    if graph_state.sourceTypeHints:
        return list(graph_state.sourceTypeHints)
    return ["ATTACHMENT"]
