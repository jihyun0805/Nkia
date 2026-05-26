# 인수인계 메모: 챗봇 내부 모델 계층입니다. 의도, 검색 계획, 정규화 결과, 사용자 컨텍스트 같은 중간 상태를 정의합니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from dataclasses import dataclass, field


@dataclass(frozen=True)
class TimeRange:
    label: str | None = None
    start_at: str | None = None
    end_at: str | None = None


@dataclass(frozen=True)
class QueryNormalization:
    original_query: str
    normalized_query: str
    target_hint: str = "general"
    source_type_hints: list[str] = field(default_factory=list)
    entity_terms: list[str] = field(default_factory=list)
    scope_terms: list[str] = field(default_factory=list)
    requested_limit: int | None = None
    time_range: TimeRange = field(default_factory=TimeRange)
    has_ranking_intent: bool = False
    has_metric_hint: bool = False
    has_timeline_intent: bool = False
    has_summary_intent: bool = False
    # Nkia 도메인 분류: 자연어 segment / 표준 사업 구분 / 제안 형태
    customer_segment_label: str | None = None
    customer_name_keywords: list[str] = field(default_factory=list)
    business_type_filters: list[str] = field(default_factory=list)
    proposal_type_filters: list[str] = field(default_factory=list)
    list_opportunity_intent: bool = False
