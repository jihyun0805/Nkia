# 인수인계: 정형 query planner 결과 모델입니다.
# 핵심 흐름: LLM이 반환한 JSON 계획을 검증하고 실행 가능한 값만 보존합니다.
# 같이 확인: GMS prompt 변경 시 허용 enum과 기본값도 함께 맞추세요.
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
