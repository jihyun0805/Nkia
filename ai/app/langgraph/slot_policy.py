from datetime import date, datetime, time, timedelta, timezone

from app.langgraph.state import GraphSlotEntry, GraphState, GraphTimeRange
from app.models.normalization import QueryNormalization


KST = timezone(timedelta(hours=9))
RECENT_EXPRESSIONS = ("최근", "요즘", "근래", "최근에")
DOCUMENT_SCOPE_KEYWORDS: tuple[tuple[str, str], ...] = (
    ("PRB 결과", "PRB_RESULT"),
    ("PRB결과", "PRB_RESULT"),
    ("prb result", "PRB_RESULT"),
    ("PRB", "PRB"),
    ("prb", "PRB"),
    ("RFP 분석", "RFP_ANALYSIS"),
    ("RFP분석", "RFP_ANALYSIS"),
    ("rfp analysis", "RFP_ANALYSIS"),
    ("RFP", "RFP"),
    ("rfp", "RFP"),
    ("제안서", "PROPOSAL"),
    ("제안", "PROPOSAL"),
    ("실주", "LOST"),
    ("수주보고서", "ORDER_REPORT"),
    ("수주 보고서", "ORDER_REPORT"),
    ("수주보고", "ORDER_REPORT"),
    ("수주", "WON"),
    ("사후영업", "POST_SALES"),
    ("영업활동", "SALES_ACTIVITY"),
    ("모듈", "MODULE"),
    ("계약서", "CONTRACT"),
    ("결과보고서", "PROJECT_RESULT_REPORT"),
    ("유지보수 견적서", "MAINTENANCE_QUOTE"),
    ("견적서", "MAINTENANCE_QUOTE"),
)
SINGLE_ENTITY_DOCUMENT_INTENTS = {"reason", "decision_structure", "proposal_point"}
RANK_INTENTS = {"rank", "metric_rank", "count_rank"}
NON_ENTITY_TERMS = {
    "모든",
    "전체",
    "전사",
    "최근",
    "문서",
    "문서에서",
    "반복",
    "반복된",
    "리스크",
    "리스크를",
    "사업",
    "사업기회",
    "사업들",
    "우수한",
    "좋은",
    "높은",
    "수익성",
    "수익성의",
    "의미있는",
    "의미있는결과",
    "의미",
    "결과",
    "가장",
    "제일",
    "top3",
    "top5",
    "top10",
    "건",
    "건의",
    "실주",
    "사유",
    "사유가",
    "고객사",
    "의사결정",
    "구조",
    "포인트",
    "중에서",
    "하나만",
    "말해줘",
    "뭐야",
    "알려줘",
    "보여줘",
    "찾아줘",
    "정리해줘",
    "요약해줘",
    "prb",
    "rfp",
    "proposal",
    "무상",
    "유상",
    "전환",
    "후보",
    "끝나고",
    "기준으로",
    "비교해줘",
}


