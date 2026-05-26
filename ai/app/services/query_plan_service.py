# 인수인계: GMS LLM에게 정형 조회 계획을 요청하고, 실패 시 안전한 fallback을 돌려주는 planner 서비스입니다.
# 핵심 흐름: LLM이 만든 JSON을 그대로 믿지 않고 허용된 필드/값만 모델로 검증하는 역할입니다.
# 같이 확인: planner prompt는 llm/gms_client.py, 결과 모델은 models/query_plan.py와 연결됩니다.
from typing import Any

from app.core.config import settings
from app.llm.gms_client import GmsChatClient, GmsChatConfig
from app.models.intent import StructuredQueryIntent
from app.models.constants import SourceType
from app.models.query_plan import QueryPlan

S = SourceType


ALLOWED_STATUSES = {"수주", "발굴", "입찰", "경쟁중", "제안"}
ALLOWED_CONDITIONS = {"difficult_to_win"}
EVIDENCE_SOURCE_EXPANSIONS: dict[str, list[str]] = {
    "OPPORTUNITY": [S.PROJECT_OPPORTUNITY],
    S.PROJECT_OPPORTUNITY: [S.PROJECT_OPPORTUNITY],
    S.SALES_ACTIVITY: [S.SALES_ACTIVITY, S.POST_SALES],
    S.POST_SALES: [S.POST_SALES, S.SALES_ACTIVITY],
    S.PRB: [S.PRB],
    S.PRB_RESULT: [S.PRB_RESULT, S.PRB],
    S.BID_RESULT: [S.BID_RESULT, S.LOST],
    "RFP_ANALYSIS": [S.RFP_ANALYSIS, S.RFP],
    S.RFP_ANALYSIS: [S.RFP_ANALYSIS, S.RFP],
    S.RFP: [S.RFP, S.RFP_ANALYSIS],
    "WON_REPORT": [S.WON, S.ORDER_REPORT],
    S.WON: [S.WON, S.ORDER_REPORT],
    S.ORDER_REPORT: [S.ORDER_REPORT, S.WON],
    S.LOST: [S.LOST, S.BID_RESULT],
    S.CONTRACT: [S.CONTRACT],
    S.ATTACHMENT: [S.ATTACHMENT],
}
ALLOWED_EVIDENCE_SOURCES = set(EVIDENCE_SOURCE_EXPANSIONS)
ALLOWED_FILTER_KEYS = {"customer_group", "customer_type", "business_type"}

METRIC_LABELS = {
    "estimated_profit": "추정 영업이익",
    "estimated_profit_rate": "추정 이익률",
    "expected_win_rate": "예상 수주율",
    "estimated_revenue": "추정 매출액",
    "expected_amount": "예상 사업비",
    "contract_amount": "계약 금액",
}

METRIC_SOURCE_TYPES = {
    "estimated_profit": [S.PRB],
    "estimated_profit_rate": [S.PRB],
    "expected_win_rate": [S.PRB],
    "estimated_revenue": [S.PRB],
    "expected_amount": [S.PROJECT_OPPORTUNITY],
    "contract_amount": [S.WON, S.ORDER_REPORT, S.CONTRACT],
}

DIFFICULTY_LABELS = {
    "risk_severity": ("high_risk", "리스크가 큰"),
    "expected_win_rate": ("low_win_rate", "예상 수주율이 낮은"),
    "competition_strength": ("high_competition", "경쟁사 우위가 큰"),
}


def plan_structured_query_with_gms(query: str) -> StructuredQueryIntent | None:
    if not settings.gms_key or not should_request_query_plan(query):
        return None

    client = GmsChatClient(
        GmsChatConfig(
            api_key=settings.gms_key,
            url=settings.gms_chat_completions_url,
            model=settings.gms_chat_model,
            timeout_seconds=settings.gms_timeout_seconds,
        )
    )

    try:
        raw_plan = client.create_query_plan(query=query)
        plan = validate_query_plan(raw_plan)
    except RuntimeError:
        return None

    return convert_plan_to_intent(plan)


def should_request_query_plan(query: str) -> bool:
    normalized = " ".join(query.lower().split())
    complex_condition_keywords = [
        "수주가 어려웠",
        "수주 어려웠",
        "어렵게 수주",
        "수주 난이도",
        "힘들게 수주",
        "중에서",
        "조건",
    ]
    ranking_keywords = [
        "가장",
        "제일",
        "최고",
        "최대",
        "상위",
        "top",
        "순위",
        "우수",
        "좋은",
        "유망",
    ]
    opportunity_keywords = [
        "사업",
        "영업기회",
        "기회",
        "opportunity",
    ]
    rank_or_explain_keywords = [
        "리스크",
        "위험",
        "문제",
        "수주율",
        "경쟁",
        "경쟁사",
        "우위",
        "불리",
        "큰",
        "낮은",
        "높은",
    ]
    action_keywords = [
        "보여줘",
        "알려줘",
        "찾아줘",
        "뭐",
        "어떤",
    ]
    return (
        (
            any(keyword in normalized for keyword in complex_condition_keywords)
            and any(keyword in normalized for keyword in rank_or_explain_keywords)
            and any(keyword in normalized for keyword in action_keywords)
        )
        or (
            any(keyword in normalized for keyword in ranking_keywords)
            and any(keyword in normalized for keyword in opportunity_keywords)
        )
    )


