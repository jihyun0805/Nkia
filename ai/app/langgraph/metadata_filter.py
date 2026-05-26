# 인수인계: GraphState를 search repository metadata_filters로 변환합니다.
# 핵심 흐름: 고객명, 사업구분, 제안 유형, 문서 scope 같은 구조화 필터를 만듭니다.
# 같이 확인: 필터가 너무 강하면 근거가 사라지므로 corrective 로직과 함께 튜닝하세요.
from dataclasses import dataclass, field
from typing import Any

from app.langgraph.state import GraphEntityScope, GraphState
from app.models.constants import SourceType

S = SourceType  # 가독성을 위한 로컬 별칭

DOCUMENT_SCOPE_SOURCE_TYPES = {
    S.PRB:                  [S.PRB, S.PRB_RESULT],
    S.PRB_RESULT:           [S.PRB_RESULT, S.PRB],
    S.RFP:                  [S.RFP, S.RFP_ANALYSIS, S.ATTACHMENT],
    S.RFP_ANALYSIS:         [S.RFP_ANALYSIS, S.RFP, S.ATTACHMENT],
    S.PROPOSAL:             [S.PROPOSAL, S.ATTACHMENT],
    S.WON:                  [S.WON, S.ORDER_REPORT, S.CONTRACT, S.ATTACHMENT],
    S.LOST:                 [S.LOST, S.BID_RESULT, S.ATTACHMENT],
    S.ORDER_REPORT:         [S.ORDER_REPORT, S.WON, S.CONTRACT, S.ATTACHMENT],
    S.CONTRACT:             [S.CONTRACT, S.ATTACHMENT],
    S.PROJECT_RESULT_REPORT:[S.PROJECT_RESULT_REPORT, S.PROJECT, S.ATTACHMENT],
    S.MAINTENANCE_QUOTE:    [S.MAINTENANCE_QUOTE, S.MAINTENANCE, S.ATTACHMENT],
}


@dataclass(frozen=True)
class MetadataFilterPlan:
    semantic_query: str
    metadata_filters: dict[str, Any] = field(default_factory=dict)
    source_type_filters: list[str] = field(default_factory=list)
    time_filters: dict[str, str | None] = field(default_factory=dict)
    filter_reasons: list[str] = field(default_factory=list)


def build_metadata_filter_plan(*, graph_state: GraphState) -> MetadataFilterPlan:
    semantic_query = strip_structural_keywords(graph_state.normalizedQuery or graph_state.query)
    metadata_filters: dict[str, Any] = {}
    reasons: list[str] = []

    if graph_state.populationScope != "UNKNOWN":
        metadata_filters["population_scope"] = graph_state.populationScope
        reasons.append("population_scope")

    entity_filters = build_entity_filters(graph_state.entityScope)
    if entity_filters:
        metadata_filters.update(entity_filters)
        reasons.append("entity_scope")

    if graph_state.domain and graph_state.domain != "general":
        metadata_filters["domain"] = graph_state.domain
        reasons.append("domain")

    if graph_state.phaseScope:
        metadata_filters["phase_scope"] = graph_state.phaseScope
        reasons.append("phase_scope")
    if graph_state.phaseFilters:
        metadata_filters["phase_filters"] = dict(graph_state.phaseFilters)
        reasons.append("phase_filters")
    if graph_state.evidenceScope:
        metadata_filters["evidence_scope"] = graph_state.evidenceScope
        reasons.append("evidence_scope")

    if graph_state.customerSegmentLabel and graph_state.customerNameKeywords:
        metadata_filters["customer_segment_label"] = graph_state.customerSegmentLabel
        metadata_filters["customer_name_keywords"] = list(graph_state.customerNameKeywords)
        reasons.append("customer_segment")

    if graph_state.businessTypeFilters:
        metadata_filters["business_type"] = list(graph_state.businessTypeFilters)
        reasons.append("business_type")

    if graph_state.proposalTypeFilters:
        metadata_filters["proposal_type"] = list(graph_state.proposalTypeFilters)
        reasons.append("proposal_type")

    document_scope = extract_document_scope(graph_state)
    source_type_filters = list(graph_state.sourceTypeHints)
    if graph_state.evidenceScope == "SESSION_ONLY":
        source_type_filters = [S.ATTACHMENT]
        reasons.append("session_only_attachments")
    if document_scope:
        metadata_filters["document_scope"] = document_scope
        source_type_filters = DOCUMENT_SCOPE_SOURCE_TYPES.get(document_scope, source_type_filters)
        reasons.append("document_scope")
    if not source_type_filters and graph_state.route != "FAST_STRUCTURED":
        source_type_filters = infer_source_types_from_tool_plan(graph_state.toolPlan)
        if source_type_filters:
            reasons.append("tool_plan_source_scope")

    if graph_state.listOpportunityIntent:
        source_type_filters = _bring_to_front(
            list(source_type_filters or []),
            preferred=[S.PROJECT_OPPORTUNITY, S.SALES_ACTIVITY, S.RFP, S.RFP_ANALYSIS],
        )
        reasons.append("list_opportunity_intent")

    time_filters = {
        "startAt": graph_state.timeRange.startAt,
        "endAt": graph_state.timeRange.endAt,
        "label": graph_state.timeRange.label,
    }
    if graph_state.timeRange.startAt or graph_state.timeRange.endAt:
        reasons.append("time_range")

    return MetadataFilterPlan(
        semantic_query=semantic_query or (graph_state.normalizedQuery or graph_state.query),
        metadata_filters=metadata_filters,
        source_type_filters=source_type_filters,
        time_filters=time_filters,
        filter_reasons=reasons,
    )


