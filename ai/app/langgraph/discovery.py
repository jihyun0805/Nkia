# 인수인계 메모: 챗봇 LangGraph 실행 계층입니다. 질문을 분기하고 정형 조회, 검색, 답변 생성, 초안 액션 순서로 흘려보냅니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