def validate_query_plan(raw: dict[str, Any]) -> QueryPlan:
    task = first_pipe_value(raw.get("task") or "semantic_search")
    if task not in {"rank_metric", "list_by_status", "rank_and_explain", "needs_clarification", "semantic_search"}:
        task = "semantic_search"

    target = first_pipe_value(raw.get("target") or "opportunity")
    if target != "opportunity":
        target = "opportunity"

    population_status = [
        status
        for status in normalize_choice_list(raw.get("population_status"))
        if status in ALLOWED_STATUSES
    ]
    conditions = [
        condition
        for condition in normalize_choice_list(raw.get("conditions"))
        if condition in ALLOWED_CONDITIONS
    ]
    evidence_sources = [
        source
        for source in normalize_choice_list(raw.get("evidence_sources"))
        if source in ALLOWED_EVIDENCE_SOURCES
    ]
    filters = validate_filters(raw.get("filters"))

    rank_by = raw.get("rank_by")
    if rank_by is not None:
        rank_by = first_pipe_value(rank_by)
    if rank_by not in {
        "estimated_profit",
        "estimated_profit_rate",
        "expected_win_rate",
        "estimated_revenue",
        "expected_amount",
        "contract_amount",
        "risk_severity",
        "competition_strength",
    }:
        rank_by = None

    sort_direction = first_pipe_value(raw.get("sort_direction") or "desc")
    if sort_direction not in {"asc", "desc"}:
        sort_direction = "desc"

    return QueryPlan(
        task=task,
        target=target,
        population_status=population_status,
        conditions=conditions,
        filters=filters,
        rank_by=rank_by,
        sort_direction=sort_direction,
        limit=coerce_limit(raw.get("limit")),
        evidence_sources=evidence_sources,
        missing_fields=[
            field_name
            for field_name in normalize_choice_list(raw.get("missing_fields"))
            if field_name in {"rank_by", "population_status", "filters"}
        ],
        clarification_message=coerce_optional_text(raw.get("clarification_message")),
        confidence=coerce_confidence(raw.get("confidence")),
    )


def convert_plan_to_intent(plan: QueryPlan) -> StructuredQueryIntent | None:
    if plan.task == "semantic_search":
        return None

    if plan.task == "needs_clarification":
        return StructuredQueryIntent(
            intent_type="clarification",
            missing_fields=plan.missing_fields,
            clarification_message=plan.clarification_message
            or (
                "질문을 처리하려면 비교 기준이 필요합니다. "
                "예: 추정 영업이익, 추정 이익률, 예상 수주율, 추정 매출액, 예상 사업비, 계약 금액."
            ),
        )

    status_label = "/".join(plan.population_status) if plan.population_status else None

    if plan.task == "rank_metric" and plan.rank_by in METRIC_LABELS:
        return StructuredQueryIntent(
            intent_type="metric_rank",
            metric_key=plan.rank_by,
            metric_label=METRIC_LABELS[plan.rank_by],
            sort_direction=plan.sort_direction,
            status_filters=plan.population_status,
            status_label=status_label,
            source_types=pick_source_types(plan.evidence_sources, METRIC_SOURCE_TYPES[plan.rank_by]),
            filters=plan.filters,
        )

    if plan.task == "list_by_status" and plan.population_status:
        return StructuredQueryIntent(
            intent_type="status_list",
            status_filters=plan.population_status,
            status_label=status_label,
            source_types=pick_source_types(plan.evidence_sources, [S.PROJECT_OPPORTUNITY]),
            filters=plan.filters,
        )

    if plan.task == "rank_and_explain":
        difficulty_key = plan.rank_by
        if difficulty_key not in DIFFICULTY_LABELS:
            return None
        reason, label = DIFFICULTY_LABELS[difficulty_key]
        status_filters = plan.population_status or (["수주"] if "difficult_to_win" in plan.conditions else [])
        return StructuredQueryIntent(
            intent_type="difficult_win_list",
            difficulty_reason=reason,
            metric_label=label,
            sort_direction=plan.sort_direction,
            status_filters=status_filters,
            status_label="/".join(status_filters) if status_filters else None,
            source_types=pick_source_types(
                plan.evidence_sources,
                [S.PRB, S.PRB_RESULT, S.BID_RESULT, S.LOST, S.RFP, S.RFP_ANALYSIS, S.PROJECT_OPPORTUNITY],
            ),
            filters=plan.filters,
        )

    return None


def pick_source_types(planned_sources: list[str], defaults: list[str]) -> list[str]:
    candidate_sources = planned_sources or defaults
    expanded: list[str] = []
    for source in candidate_sources:
        for canonical in EVIDENCE_SOURCE_EXPANSIONS.get(source, [source]):
            if canonical not in expanded:
                expanded.append(canonical)
    return expanded


def validate_filters(raw_filters: Any) -> dict[str, list[str]]:
    if not isinstance(raw_filters, dict):
        return {}

    filters: dict[str, list[str]] = {}
    for key, value in raw_filters.items():
        normalized_key = str(key).strip()
        if normalized_key not in ALLOWED_FILTER_KEYS:
            continue

        values = [
            item
            for item in normalize_choice_list(value)
            if item and item not in {"전체", "all", "ALL", "*"}
        ]
        if values:
            filters[normalized_key] = list(dict.fromkeys(values))
    return filters


def normalize_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def normalize_choice_list(value: Any) -> list[str]:
    choices: list[str] = []
    for item in normalize_list(value):
        choices.extend(split_pipe_values(item))
    return choices


def first_pipe_value(value: Any) -> str:
    values = split_pipe_values(value)
    if not values:
        return ""
    return values[0]


def coerce_optional_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def split_pipe_values(value: Any) -> list[str]:
    return [part.strip() for part in str(value).split("|") if part.strip()]


def coerce_limit(value: Any) -> int:
    try:
        limit = int(value)
    except (TypeError, ValueError):
        return 5
    return min(max(limit, 1), 10)


def coerce_confidence(value: Any) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0
    return min(max(confidence, 0.0), 1.0)
