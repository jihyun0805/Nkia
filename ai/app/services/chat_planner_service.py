from app.core.config import settings
from app.llm.gms_client import GmsChatClient, GmsChatConfig
from app.models.chat_plan import ChatQueryPlan
from app.models.constants import SourceType
from app.models.normalization import QueryNormalization
from app.services.query_normalization_service import normalize_query_context, summarize_normalization


ALLOWED_TASKS = {
    "semantic_search",
    "timeline_lookup",
    "maintenance_lookup",
    "summarize_period",
    "needs_clarification",
}
ALLOWED_TARGETS = {
    "general",
    "document",
    "activity",
    "maintenance",
    "contract",
    "project",
    "opportunity",
    "user",
    "customer",
}
ALLOWED_ANSWER_STYLES = {"direct_answer", "timeline", "bullet_summary", "ranked_list"}
ALLOWED_SOURCE_TYPES = set(SourceType.all_known())


def plan_chat_query(query: str, normalization: QueryNormalization | None = None) -> tuple[ChatQueryPlan, QueryNormalization]:
    normalization = normalization or normalize_query_context(query)
    heuristic_plan = build_heuristic_plan(query=query, normalization=normalization)
    if should_use_heuristic_first(normalization=normalization, heuristic_plan=heuristic_plan):
        return heuristic_plan, normalization
    if settings.gms_key:
        plan = plan_chat_query_with_gms(query=query, normalization=normalization)
        if plan is not None:
            return plan, normalization
    return heuristic_plan, normalization


def should_use_heuristic_first(*, normalization: QueryNormalization, heuristic_plan: ChatQueryPlan) -> bool:
    if heuristic_plan.task == "needs_clarification":
        return True
    if normalization.has_timeline_intent:
        return True
    if normalization.has_summary_intent and normalization.time_range.label:
        return True
    if normalization.has_ranking_intent and not normalization.has_metric_hint:
        return True
    return False


def plan_chat_query_with_gms(*, query: str, normalization: QueryNormalization) -> ChatQueryPlan | None:
    client = GmsChatClient(
        GmsChatConfig(
            api_key=settings.gms_key or "",
            url=settings.gms_chat_completions_url,
            model=settings.gms_chat_model,
            timeout_seconds=settings.gms_timeout_seconds,
        )
    )
    try:
        raw = client.create_chat_plan(query=query, normalization_summary=summarize_normalization(normalization))
    except RuntimeError:
        return None
    return validate_chat_plan(raw=raw, normalization=normalization)


def validate_chat_plan(*, raw: dict, normalization: QueryNormalization) -> ChatQueryPlan:
    task = first_text(raw.get("task")) or "semantic_search"
    if task not in ALLOWED_TASKS:
        task = "semantic_search"

    target = first_text(raw.get("target")) or normalization.target_hint
    if target not in ALLOWED_TARGETS:
        target = normalization.target_hint if normalization.target_hint in ALLOWED_TARGETS else "general"

    source_types = [value for value in normalize_list(raw.get("source_types")) if value in ALLOWED_SOURCE_TYPES]
    if not source_types:
        source_types = normalization.source_type_hints

    answer_style = first_text(raw.get("answer_style")) or infer_answer_style(task=task, normalization=normalization)
    if answer_style not in ALLOWED_ANSWER_STYLES:
        answer_style = infer_answer_style(task=task, normalization=normalization)

    return ChatQueryPlan(
        task=task,
        target=target,
        source_types=source_types,
        filters=normalize_filters(raw.get("filters")),
        time_label=first_text(raw.get("time_label")) or normalization.time_range.label,
        time_from=first_text(raw.get("time_from")) or normalization.time_range.start_at,
        time_to=first_text(raw.get("time_to")) or normalization.time_range.end_at,
        rewritten_query=first_text(raw.get("rewritten_query")),
        answer_style=answer_style,
        missing_fields=normalize_list(raw.get("missing_fields")),
        clarification_message=first_text(raw.get("clarification_message")),
        confidence=coerce_confidence(raw.get("confidence")),
    )


def build_heuristic_plan(*, query: str, normalization: QueryNormalization) -> ChatQueryPlan:
    if normalization.has_ranking_intent and not normalization.has_metric_hint:
        return ChatQueryPlan(
            task="needs_clarification",
            target=normalization.target_hint,
            source_types=normalization.source_type_hints,
            time_label=normalization.time_range.label,
            time_from=normalization.time_range.start_at,
            time_to=normalization.time_range.end_at,
            answer_style="ranked_list",
            missing_fields=["rank_by"],
            clarification_message=(
                "순위를 정하려면 비교 기준이 필요합니다. 예: 횟수, 금액, 최근성, 예상 수주율, 유지보수 건수, 계약 금액."
            ),
            confidence=0.62,
        )

    if normalization.has_timeline_intent:
        task = "maintenance_lookup" if normalization.target_hint == "maintenance" else "timeline_lookup"
        return ChatQueryPlan(
            task=task,
            target=normalization.target_hint,
            source_types=normalization.source_type_hints,
            time_label=normalization.time_range.label,
            time_from=normalization.time_range.start_at,
            time_to=normalization.time_range.end_at,
            rewritten_query=query,
            answer_style="timeline",
            confidence=0.68,
        )

    if normalization.has_summary_intent and normalization.time_range.label:
        return ChatQueryPlan(
            task="summarize_period",
            target=normalization.target_hint,
            source_types=normalization.source_type_hints,
            time_label=normalization.time_range.label,
            time_from=normalization.time_range.start_at,
            time_to=normalization.time_range.end_at,
            rewritten_query=query,
            answer_style="bullet_summary",
            confidence=0.66,
        )

    return ChatQueryPlan(
        task="semantic_search",
        target=normalization.target_hint,
        source_types=normalization.source_type_hints,
        time_label=normalization.time_range.label,
        time_from=normalization.time_range.start_at,
        time_to=normalization.time_range.end_at,
        rewritten_query=query,
        answer_style="direct_answer",
        confidence=0.55,
    )


def infer_answer_style(*, task: str, normalization: QueryNormalization) -> str:
    if task in {"timeline_lookup", "maintenance_lookup"} or normalization.has_timeline_intent:
        return "timeline"
    if task == "summarize_period" or normalization.has_summary_intent:
        return "bullet_summary"
    return "direct_answer"


def normalize_list(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        values = value
    else:
        values = [value]
    return [str(item).strip() for item in values if str(item).strip()]


def normalize_filters(value: object) -> dict[str, list[str]]:
    if not isinstance(value, dict):
        return {}
    filters: dict[str, list[str]] = {}
    for key, raw_values in value.items():
        normalized_values = normalize_list(raw_values)
        if normalized_values:
            filters[str(key).strip()] = normalized_values
    return filters


def first_text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def coerce_confidence(value: object) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(confidence, 1.0))
