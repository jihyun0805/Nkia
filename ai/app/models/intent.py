# 인수인계: 질문 의도 분류에 쓰는 내부 타입입니다.
# 핵심 흐름: 정형 조회, 추천, 비교, 초안 작성 같은 큰 분기 기준을 표현합니다.
# 같이 확인: LangGraph preflight와 query_intent_service가 같은 값을 사용해야 합니다.
from dataclasses import dataclass, field
from typing import Literal


MetricKey = str

DifficultyReason = Literal["high_risk", "low_win_rate", "high_competition"]

IntentType = Literal["metric_rank", "status_list", "difficult_win_list", "clarification", "period_summary", "count_rank", "aggregate_total", "document_recency_rank"]
SortDirection = Literal["desc", "asc"]
SummaryDomain = Literal["won", "maintenance", "activity", "project"]
CountDomain = Literal["maintenance_activity", "sales_activity", "customer_support"]


@dataclass(frozen=True)
class StructuredQueryIntent:
    intent_type: IntentType
    metric_key: MetricKey | None = None
    metric_label: str | None = None
    rank_position: int = 1
    result_count: int = 1
    difficulty_reason: DifficultyReason | None = None
    sort_direction: SortDirection = "desc"
    status_filters: list[str] = field(default_factory=list)
    status_label: str | None = None
    source_types: list[str] = field(default_factory=list)
    filters: dict[str, list[str]] = field(default_factory=dict)
    summary_domain: SummaryDomain | None = None
    count_domain: CountDomain | None = None
    time_from: str | None = None
    time_to: str | None = None
    time_label: str | None = None
    contract_type: str | None = None
    document_scope: str | None = None
    recency_basis: str | None = None
    missing_fields: list[str] = field(default_factory=list)
    clarification_message: str | None = None