def apply_slot_policy(
    *,
    graph_state: GraphState,
    query: str,
    normalization: QueryNormalization,
    today: date | None = None,
) -> GraphState:
    effective_today = today or datetime.now(KST).date()
    slots: dict[str, GraphSlotEntry] = {}
    applied_defaults: list[str] = []

    slots["route"] = GraphSlotEntry(
        value=graph_state.route,
        status="INFERRED",
        priority="REQUIRED",
        source="preflight_route",
    )
    slots["intent"] = GraphSlotEntry(
        value=graph_state.intent,
        status="INFERRED" if graph_state.intent else "MISSING_REQUIRED",
        priority="REQUIRED",
        source="intent_parser",
    )
    slots["domain"] = GraphSlotEntry(
        value=graph_state.domain,
        status="INFERRED" if graph_state.domain else "MISSING_REQUIRED",
        priority="REQUIRED",
        source="domain_parser",
    )

    document_scope = detect_document_scope(query=query, normalization=normalization)
    slots["document_scope"] = GraphSlotEntry(
        value=document_scope,
        status="EXPLICIT" if document_scope else "OPTIONAL_EMPTY",
        priority="OPTIONAL",
        source="user_query" if document_scope else None,
    )
    attachment_session_required = should_require_attachment_session(query=query, graph_state=graph_state)
    slots["attachment_session"] = GraphSlotEntry(
        value=graph_state.attachmentSessionId,
        status="EXPLICIT" if graph_state.attachmentSessionId else (
            "MISSING_REQUIRED" if attachment_session_required else "OPTIONAL_EMPTY"
        ),
        priority="REQUIRED" if attachment_session_required else "OPTIONAL",
        source="request" if graph_state.attachmentSessionId else None,
    )

    meaningful_entity_terms = extract_meaningful_entity_terms(graph_state.entityScope.entityTerms)
    meaningful_customer_terms = extract_meaningful_entity_terms(graph_state.entityScope.customerTerms)
    meaningful_partner_terms = extract_meaningful_entity_terms(graph_state.entityScope.partnerTerms)
    has_exact_code = bool(graph_state.entityScope.exactCodes)
    has_customer_scope = bool(meaningful_customer_terms)
    has_partner_scope = bool(meaningful_partner_terms)
    has_entity_scope = has_exact_code or has_customer_scope or has_partner_scope or bool(meaningful_entity_terms)

    population_scope = determine_population_scope(graph_state=graph_state, has_entity_scope=has_entity_scope)
    graph_state.populationScope = population_scope
    slots["population_scope"] = GraphSlotEntry(
        value=population_scope,
        status="INFERRED" if population_scope != "UNKNOWN" else "OPTIONAL_EMPTY",
        priority="OPTIONAL",
        source="scope_inference",
    )

    required_entity_scope = should_require_entity_scope(graph_state)
    slots["entity_scope"] = GraphSlotEntry(
        value=build_entity_scope_value(
            graph_state,
            meaningful_entity_terms=meaningful_entity_terms,
            meaningful_customer_terms=meaningful_customer_terms,
            meaningful_partner_terms=meaningful_partner_terms,
        ),
        status="EXPLICIT" if has_entity_scope else ("MISSING_REQUIRED" if required_entity_scope else "OPTIONAL_EMPTY"),
        priority="REQUIRED" if required_entity_scope else "OPTIONAL",
        source="user_query" if has_entity_scope else None,
    )

    time_slot = build_time_slot(graph_state=graph_state, query=query)
    if graph_state.intent == "result_highlight" and population_scope == "ALL" and time_slot.status == "OPTIONAL_EMPTY":
        time_slot = GraphSlotEntry(
            value=None,
            status="MISSING_REQUIRED",
            priority="REQUIRED",
            source="result_highlight_time_policy",
        )
    if time_slot.priority == "DEFAULTABLE" and time_slot.status == "OPTIONAL_EMPTY":
        defaulted_time_range = build_recent_default_range(today=effective_today, days=90)
        graph_state.timeRange = defaulted_time_range
        time_slot = GraphSlotEntry(
            value={
                "label": defaulted_time_range.label,
                "startAt": defaulted_time_range.startAt,
                "endAt": defaulted_time_range.endAt,
            },
            status="DEFAULTED",
            priority="DEFAULTABLE",
            source="policy_default_recent_90d",
        )
        applied_defaults.append("time_range:recent->90d")
    slots["time_range"] = time_slot

    metric_slot = build_metric_slot(graph_state)
    slots["metric"] = metric_slot

    graph_state.slots = slots
    graph_state.appliedDefaults = applied_defaults
    graph_state.missingRequiredSlots = [
        key for key, slot in slots.items() if slot.priority == "REQUIRED" and slot.status == "MISSING_REQUIRED"
    ]
    return graph_state


def detect_document_scope(*, query: str, normalization: QueryNormalization) -> str | None:
    for keyword, scope in DOCUMENT_SCOPE_KEYWORDS:
        if keyword in query:
            return scope
    if len(normalization.source_type_hints) == 1:
        return normalization.source_type_hints[0]
    return None


def should_require_attachment_session(*, query: str, graph_state: GraphState) -> bool:
    if graph_state.attachmentSessionId:
        return False

    normalized_query = " ".join(query.lower().split())
    has_attachment_reference = any(
        keyword in normalized_query
        for keyword in ("첨부", "업로드", "첨부파일", "내가 올린", "올린 문서", "올린 파일")
    )
    has_related_business_request = any(
        keyword in normalized_query
        for keyword in (
            "관련된 사업",
            "관련 사업",
            "관련된 사업기회",
            "관련 사업기회",
            "어떤 사업",
            "어느 사업",
            "사업 알려",
            "사업기회 알려",
        )
    )
    return has_attachment_reference and has_related_business_request


