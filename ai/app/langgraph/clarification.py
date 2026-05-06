from app.langgraph.state import GraphClarification, GraphState


def apply_clarification_guard(graph_state: GraphState) -> GraphState:
    missing_slots = list(graph_state.missingRequiredSlots)
    clarification = GraphClarification(
        needed=bool(missing_slots),
        reason=missing_slots[0] if missing_slots else None,
        question=build_clarification_question(graph_state=graph_state, missing_slots=missing_slots),
        missingSlots=missing_slots,
    )
    graph_state.clarification = clarification
    graph_state.answerStatus = "CLARIFICATION" if clarification.needed else "UNKNOWN"
    return graph_state


def build_clarification_question(*, graph_state: GraphState, missing_slots: list[str]) -> str | None:
    if not missing_slots:
        return None

    primary = missing_slots[0]
    if primary == "metric":
        return "순위를 정하려면 비교 기준이 필요합니다. 예: 횟수, 금액, 최근성, 예상 수주율, 유지보수 건수, 계약 금액."

    if primary == "entity_scope":
        if graph_state.intent == "reason":
            return "어느 사업의 실주 사유를 볼지 알려주세요. 사업코드, 사업명, 고객사 중 하나를 지정해 주세요."
        if graph_state.intent == "decision_structure":
            return "어느 사업의 고객사 의사결정 구조를 볼지 알려주세요. 사업코드, 사업명, 고객사 중 하나를 지정해 주세요."
        if graph_state.intent == "proposal_point":
            return "어느 사업의 제안 포인트를 볼지 알려주세요. 사업코드, 사업명, 고객사 중 하나를 지정해 주세요."

    if primary == "time_range":
        if graph_state.intent == "result_highlight":
            return "어느 기간의 결과를 볼지 알려주세요. 예: 이번 달, 올해 상반기, 최근 90일"
        if graph_state.intent == "pattern_discovery":
            return "분석 기간이 필요합니다. 최근 30일, 90일, 6개월처럼 기간 기준을 알려주세요."
        return "기간 기준이 필요합니다. 예: 이번 달, 지난달, 올해 상반기, 최근 90일"

    return "질문을 처리하려면 추가 정보가 필요합니다."