def strip_structural_keywords(query: str) -> str:
    removable_tokens = (
        "최근",
        "문서",
        "기준",
        "알려줘",
        "보여줘",
        "정리해줘",
        "요약해줘",
        "사업기회",
        "고객사",
        "사업코드",
    )
    refined = query
    for token in removable_tokens:
        refined = refined.replace(token, " ")
    return " ".join(refined.split())


def build_entity_filters(entity_scope: GraphEntityScope) -> dict[str, Any]:
    filters: dict[str, Any] = {}
    if entity_scope.exactCodes:
        filters["exact_codes"] = list(entity_scope.exactCodes)
    if entity_scope.customerTerms:
        filters["customer_terms"] = list(entity_scope.customerTerms)
    if entity_scope.partnerTerms:
        filters["partner_terms"] = list(entity_scope.partnerTerms)
    if entity_scope.scopeTerms:
        filters["scope_terms"] = list(entity_scope.scopeTerms)
    return filters


def extract_document_scope(graph_state: GraphState) -> str | None:
    slot = graph_state.slots.get("document_scope")
    if slot and slot.value:
        return str(slot.value)
    return None


def _bring_to_front(existing: list[str], *, preferred: list[str]) -> list[str]:
    """existing 의 순서를 보존하되, preferred 항목은 앞으로 끌어오고 누락된 것은 추가한다."""

    seen: set[str] = set()
    ordered: list[str] = []
    for item in preferred:
        if item not in seen:
            ordered.append(item)
            seen.add(item)
    for item in existing:
        if item in seen:
            continue
        ordered.append(item)
        seen.add(item)
    return ordered


def infer_source_types_from_tool_plan(tool_plan: list[str]) -> list[str]:
    joined = set(tool_plan)
    if "retrieve_reason_evidence" in joined:
        return [S.BID_RESULT, S.LOST, S.PRB_RESULT, S.PRB, S.RFP, S.RFP_ANALYSIS, S.ATTACHMENT]
    if "retrieve_decision_evidence" in joined:
        return [S.PROJECT_OPPORTUNITY, S.SALES_ACTIVITY, S.RFP, S.RFP_ANALYSIS, S.ATTACHMENT]
    if "build_global_summary_scope" in joined or "retrieve_discovery_evidence" in joined:
        return [S.PROJECT_RESULT_REPORT, S.PRB, S.PRB_RESULT, S.RFP, S.RFP_ANALYSIS, S.PROPOSAL, S.ATTACHMENT]
    return []
