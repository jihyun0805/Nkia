import re
import time
from uuid import uuid4

from app.core.config import settings
from app.langgraph.comparison import build_comparison_delta_plan
from app.langgraph.draft_intent import detect_draft_intent
from app.langgraph.evidence_scope import build_evidence_scope_plan
from app.langgraph.focus import build_focus_plan
from app.langgraph.lifecycle import build_lifecycle_phase_plan
from app.langgraph.metadata_filter import build_metadata_filter_plan
from app.langgraph.query_rewrite import build_query_rewrite_plan
from app.langgraph.search_mode import decide_search_mode
from app.langgraph.workflow import build_workflow_resolver_plan
from app.langgraph.state import (
    GraphAggregation,
    GraphEntityScope,
    GraphRoute,
    GraphScope,
    GraphState,
    GraphTimeRange,
)
from app.langgraph.slot_policy import apply_slot_policy
from app.services.metric_registry import get_metric_spec
from app.langgraph.clarification import apply_clarification_guard
from app.models.normalization import QueryNormalization
from app.schemas.answer import ConversationMessage
from app.services.query_intent_service import parse_structured_query_intent
from app.services.query_normalization_service import normalize_query_context


BUSINESS_CODE_PATTERN = re.compile(r"(?<![A-Z0-9-])[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){2,}(?![A-Z0-9-])")
CUSTOMER_SUFFIXES = (
    "은행",
    "카드",
    "보험",
    "캐피탈",
    "생명",
    "재단",
    "공사",
    "공단",
    "청",
    "부",
    "원",
    "사",
    "시청",
    "도청",
    "군청",
    "구청",
    "본부",
    "센터",
)
MIXED_KEYWORDS = (
    "사유",
    "이유",
    "왜",
    "의사결정",
    "결정 구조",
    "요구사항",
    "제안 포인트",
    "포인트",
    "강조",
    "리스크",
    "비교",
    "견적 상세",
    "정기점검",
    "긴급 장애 대응",
)
RECOMMENDATION_KEYWORDS = (
    "추천",
    "추천해줘",
    "다음 단계",
    "다음에 뭘",
    "다음으로 뭘",
    "다음엔 뭘",
    "이 다음",
    "무엇을 해야",
    "뭘 해야",
    "어떻게 해야",
    "어떤 전략",
    "조언",
    "뭘 준비",
    "무엇을 준비",
    "비슷한 사례",
    "유사한 사례",
    "유사한",
    "유사 수주 사례",
    "과거 사례",
    "이전 사례",
    "수주 사례",
    "성공 사례",
    "어떻게 접근",
    "어떻게 접근했",
    "수주 전략",
    "전략이 뭐",
    "사례 추천",
    "참고할 사례",
    "비결이 뭐",
    "어떤 전략으로",
)
DISCOVERY_KEYWORDS = (
    "반복",
    "공통",
    "패턴",
    "트렌드",
    "의미 있는",
    "의미있는",
    "종합",
    "전반",
    "전사",
)
WORKFLOW_KEYWORDS = ("결재", "승인", "반려", "심의", "접수", "활동요청", "활동 요청", "workflow")


