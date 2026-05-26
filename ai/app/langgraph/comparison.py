# 인수인계: 두 대상 비교 질문에서 비교쌍, 기간, 지표를 추출하는 LangGraph 보조 로직입니다.
# 핵심 흐름: comparison 노드가 실행될지 결정하는 preflight 힌트를 만듭니다.
# 같이 확인: 실제 비교 계산은 services/comparison_executor.py가 담당합니다.
import re
from dataclasses import dataclass, field

from app.langgraph.state import GraphState
from app.models.normalization import QueryNormalization
from app.services.metric_registry import resolve_metric_spec


@dataclass(frozen=True)
class ComparisonDeltaPlan:
    comparison_pairs: list[str] = field(default_factory=list)
    comparison_metric: str | None = None
    delta_mode: str | None = None
    delta_windows: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)


VS_PATTERNS = (
    re.compile(r"(.+?)\s+vs\s+(.+)", re.IGNORECASE),
    re.compile(r"(.+?)와\s+(.+?)\s+중"),
    re.compile(r"(.+?)과\s+(.+?)\s+중"),
    # "X하고 Y 비교" / "X하고 Y 사업 비교"
    re.compile(r"(.+?)하고\s+(.+?)(?:\s+사업)?\s+비교"),
    re.compile(r"(.+?)랑\s+(.+?)(?:\s+사업)?\s+비교"),
    re.compile(r"(.+?)이랑\s+(.+?)(?:\s+사업)?\s+비교"),
    # "X와 Y 비교" / "X과 Y 비교"
    re.compile(r"(.+?)와\s+(.+?)\s+비교"),
    re.compile(r"(.+?)과\s+(.+?)\s+비교"),
    # "X 사업이 Y 사업보다" — "큰가/높은가/많은가" 등
    re.compile(r"(.+?)\s+사업이\s+(.+?)\s+사업보다"),
)
GENERIC_COMPARISON_TERMS = {
    "내가",
    "올린",
    "파일",
    "첨부",
    "첨부파일",
    "업로드",
    "기준",
    "비교",
    "보고",
    "문서",
    "기준으로",
    "비교해줘",
}


def build_comparison_delta_plan(
    *,
    query: str,
    normalization: QueryNormalization,
    graph_state: GraphState,
) -> ComparisonDeltaPlan:
    comparison_pairs = detect_comparison_pairs(query=query, normalization=normalization)
    delta_mode, delta_windows = detect_delta_windows(query=query)
    reasons: list[str] = []
    if comparison_pairs:
        reasons.append("comparison_query")
    if delta_mode:
        reasons.append("delta_query")
    metric = infer_comparison_metric(query=query, graph_state=graph_state)
    if metric:
        reasons.append("comparison_metric")
    return ComparisonDeltaPlan(
        comparison_pairs=comparison_pairs[:2],
        comparison_metric=metric,
        delta_mode=delta_mode,
        delta_windows=delta_windows[:2],
        reasons=reasons,
    )


def detect_comparison_pairs(*, query: str, normalization: QueryNormalization) -> list[str]:
    stripped = " ".join(query.split())
    for pattern in VS_PATTERNS:
        match = pattern.search(stripped)
        if not match:
            continue
        left = sanitize_entity_phrase(match.group(1))
        right = sanitize_entity_phrase(match.group(2))
        pairs = [term for term in [left, right] if term]
        if len(pairs) >= 2:
            return dedupe_keep_order(pairs)

    if "비교" in query:
        candidates = [term for term in normalization.entity_terms if is_meaningful_comparison_term(term)]
        if len(candidates) >= 2:
            return dedupe_keep_order(candidates[:2])
    return []


def detect_delta_windows(*, query: str) -> tuple[str | None, list[str]]:
    compact = query.replace(" ", "")
    if "지난달대비이번달" in compact or ("지난달" in query and "이번 달" in query and "대비" in query):
        return "period_over_period", ["previous_month", "current_month"]
    if "전월대비" in compact:
        return "period_over_period", ["previous_month", "current_month"]
    if "작년대비올해" in compact or ("작년" in query and "올해" in query and "대비" in query):
        return "year_over_year", ["previous_year", "current_year"]
    if "상반기와하반기" in compact or ("상반기" in query and "하반기" in query and any(k in query for k in ("와", "비교", "대비"))):
        return "half_over_half", ["first_half", "second_half"]
    if any(keyword in query for keyword in ("증가", "감소", "늘었", "줄었")) and "대비" in query:
        return "period_over_period", ["previous_period", "current_period"]
    return None, []


def infer_comparison_metric(*, query: str, graph_state: GraphState) -> str | None:
    if graph_state.aggregation.metric:
        return graph_state.aggregation.metric
    metric_spec = resolve_metric_spec(query)
    if metric_spec is not None:
        return metric_spec.metric_key
    normalized = " ".join(query.lower().split())
    if any(keyword in normalized for keyword in ("수익성", "이익률", "수익률")):
        return "estimated_profit_rate"
    if any(keyword in normalized for keyword in ("영업이익", "이익")):
        return "estimated_profit"
    if any(keyword in normalized for keyword in ("수주 실적", "수주 금액", "계약 금액", "매출")):
        return "won_amount"
    if any(keyword in normalized for keyword in ("활동 수", "활동 건수", "활동이 많")):
        return "activity_count"
    if any(keyword in normalized for keyword in ("고객지원", "지원 건수")):
        return "customer_support_count"
    return None


def sanitize_entity_phrase(text: str) -> str:
    cleaned = text.strip()
    for suffix in ("중 어디", "어디가", "비교", "대비", "중", "사업", "사업의", "건", "관련"):
        if cleaned.endswith(suffix):
            cleaned = cleaned[: -len(suffix)].strip()
    # 한국어 조사 제거 (and, with, comparison context)
    for suffix in ("하고", "랑", "이랑", "와", "과", "이", "가", "은", "는", "을", "를", "의"):
        if cleaned.endswith(suffix) and len(cleaned) > len(suffix) + 1:
            cleaned = cleaned[: -len(suffix)].strip()
    return cleaned


def dedupe_keep_order(values: list[str]) -> list[str]:
    deduped: list[str] = []
    for value in values:
        if value and value not in deduped:
            deduped.append(value)
    return deduped


def is_meaningful_comparison_term(term: str) -> bool:
    if term in GENERIC_COMPARISON_TERMS:
        return False
    if any(token in term for token in ("비교", "기준", "파일", "첨부", "업로드")):
        return False
    return True
