from dataclasses import dataclass, field

from app.embeddings.model import EmbeddingModel
from app.langgraph.state import GraphState
from app.schemas.answer import AnswerResponse
from app.services.discovery_summary_service import answer_discovery_summary_query


@dataclass(frozen=True)
class DiscoveryExecutionStep:
    tool_name: str


@dataclass(frozen=True)
class DiscoveryExecutionPlan:
    route: str
    steps: list[DiscoveryExecutionStep] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not self.steps


def build_discovery_execution_plan(*, graph_state: GraphState) -> DiscoveryExecutionPlan:
    if graph_state.route != "DISCOVERY":
        return DiscoveryExecutionPlan(route=graph_state.route, steps=[])

    if graph_state.intent in {"pattern_discovery", "result_highlight"}:
        return DiscoveryExecutionPlan(
            route=graph_state.route,
            steps=[DiscoveryExecutionStep(tool_name="discovery_summary")],
        )

    return DiscoveryExecutionPlan(route=graph_state.route, steps=[])


def execute_discovery_execution_plan(
    *,
    plan: DiscoveryExecutionPlan,
    query: str,
    graph_state: GraphState,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse | None:
    if plan.is_empty:
        return None

    for step in plan.steps:
        if step.tool_name == "discovery_summary":
            response = answer_discovery_summary_query(
                query=query,
                graph_state=graph_state,
                limit=limit,
                embedder=embedder,
            )
            if response is not None:
                return response

    return None
