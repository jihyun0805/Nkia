# 인수인계: 질문 정규화 결과 모델입니다.
# 핵심 흐름: 코드, 기간, 고객/사업명 후보, 요청 limit 등 검색 전 힌트를 담습니다.
# 같이 확인: 필드 추가 시 search_service와 structured_answer_service 소비부를 같이 수정하세요.
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
