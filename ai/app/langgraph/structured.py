from dataclasses import dataclass, field
from typing import Literal

import psycopg

from app.embeddings.model import EmbeddingModel
from app.langgraph.state import GraphState
from app.models.intent import StructuredQueryIntent
from app.models.normalization import QueryNormalization
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

    if should_try_targeted_domain(graph_state=graph_state, first_tool=first_tool):
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
                )
            except psycopg.Error:
                response = None
            if response is not None:
                return response

    return None


def should_try_targeted_domain(*, graph_state: GraphState, first_tool: str | None) -> bool:
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
