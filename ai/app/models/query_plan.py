# 인수인계 메모: 챗봇 내부 모델 계층입니다. 의도, 검색 계획, 정규화 결과, 사용자 컨텍스트 같은 중간 상태를 정의합니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from dataclasses import dataclass, field
from typing import Literal


PlanTask = Literal["rank_metric", "list_by_status", "rank_and_explain", "needs_clarification", "semantic_search"]
PlanTarget = Literal["opportunity"]
PlanRankBy = Literal[
    "estimated_profit",
    "estimated_profit_rate",
    "expected_win_rate",
    "estimated_revenue",
    "expected_amount",
    "contract_amount",
    "risk_severity",
    "competition_strength",
]
PlanSortDirection = Literal["asc", "desc"]


@dataclass(frozen=True)
class QueryPlan:
    task: PlanTask
    target: PlanTarget = "opportunity"
    population_status: list[str] = field(default_factory=list)
    conditions: list[str] = field(default_factory=list)
    filters: dict[str, list[str]] = field(default_factory=dict)
    rank_by: PlanRankBy | None = None
    sort_direction: PlanSortDirection = "desc"
    limit: int = 5
    evidence_sources: list[str] = field(default_factory=list)
    missing_fields: list[str] = field(default_factory=list)
    clarification_message: str | None = None
    confidence: float = 0.0