def build_preflight_graph_state(
    *,
    query: str,
    history: list[ConversationMessage],
    start_at: str | None,
    end_at: str | None,
    attachment_session_id: str | None,
    normalization: QueryNormalization | None = None,
) -> GraphState:
    started = time.perf_counter()
    rewrite_plan = build_query_rewrite_plan(query=query, history=history)
    working_query = rewrite_plan.rewritten_query
    normalization = normalization if normalization is not None and working_query == query else normalize_query_context(working_query)
    planner_started = time.perf_counter()
    route = determine_route(query=working_query, normalization=normalization)
    intent = determine_intent_label(query=working_query, normalization=normalization)
    domain = determine_domain_label(query=working_query, normalization=normalization)
    aggregation = determine_aggregation(query=working_query, normalization=normalization)
    planner_ms = elapsed_ms(planner_started)

    resolver_started = time.perf_counter()
    entity_scope = build_entity_scope(query=working_query, normalization=normalization)
    graph_scope = build_graph_scope(entity_scope=entity_scope)
    tool_plan = build_tool_plan(route=route, intent=intent, domain=domain, query=working_query, normalization=normalization)
    resolver_ms = elapsed_ms(resolver_started)
    graph_state = GraphState(
        requestId=str(uuid4()),
        query=query,
        rewrittenQuery=working_query if rewrite_plan.applied else None,
        rewriteReason=rewrite_plan.rewrite_reason,
        rewriteConfidence=rewrite_plan.rewrite_confidence,
        normalizedQuery=normalization.normalized_query,
        route=route,
        answerStatus="UNKNOWN",
        intent=intent,
        domain=domain,
        targetHint=normalization.target_hint,
        sourceTypeHints=list(normalization.source_type_hints),
        timeRange=GraphTimeRange(
            label=normalization.time_range.label,
            startAt=start_at or normalization.time_range.start_at,
            endAt=end_at or normalization.time_range.end_at,
        ),
        entityScope=entity_scope,
        aggregation=aggregation,
        graphScope=graph_scope,
        toolPlan=tool_plan,
        attachmentSessionId=attachment_session_id,
        explicitStartAt=start_at,
        explicitEndAt=end_at,
        historyTurns=len(history),
        metrics={
            "plannerMs": planner_ms,
            "resolverMs": resolver_ms,
            "totalMs": elapsed_ms(started),
        },
        customerSegmentLabel=normalization.customer_segment_label,
        customerNameKeywords=list(normalization.customer_name_keywords),
        businessTypeFilters=list(normalization.business_type_filters),
        proposalTypeFilters=list(normalization.proposal_type_filters),
        listOpportunityIntent=normalization.list_opportunity_intent,
    )
    graph_state = apply_slot_policy(
        graph_state=graph_state,
        query=working_query,
        normalization=normalization,
    )
    graph_state = apply_clarification_guard(graph_state)

    comparison_plan = build_comparison_delta_plan(
        query=working_query,
        normalization=normalization,
        graph_state=graph_state,
    )
    graph_state.comparisonPairs = list(comparison_plan.comparison_pairs)
    graph_state.deltaWindows = list(comparison_plan.delta_windows)
    graph_state.comparisonMetric = comparison_plan.comparison_metric
    graph_state.confidenceReasons.extend(
        reason for reason in comparison_plan.reasons if reason not in graph_state.confidenceReasons
    )

    lifecycle_plan = build_lifecycle_phase_plan(query=working_query, graph_state=graph_state)
    graph_state.phaseScope = lifecycle_plan.phase_scope
    graph_state.phaseFilters = dict(lifecycle_plan.phase_filters)
    graph_state.confidenceReasons.extend(
        reason for reason in lifecycle_plan.reasons if reason not in graph_state.confidenceReasons
    )

    workflow_plan = build_workflow_resolver_plan(query=working_query, graph_state=graph_state)
    graph_state.workflowScope = workflow_plan.workflow_scope
    graph_state.workflowFilters = dict(workflow_plan.workflow_filters)
    graph_state.confidenceReasons.extend(
        reason for reason in workflow_plan.reasons if reason not in graph_state.confidenceReasons
    )

    focus_plan = build_focus_plan(query=working_query, graph_state=graph_state)
    graph_state.focus = focus_plan.focus
    graph_state.timeScope = focus_plan.time_scope
    graph_state.answerShape = focus_plan.answer_shape
    graph_state.confidenceReasons.extend(
        reason for reason in focus_plan.reasons if reason not in graph_state.confidenceReasons
    )

    evidence_scope_plan = build_evidence_scope_plan(query=working_query, graph_state=graph_state)
    graph_state.evidenceScope = evidence_scope_plan.evidence_scope
    graph_state.evidenceMode = evidence_scope_plan.evidence_mode
    graph_state.requiredEvidenceTypes = list(evidence_scope_plan.required_evidence_types)
    graph_state.confidenceReasons.extend(
        reason for reason in evidence_scope_plan.reasons if reason not in graph_state.confidenceReasons
    )

    filter_plan = build_metadata_filter_plan(graph_state=graph_state)
    search_mode_decision = decide_search_mode(
        graph_state=graph_state,
        requested_limit=normalization.requested_limit or 5,
    )
    graph_state.semanticQuery = filter_plan.semantic_query
    graph_state.metadataFilters = dict(filter_plan.metadata_filters)
    graph_state.sourceTypeFilters = list(filter_plan.source_type_filters)
    graph_state.timeFilters = dict(filter_plan.time_filters)
    graph_state.searchMode = search_mode_decision.search_mode
    graph_state.confidenceReasons.extend(reason for reason in search_mode_decision.reasons if reason not in graph_state.confidenceReasons)

    if settings.ai_enable_draft_actions:
        draft_intent = detect_draft_intent(working_query)
        if draft_intent is not None:
            graph_state.draftIntent = draft_intent
            if "draft_intent_detected" not in graph_state.confidenceReasons:
                graph_state.confidenceReasons.append("draft_intent_detected")

    return graph_state


def route_to_response_value(route: GraphRoute) -> str:
    mapping = {
        "FAST_STRUCTURED": "fast_structured",
        "MIXED": "mixed",
        "DISCOVERY": "discovery",
        "UNKNOWN": "discovery",
    }
    return mapping.get(route, "discovery")


