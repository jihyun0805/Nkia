# 인수인계: 질문 성격에 따라 hybrid, exact, scoped 같은 검색 모드를 결정합니다.
# 핵심 흐름: 검색 폭과 reranker 사용 여부에 영향을 주는 작지만 중요한 판단입니다.
# 같이 확인: 새 모드는 search_service의 응답 searchMode와도 맞춰야 합니다.
from dataclasses import dataclass, field

from app.langgraph.state import GraphState


@dataclass(frozen=True)
class SearchModeDecision:
    search_mode: str
    use_reranker: bool
    limit: int
    candidate_multiplier: int
    reasons: list[str] = field(default_factory=list)


def decide_search_mode(*, graph_state: GraphState, requested_limit: int) -> SearchModeDecision:
    if graph_state.evidenceScope == "SESSION_ONLY":
        return SearchModeDecision(
            search_mode="session_attachment_search",
            use_reranker=False,
            limit=min(max(requested_limit, 3), 5),
            candidate_multiplier=2,
            reasons=["session_only_evidence"],
        )

    if graph_state.route == "FAST_STRUCTURED":
        return SearchModeDecision(
            search_mode="structured_only",
            use_reranker=False,
            limit=min(max(requested_limit, 1), 5),
            candidate_multiplier=1,
            reasons=["fast_structured"],
        )

    if graph_state.route == "MIXED":
        has_local_anchor = bool(graph_state.graphScope.opportunityCodes or graph_state.entityScope.exactCodes)
        if has_local_anchor:
            return SearchModeDecision(
                search_mode="graph_local_hybrid",
                use_reranker=False,
                limit=min(max(requested_limit, 4), 6),
                candidate_multiplier=3,
                reasons=["mixed", "local_anchor"],
            )
        if graph_state.evidenceScope == "DOCUMENT_FAMILY":
            return SearchModeDecision(
                search_mode="document_family_hybrid",
                use_reranker=False,
                limit=min(max(requested_limit, 4), 6),
                candidate_multiplier=3,
                reasons=["mixed", "document_family"],
            )
        return SearchModeDecision(
            search_mode="graph_scoped_hybrid",
            use_reranker=True,
            limit=min(max(requested_limit, 4), 6),
            candidate_multiplier=4,
            reasons=["mixed", "scoped_hybrid"],
        )

    if graph_state.intent in {"pattern_discovery", "result_highlight"}:
        return SearchModeDecision(
            search_mode="discovery_summary_first",
            use_reranker=False,
            limit=min(max(requested_limit, 6), 8),
            candidate_multiplier=3,
            reasons=["discovery", "summary_first"],
        )

    return SearchModeDecision(
        search_mode="discovery_hybrid",
        use_reranker=True,
        limit=min(max(requested_limit, 6), 10),
        candidate_multiplier=4,
        reasons=["discovery", "hybrid"],
    )
