# 인수인계 메모: 챗봇 내부 모델 계층입니다. 의도, 검색 계획, 정규화 결과, 사용자 컨텍스트 같은 중간 상태를 정의합니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