def determine_route(*, query: str, normalization: QueryNormalization) -> GraphRoute:
    structured_intent = parse_structured_query_intent(query, normalization)
    exact_codes = BUSINESS_CODE_PATTERN.findall(query)
    normalized_query = normalization.normalized_query
    has_entityish_scope = bool(normalization.entity_terms or normalization.scope_terms or exact_codes)

    if any(keyword in query for keyword in ["의미 있는", "의미있는"]) and normalization.has_summary_intent:
        return "DISCOVERY"

    if exact_codes or structured_intent is not None:
        return "FAST_STRUCTURED"

    if normalization.has_timeline_intent:
        return "FAST_STRUCTURED"

    if normalization.time_range.label and ("실적" in query or "요약" in query or "수주" in query):
        return "FAST_STRUCTURED"

    if normalization.has_ranking_intent:
        return "FAST_STRUCTURED"

    if any(keyword in query for keyword in WORKFLOW_KEYWORDS) and (
        normalization.entity_terms
        or normalization.scope_terms
        or normalization.target_hint in {"maintenance", "activity", "contract", "project", "opportunity", "document"}
    ):
        return "FAST_STRUCTURED"

    if any(keyword in query for keyword in DISCOVERY_KEYWORDS):
        return "DISCOVERY"

    if has_entityish_scope and any(
        keyword in query
        for keyword in ["prb", "PRB", "rfp", "RFP", "제안", "실주", "수주", "수주보고", "수주보고서", "사후영업", "모듈", "근거 문서", "문서 종류"]
    ):
        return "FAST_STRUCTURED"

    if any(keyword in query for keyword in MIXED_KEYWORDS):
        return "MIXED"

    if normalization.has_summary_intent and not normalization.entity_terms:
        return "DISCOVERY"

    if normalization.target_hint in {"maintenance", "activity", "contract", "project", "opportunity", "document"}:
        return "MIXED"

    if normalization.target_hint == "general" and normalization.source_type_hints:
        return "MIXED"

    if "근거" in normalized_query or "문서" in normalized_query:
        return "MIXED"

    return "DISCOVERY"


def determine_intent_label(*, query: str, normalization: QueryNormalization) -> str | None:
    structured_intent = parse_structured_query_intent(query, normalization)
    if structured_intent is not None:
        return structured_intent.intent_type
    normalized_query = normalization.normalized_query
    if normalization.list_opportunity_intent:
        return "list_opportunities"
    if any(keyword in query for keyword in RECOMMENDATION_KEYWORDS):
        return "recommendation"
    if any(keyword in query for keyword in ["반복", "공통", "패턴", "트렌드"]):
        return "pattern_discovery"
    if any(keyword in query for keyword in ["의미 있는", "의미있는"]) and normalization.has_summary_intent:
        return "result_highlight"
    if any(keyword in query for keyword in WORKFLOW_KEYWORDS):
        return "workflow_status"
    if normalization.has_timeline_intent:
        return "timeline"
    if normalization.has_ranking_intent:
        return "rank"
    if "사유" in query or "이유" in query or "왜" in query:
        return "reason"
    if "의사결정" in query or "결정 구조" in query:
        return "decision_structure"
    if "포인트" in query or "강조" in query:
        return "proposal_point"
    if normalization.has_summary_intent:
        return "summary"
    if any(keyword in normalized_query for keyword in ["목록", "리스트", "뭐 있어", "어떤 사업"]):
        return "list"
    return "snapshot"


def determine_domain_label(*, query: str, normalization: QueryNormalization) -> str | None:
    exact_codes = BUSINESS_CODE_PATTERN.findall(query)
    structured_intent = parse_structured_query_intent(query, normalization)
    metric_spec = get_metric_spec(structured_intent.metric_key) if structured_intent is not None else None
    if metric_spec is not None and metric_spec.domain:
        return metric_spec.domain
    if any(code.startswith("OPP-") for code in exact_codes):
        return "discovery"
    if any(code.startswith("CTR-") for code in exact_codes):
        return "contract"
    if any(code.startswith(("PRJ-", "PJT-")) for code in exact_codes):
        return "project"
    if any(code.startswith(("MNT-", "MC-")) for code in exact_codes):
        return "maintenance"
    if normalization.target_hint == "maintenance":
        return "maintenance"
    if normalization.target_hint == "activity":
        return "activity"
    if normalization.target_hint == "contract":
        return "contract"
    if normalization.target_hint == "project":
        return "project"
    if any(keyword in query for keyword in ["rfp", "RFP", "prb", "PRB", "제안", "입찰", "실주", "수주", "수주보고", "수주보고서"]):
        return "bid"
    if any(keyword in query for keyword in ["고객지원", "점검", "장애", "유지보수"]):
        return "maintenance"
    if any(keyword in query for keyword in ["고객사", "고객군", "사업기회", "발굴"]):
        return "discovery"
    return normalization.target_hint if normalization.target_hint != "general" else "general"


