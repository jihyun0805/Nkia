# 인수인계 메모: 챗봇 LangGraph 실행 계층입니다. 질문을 분기하고 정형 조회, 검색, 답변 생성, 초안 액션 순서로 흘려보냅니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from dataclasses import dataclass, field

from app.langgraph.retrieval import RetrievalExecutionPlan
from app.langgraph.state import GraphState
from app.models.constants import SourceType
from app.schemas.search import SearchResponse

S = SourceType


@dataclass(frozen=True)
class CorrectiveRetrievalDecision:
    action: str
    should_retry: bool
    source_types: list[str] | None = None
    start_at: str | None = None
    end_at: str | None = None
    reasons: list[str] = field(default_factory=list)


def evaluate_corrective_retrieval(
    *,
    graph_state: GraphState,
    search_response: SearchResponse,
    retrieval_plan: RetrievalExecutionPlan | None,
    explicit_source_types: list[str] | None,
    explicit_start_at: str | None,
    explicit_end_at: str | None,
) -> CorrectiveRetrievalDecision:
    if graph_state.route == "FAST_STRUCTURED" or retrieval_plan is None:
        return CorrectiveRetrievalDecision(action="none", should_retry=False)

    no_results = not search_response.results
    low_confidence = (search_response.retrievalConfidence or 0.0) < 0.42
    if not no_results and not low_confidence:
        return CorrectiveRetrievalDecision(action="none", should_retry=False)

    if graph_state.route == "MIXED" and not explicit_source_types and retrieval_plan.source_types:
        return CorrectiveRetrievalDecision(
            action="retry_relaxed_sources",
            should_retry=True,
            source_types=[
                S.PROJECT_OPPORTUNITY,
                S.SALES_ACTIVITY,
                S.POST_SALES,
                S.RFP,
                S.RFP_ANALYSIS,
                S.PRB,
                S.PRB_RESULT,
                S.PROPOSAL,
                S.BID_RESULT,
                S.LOST,
                S.WON,
                S.ORDER_REPORT,
                S.CONTRACT,
                S.PROJECT,
                S.PROJECT_RESULT_REPORT,
                S.MAINTENANCE,
                S.MAINTENANCE_QUOTE,
                S.CUSTOMER_SUPPORT,
                S.MODULE,
                S.LICENSE,
                S.BILLING,
                S.ATTACHMENT,
            ],
            reasons=["low_confidence", "relax_source_types"],
        )

    if (
        graph_state.route == "DISCOVERY"
        and not explicit_start_at
        and not explicit_end_at
        and "time_range:recent->90d" in graph_state.appliedDefaults
    ):
        return CorrectiveRetrievalDecision(
            action="retry_expand_recent_window",
            should_retry=True,
            source_types=retrieval_plan.source_types,
            start_at=None,
            end_at=None,
            reasons=["low_confidence", "expand_recent_window"],
        )

    return CorrectiveRetrievalDecision(action="none", should_retry=False)
