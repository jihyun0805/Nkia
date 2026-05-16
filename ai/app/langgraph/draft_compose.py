from __future__ import annotations

import re
from typing import Any

from app.langgraph.state import GraphState
from app.langgraph.edit_intent import EditFieldIntent, detect_edit_field_intent
from app.models.draft import DraftAction, EditFieldPayload
from app.models.draft_registry import has_draft_reference_intent
from app.models.user_context import UserContext
from app.repositories.backend_query_repository import resolve_primary_opportunity
from app.schemas.answer import AnswerEvidence, AnswerResponse
from app.services.draft_service import compose_draft_action


# NOTE: clarification/insufficient_evidence 는 아래 조건 분기에서 개별 처리한다.

_YEARS_PATTERN = re.compile(r"최근\s*(\d+)\s*년")


def attach_draft_action_to_response(
    *,
    response: AnswerResponse,
    graph_state: GraphState | None,
    history: list,
    user_context: UserContext | None,
    embedder: Any = None,
) -> AnswerResponse:
    """답변 응답에 draft action 을 부착한다.

    embedder 가 제공되고 cross-reference 의도가 감지되면 유사 수주 사업기회의
    견적서를 reference_evidences 로 추가하여 슬롯 품질을 높인다.

    조건:
      - graph_state.draftIntent 가 존재
      - response.answerStatus 가 정상 답변군
      - response.evidences 가 비어있지 않거나, cross-reference 기반 reference_evidences 가 존재
    """

    if graph_state is None or graph_state.draftIntent is None:
        return response

    # clarification 은 사용자 입력 대기 상태이므로 항상 차단한다.
    if response.answerStatus == "clarification":
        return response

    draft_intent = graph_state.draftIntent
    is_reference_intent = has_draft_reference_intent(response.query)

    # cross-reference 명시 키워드가 있거나, 직접 증거가 없을 때 유사 수주 사례를 시도한다.
    should_try_reference = is_reference_intent or not response.evidences
    reference_evidences = (
        _fetch_cross_reference_evidences(
            query=response.query,
            graph_state=graph_state,
            embedder=embedder,
        )
        if should_try_reference
        else None
    )

    # insufficient_evidence 는 직접 근거나 reference_evidences 가 있으면 초안 작성을 허용한다.
    if response.answerStatus == "insufficient_evidence" and not reference_evidences and not response.evidences:
        return response

    # 직접 근거와 cross-reference 근거가 모두 없으면 스킵
    if not response.evidences and not reference_evidences:
        return response

    action = compose_draft_action(
        query=response.query,
        document_type=draft_intent.document_type,
        document_label=draft_intent.label,
        matched_keywords=list(draft_intent.matched_keywords),
        evidences=list(response.evidences),
        history=history,
        user_context=user_context,
        reference_evidences=reference_evidences,
    )
    if action is None:
        return response

    response.actions = [*response.actions, action]
    return response


# === edit_field action ===
def attach_edit_field_action_to_response(
    *,
    response: AnswerResponse,
    graph_state: GraphState | None,
) -> AnswerResponse:
    """사용자가 '...수정해줘' 같은 발화를 하면 edit_field action 을 첨부.

    answerStatus 가 clarification 이어도 edit_intent 가 명확하면 action 첨부 시도.
    """
    query = response.query or ""
    intent = detect_edit_field_intent(query)
    if intent is None:
        return response

    entity_code = intent.entity_code
    if entity_code is None:
        # entity_hint → opportunity_code 해석 (opportunity 만 우선 지원)
        if intent.entity_type == "opportunity" and intent.entity_hint:
            try:
                entity = resolve_primary_opportunity(
                    query_terms=[intent.entity_hint],
                    exact_codes=[],
                )
            except Exception:
                entity = None
            if entity:
                entity_code = entity.get("opportunity_code")
        if entity_code is None:
            return response  # entity 미식별 → 액션 첨부 안함

    entity_route = _build_entity_route(intent.entity_type, entity_code)
    if not entity_route:
        return response

    field_updates = {intent.field_name: intent.new_value}
    payload = EditFieldPayload(
        entity_type=intent.entity_type,
        entity_id=entity_code,
        entity_route=entity_route,
        field_updates=field_updates,
        summary=(
            f"{entity_code} 의 {intent.field_label}을(를) '{intent.new_value}' 로 변경하시려면 "
            f"버튼을 눌러 해당 페이지로 이동 후 적용하세요."
        ),
        references=[ev.sourceId for ev in (response.evidences or [])[:5]],
    )
    action = DraftAction(
        type="edit_field",
        label=f"{intent.field_label} 수정",
        button_label=f"{entity_code} 화면 열어 {intent.field_label} 수정",
        document_type=intent.entity_type,
        payload=payload,
        evidence_ids=payload.references,
        confidence=intent.confidence,
        reasons=["explicit_edit_intent", f"matched_verb:{intent.matched_verbs[0]}"],
    )
    response.actions = [*response.actions, action]
    return response