def determine_aggregation(*, query: str, normalization: QueryNormalization) -> GraphAggregation:
    structured_intent = parse_structured_query_intent(query, normalization)
    metric = None
    operation = None
    group_by: list[str] = []
    top_n = normalization.requested_limit

    if structured_intent is not None:
        if structured_intent.intent_type in {"metric_rank", "count_rank"}:
            operation = "top_n"
            metric = structured_intent.metric_key or structured_intent.count_domain
            group_by = ["opportunity"]
        elif structured_intent.intent_type == "aggregate_total":
            operation = "sum"
            metric = structured_intent.metric_key
            group_by = ["portfolio"]
        elif structured_intent.intent_type == "period_summary":
            operation = "summary"
            metric = structured_intent.summary_domain
            group_by = ["opportunity"]
        elif structured_intent.intent_type == "status_list":
            operation = "list"

    if operation is None and normalization.has_ranking_intent:
        operation = "top_n"
    elif operation is None and normalization.has_timeline_intent:
        operation = "timeline"
    elif operation is None and normalization.has_summary_intent:
        operation = "summary"

    if metric is None and "수주" in query and ("실적" in query or "금액" in query):
        metric = "won_amount" if "금액" in query else "won_count"
        group_by = ["opportunity"]
    elif metric is None and "활동" in query and any(keyword in query for keyword in ["횟수", "건수", "많"]):
        metric = "activity_count"
        group_by = ["opportunity"]
    elif metric is None and "고객지원" in query and any(keyword in query for keyword in ["횟수", "건수", "많"]):
        metric = "customer_support_count"
        group_by = ["opportunity"]

    return GraphAggregation(metric=metric, operation=operation, groupBy=group_by, topN=top_n)


def build_entity_scope(*, query: str, normalization: QueryNormalization) -> GraphEntityScope:
    exact_codes = BUSINESS_CODE_PATTERN.findall(query)
    customer_terms = [term for term in normalization.entity_terms if term.endswith(CUSTOMER_SUFFIXES)]
    partner_terms = [term for term in normalization.entity_terms if term.endswith(("시스템즈", "솔루션", "테크", "데이터랩", "인포텍"))]
    return GraphEntityScope(
        exactCodes=exact_codes,
        customerTerms=customer_terms[:6],
        partnerTerms=partner_terms[:6],
        entityTerms=list(normalization.entity_terms),
        scopeTerms=list(normalization.scope_terms),
    )


def build_graph_scope(*, entity_scope: GraphEntityScope) -> GraphScope:
    opportunity_codes = [code for code in entity_scope.exactCodes if code.startswith("OPP-")]
    contract_codes = [code for code in entity_scope.exactCodes if code.startswith("CTR-")]
    project_codes = [code for code in entity_scope.exactCodes if code.startswith(("PRJ-", "PJT-"))]
    maintenance_codes = [code for code in entity_scope.exactCodes if code.startswith(("MNT-", "MC-"))]
    return GraphScope(
        opportunityCodes=opportunity_codes,
        contractCodes=contract_codes,
        projectCodes=project_codes,
        maintenanceCodes=maintenance_codes,
    )


def build_tool_plan(
    *,
    route: GraphRoute,
    intent: str | None,
    domain: str | None,
    query: str,
    normalization: QueryNormalization,
) -> list[str]:
    if route == "DISCOVERY":
        return ["build_global_summary_scope", "retrieve_discovery_evidence"]

    if intent == "list_opportunities":
        return ["list_opportunity_snapshot"]

    if intent == "recommendation":
        return ["get_recommendation"]

    if intent == "workflow_status":
        return ["get_workflow_snapshot"]

    if intent == "timeline":
        if domain == "maintenance":
            return ["get_customer_support_timeline"]
        return ["get_sales_activity_timeline"]

    if intent == "reason":
        return ["get_graph_snapshot", "retrieve_reason_evidence"]

    if intent == "decision_structure":
        return ["get_graph_snapshot", "retrieve_decision_evidence"]

    if intent in {"status_list", "list"}:
        return ["get_status_list"]

    if intent in {"metric_rank", "count_rank", "rank"}:
        return ["get_rank"]

    if intent == "aggregate_total":
        return ["get_total_aggregate"]

    if intent in {"period_summary", "summary"} and normalization.time_range.label:
        return ["get_period_summary"]

    if domain == "maintenance" and "견적" in query:
        return ["get_maintenance_quote_detail"]

    if domain == "project":
        return ["get_project_snapshot"]

    if domain == "contract":
        return ["get_contract_snapshot"]

    return ["get_opportunity_snapshot"] if route == "FAST_STRUCTURED" else ["get_graph_snapshot"]


def elapsed_ms(started: float) -> int:
    return int((time.perf_counter() - started) * 1000)
