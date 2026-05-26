# 인수인계: 정형 조회 실행 계획을 구성하는 LangGraph 보조 로직입니다.
# 핵심 흐름: 질문이 DB fast path로 답할 수 있는지 판단하고 tool/intent step을 만듭니다.
# 같이 확인: 실제 답변 생성은 services/structured_answer_service.py에서 수행합니다.
from dataclasses import dataclass, field
from typing import Literal

import psycopg

from app.embeddings.model import EmbeddingModel
from app.langgraph.state import GraphState
from app.models.intent import StructuredQueryIntent
from app.models.normalization import QueryNormalization
from app.models.user_context import UserContext
from app.schemas.answer import AnswerResponse
from app.services.query_intent_service import parse_structured_query_intent
from app.services.structured_answer_service import answer_structured_query, answer_targeted_domain_query


StructuredExecutionStrategy = Literal["targeted_domain", "structured_intent"]


@dataclass(frozen=True)
class StructuredExecutionStep:
    strategy: StructuredExecutionStrategy
    tool_name: str


@dataclass(frozen=True)
class StructuredExecutionPlan:
    route: str
    steps: list[StructuredExecutionStep] = field(default_factory=list)
    structured_intent: StructuredQueryIntent | None = None

    @property
    def is_empty(self) -> bool:
        return not self.steps


def build_structured_execution_plan(
    *,
    query: str,
    normalization: QueryNormalization,
    graph_state: GraphState,
) -> StructuredExecutionPlan:
    steps: list[StructuredExecutionStep] = []
    structured_intent = parse_structured_query_intent(query, normalization)
    first_tool = graph_state.toolPlan[0] if graph_state.toolPlan else None

    if should_try_targeted_domain(
        graph_state=graph_state,
        first_tool=first_tool,
        normalization=normalization,
    ):
        steps.append(
            StructuredExecutionStep(
                strategy="targeted_domain",
                tool_name=first_tool or "get_graph_snapshot",
            )
        )

    if structured_intent is not None:
        steps.append(
            StructuredExecutionStep(
                strategy="structured_intent",
                tool_name=map_intent_to_tool_name(structured_intent),
            )
        )

    return StructuredExecutionPlan(
        route=graph_state.route,
        steps=deduplicate_steps(steps),
        structured_intent=structured_intent,
    )


def execute_structured_execution_plan(
    *,
    plan: StructuredExecutionPlan,
    query: str,
    normalization: QueryNormalization,
    graph_state: GraphState,
    limit: int,
    start_at: str | None,
    end_at: str | None,
    embedder: EmbeddingModel,
    user_context: UserContext | None = None,
) -> AnswerResponse | None:
    if plan.is_empty:
        return None

    for step in plan.steps:
        if step.strategy == "targeted_domain":
            try:
                response = answer_targeted_domain_query(
                    query=query,
                    normalization=normalization,
                    graph_state=graph_state,
                    limit=limit,
                    start_at=start_at,
                    end_at=end_at,
                    embedder=embedder,
                    user_context=user_context,
                )
            except psycopg.Error:
                response = None
            if response is not None:
                return response

        if step.strategy == "structured_intent" and plan.structured_intent is not None:
            try:
                response = answer_structured_query(
                    query=query,
                    intent=plan.structured_intent,
                    limit=limit,
                    embedder=embedder,
                    user_context=user_context,
                )
            except psycopg.Error:
                response = None
            if response is not None:
                return response

    return None


def should_try_targeted_domain(
    *,
    graph_state: GraphState,
    first_tool: str | None,
    normalization: QueryNormalization,
) -> bool:
    if graph_state.route == "FAST_STRUCTURED" and first_tool in {
        "get_opportunity_snapshot",
        "get_contract_snapshot",
        "get_project_snapshot",
        "get_maintenance_snapshot",
        "get_workflow_snapshot",
        "get_customer_support_timeline",
        "get_sales_activity_timeline",
        "get_graph_snapshot",
    }:
        return True

    if graph_state.route == "MIXED" and first_tool in {
        "get_graph_snapshot",
        "retrieve_reason_evidence",
        "retrieve_decision_evidence",
        "get_maintenance_quote_detail",
        "get_project_snapshot",
        "get_contract_snapshot",
        "get_opportunity_snapshot",
        "get_workflow_snapshot",
    }:
        return True

    if graph_state.route in {"FAST_STRUCTURED", "MIXED", "DISCOVERY"} and normalization.target_hint in {
        "activity",
        "document",
        "opportunity",
        "maintenance",
        "contract",
        "project",
    }:
        return True

    # billing 도메인은 target_hint 가 없을 수 있어 키워드 fallback
    normalized = normalization.normalized_query if normalization is not None else ""
    if any(kw in normalized for kw in (
        "청구", "수금", "미수금", "세금계산서", "발행 금액", "발행금액",
        "결재 안 된 청구", "결재안 된 청구", "결재 안된 청구",
    )):
        return True

    # 사람 메타도 target_hint 없는 경우 — billing 동일 fallback
    if any(kw in normalized for kw in ("담당자", "영업대표", "참석자", "참가자", "pm 누구", "결재선", "결재자")):
        return True

    # 위험요인/리스크/이슈 — focus=RISK 가 감지되었지만 target_hint=general 인 경우 fallback
    if getattr(graph_state, "focus", None) == "RISK":
        return True
    if any(kw in normalized for kw in ("위험요인", "리스크", "이슈 ", " 이슈", "장애 원인", "사고 원인", "고객 불만")):
        return True

    return False


def map_intent_to_tool_name(intent: StructuredQueryIntent) -> str:
    if intent.intent_type == "metric_rank":
        return "get_rank"
    if intent.intent_type == "status_list":
        return "get_status_list"
    if intent.intent_type == "count_rank":
        return "get_rank"
    if intent.intent_type == "period_summary":
        return "get_period_summary"
    if intent.intent_type == "document_recency_rank":
        return "get_recent_documents"
    if intent.intent_type == "difficult_win_list":
        return "get_difficult_win_list"
    if intent.intent_type == "clarification":
        return "clarification_guard"
    return "structured_intent"


def deduplicate_steps(steps: list[StructuredExecutionStep]) -> list[StructuredExecutionStep]:
    deduped: list[StructuredExecutionStep] = []
    seen: set[tuple[str, str]] = set()
    for step in steps:
        key = (step.strategy, step.tool_name)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(step)
    return deduped