_EDIT_ENTITY_ROUTE_TEMPLATES: dict[str, str] = {
    "opportunity": "/finding/opportunities/{id}?tab=opportunities",
    "contract": "/contract/contracts/{id}?tab=contracts",
    "billing": "/project/billingAndCollection/{id}?tab=billingAndCollection",
    "license": "/contract/licenses/{id}?tab=licenses",
    "project": "/project/results/{id}?tab=results",
}


def _build_entity_route(entity_type: str, entity_id: str) -> str | None:
    template = _EDIT_ENTITY_ROUTE_TEMPLATES.get(entity_type)
    if not template:
        return None
    return template.format(id=entity_id)


def _parse_years_back(query: str) -> int | None:
    """쿼리에서 '최근 N년' 패턴을 파싱해 N을 반환한다."""
    match = _YEARS_PATTERN.search(query)
    if match:
        return int(match.group(1))
    if "최근" in query and ("년" in query or "사이" in query):
        return 3
    return None


def _resolve_source_opportunity_code(
    *,
    graph_state: GraphState,
) -> str | None:
    """graph_state 에서 유사 검색의 기준이 될 opportunity code 를 추출한다.

    exactCodes → slots → 고객/키워드 기반 DB 조회 순으로 시도한다.
    """
    opp_codes = [
        code for code in (graph_state.entityScope.exactCodes or [])
        if code.upper().startswith("OPP-")
    ]
    if opp_codes:
        return opp_codes[0]

    for slot in graph_state.slots.values():
        if slot.value and isinstance(slot.value, str) and slot.value.upper().startswith("OPP-"):
            return slot.value

    customer_terms = list(graph_state.entityScope.customerTerms or graph_state.entityScope.entityTerms or [])
    scope_terms = list(graph_state.entityScope.scopeTerms or [])
    query_terms = customer_terms + scope_terms
    if not query_terms:
        return None

    try:
        from app.repositories.backend_query_repository import resolve_primary_opportunity
        entity = resolve_primary_opportunity(query_terms=query_terms, exact_codes=[])
        if entity:
            return entity.get("opportunity_code")
    except Exception:
        pass
    return None


def _fetch_cross_reference_evidences(
    *,
    query: str,
    graph_state: GraphState,
    embedder: Any,
) -> list[dict[str, Any]] | None:
    """cross-reference 의도가 있고 embedder 가 제공될 때만 유사 수주 견적서를 가져온다.

    실패 시 None 을 반환해 초안 작성 자체는 계속 진행한다.
    """
    if embedder is None:
        return None

    source_opportunity_code = _resolve_source_opportunity_code(graph_state=graph_state)
    # source_opportunity_code 가 없어도 쿼리 텍스트 기반 검색으로 폴백한다.

    customer_type_hint = graph_state.slots.get("customer_type")
    customer_type = str(customer_type_hint.value) if customer_type_hint and customer_type_hint.value else None
    years_back = _parse_years_back(query)

    try:
        from app.services.similar_opportunity_service import (
            fetch_reference_evidences_for_opportunities,
            find_similar_won_opportunities,
            find_similar_won_opportunities_by_query,
        )

        if source_opportunity_code:
            similar = find_similar_won_opportunities(
                opportunity_code=source_opportunity_code,
                embedder=embedder,
                top_k=5,
                customer_type_hint=customer_type,
                years_back=years_back,
            )
        else:
            # 출처 코드 없는 vague 쿼리: 쿼리 텍스트 자체를 벡터로 검색
            similar = find_similar_won_opportunities_by_query(
                query=query,
                embedder=embedder,
                top_k=5,
                customer_type_hint=customer_type,
                years_back=years_back,
            )

        if not similar:
            return None

        similar_codes = [r.opportunity_code for r in similar]
        return fetch_reference_evidences_for_opportunities(
            opportunity_codes=similar_codes,
            embedder=embedder,
        )
    except Exception:
        return None


def annotate_answer_with_draft_hint(*, response: AnswerResponse) -> AnswerResponse:
    """draft action 이 부착된 응답 본문에 안내 한 줄을 덧붙인다.

    UI 가 actions 배열을 그대로 렌더하지 못하는 경우에도
    사용자가 후속 액션의 존재를 인지할 수 있도록 안내한다.
    """

    if not response.actions:
        return response

    primary = response.actions[0]
    hint = (
        f"\n\n근거를 바탕으로 {primary.label} 초안을 준비했습니다. "
        "아래 버튼을 눌러 작성 폼에서 확인해 주세요."
    )
    if hint.strip() not in (response.answer or ""):
        response.answer = (response.answer or "").rstrip() + hint
    return response


def evidence_payload_to_models(payload: list[dict[str, Any]] | None) -> list[AnswerEvidence]:
    if not payload:
        return []
    return [AnswerEvidence.model_validate(item) for item in payload]