def determine_population_scope(*, graph_state: GraphState, has_entity_scope: bool) -> str:
    if graph_state.graphScope.opportunityCodes or graph_state.graphScope.contractCodes or graph_state.graphScope.projectCodes or graph_state.graphScope.maintenanceCodes:
        return "SINGLE_ENTITY"
    if has_entity_scope:
        return "FILTERED_SET"
    if graph_state.route == "DISCOVERY":
        return "ALL"
    if graph_state.route == "FAST_STRUCTURED":
        return "FILTERED_SET"
    if graph_state.route == "MIXED":
        return "FILTERED_SET"
    return "UNKNOWN"


def build_entity_scope_value(
    graph_state: GraphState,
    *,
    meaningful_entity_terms: list[str],
    meaningful_customer_terms: list[str],
    meaningful_partner_terms: list[str],
) -> dict[str, list[str]]:
    return {
        "exactCodes": list(graph_state.entityScope.exactCodes),
        "customerTerms": meaningful_customer_terms,
        "partnerTerms": meaningful_partner_terms,
        "entityTerms": meaningful_entity_terms,
    }


def should_require_entity_scope(graph_state: GraphState) -> bool:
    return bool(graph_state.intent in SINGLE_ENTITY_DOCUMENT_INTENTS and graph_state.populationScope != "ALL")


def build_time_slot(*, graph_state: GraphState, query: str) -> GraphSlotEntry:
    if graph_state.explicitStartAt or graph_state.explicitEndAt:
        return GraphSlotEntry(
            value={
                "label": graph_state.timeRange.label,
                "startAt": graph_state.timeRange.startAt,
                "endAt": graph_state.timeRange.endAt,
            },
            status="EXPLICIT",
            priority="OPTIONAL",
            source="request_time_range",
        )

    if graph_state.timeRange.startAt or graph_state.timeRange.endAt or graph_state.timeRange.label:
        return GraphSlotEntry(
            value={
                "label": graph_state.timeRange.label,
                "startAt": graph_state.timeRange.startAt,
                "endAt": graph_state.timeRange.endAt,
            },
            status="INFERRED",
            priority="OPTIONAL",
            source="query_time_parser",
        )

    if has_recent_expression(query):
        return GraphSlotEntry(
            value=None,
            status="OPTIONAL_EMPTY",
            priority="DEFAULTABLE",
            source="relative_time_expression",
        )

    return GraphSlotEntry(
        value=None,
        status="OPTIONAL_EMPTY",
        priority="OPTIONAL",
        source=None,
    )


def build_metric_slot(graph_state: GraphState) -> GraphSlotEntry:
    if graph_state.intent not in RANK_INTENTS:
        return GraphSlotEntry(
            value=graph_state.aggregation.metric,
            status="OPTIONAL_EMPTY" if not graph_state.aggregation.metric else "INFERRED",
            priority="OPTIONAL",
            source="aggregation_parser" if graph_state.aggregation.metric else None,
        )

    if graph_state.aggregation.metric:
        return GraphSlotEntry(
            value=graph_state.aggregation.metric,
            status="INFERRED",
            priority="REQUIRED",
            source="aggregation_parser",
        )

    return GraphSlotEntry(
        value=None,
        status="MISSING_REQUIRED",
        priority="REQUIRED",
        source="rank_metric_policy",
    )


def has_recent_expression(query: str) -> bool:
    compact = query.replace(" ", "")
    return any(term in query or term.replace(" ", "") in compact for term in RECENT_EXPRESSIONS)


def extract_meaningful_entity_terms(entity_terms: list[str]) -> list[str]:
    filtered: list[str] = []
    for term in entity_terms:
        normalized = term.strip()
        if not normalized:
            continue
        if normalized in NON_ENTITY_TERMS:
            continue
        if normalized.lower() in NON_ENTITY_TERMS:
            continue
        if normalized.upper() in {"PRB", "RFP"}:
            continue
        filtered.append(normalized)
    return filtered


def build_recent_default_range(*, today: date, days: int) -> GraphTimeRange:
    start_date = today - timedelta(days=max(days - 1, 0))
    start_at = datetime.combine(start_date, time.min, tzinfo=KST).isoformat()
    end_at = datetime.combine(today, time.max.replace(microsecond=0), tzinfo=KST).isoformat()
    return GraphTimeRange(
        label=f"최근 {days}일",
        startAt=start_at,
        endAt=end_at,
    )
