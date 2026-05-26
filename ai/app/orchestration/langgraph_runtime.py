# 인수인계: 챗봇 LangGraph 런타임입니다. 준비, 모호성 가드, preflight, 정형 조회, 검색, 답변, 액션 부착 노드를 연결합니다.
# 핵심 흐름: 각 노드는 dict state만 주고받으므로 새 필드는 OrbisAgentState, adapter, AnswerResponse 스키마를 같이 맞춰야 합니다.
# 같이 확인: 검색 품질 문제는 retrieval 노드와 services/search_service.py, 답변 문체 문제는 answer 노드와 llm/gms_client.py를 보세요.
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Callable, Literal, TypedDict

from langgraph.graph import END, START, StateGraph

from app.adapters.chat_graph_adapter import deserialize_history, build_graph_input, parse_graph_output
from app.core.config import settings
from app.embeddings.model import EmbeddingModel
from app.langgraph import (
    GraphState,
    StructuredExecutionPlan,
    StructuredExecutionStep,
    build_discovery_execution_plan,
    build_preflight_graph_state,
    build_retrieval_execution_plan,
    build_structured_execution_plan,
    evaluate_corrective_retrieval,
    execute_discovery_execution_plan,
    execute_structured_execution_plan,
    route_to_response_value,
)
from app.langgraph.draft_compose import (
    annotate_answer_with_draft_hint,
    attach_draft_action_to_response,
    attach_edit_field_action_to_response,
)
from app.services.recommendation_service import (
    build_opportunity_recommendations,
    format_recommendation_answer,
)
from app.services.comparison_executor import (
    build_comparison_result,
    format_comparison_answer,
)
from app.llm.gms_client import GmsChatClient, GmsChatConfig
from app.models.chat_plan import ChatQueryPlan
from app.models.user_context import UserContext
from app.services.chat_planner_service import plan_chat_query
from app.services.evidence_service import group_answer_evidences
from app.services.query_intent_service import parse_structured_query_intent
from app.services.query_normalization_service import normalize_query_context
from app.services.query_plan_service import plan_structured_query_with_gms
from app.services.search_service import build_query_plan_view, search_knowledge
from app.services.structured_answer_service import answer_graph_structured_extension
from app.schemas.answer import AnswerResponse, ConversationMessage
from app.schemas.search import SearchResponse


class OrbisAgentState(TypedDict, total=False):
    thread_id: str
    query: str
    limit: int
    source_types: list[str] | None
    attachment_session_id: str | None
    start_at: str | None
    end_at: str | None
    input_history: list[dict[str, str]]
    conversation_history: list[dict[str, str]]
    graph_state: dict[str, Any] | None
    chat_plan: dict[str, Any] | None
    search_response: dict[str, Any] | None
    response: dict[str, Any] | None
    route: str | None
    user_context: dict[str, Any] | None


@dataclass(frozen=True)
class OrbisGraphCallbacks:
    build_ambiguous_reference_response: Callable[[str, list[ConversationMessage], EmbeddingModel], AnswerResponse | None]
    attach_graph_contract: Callable[[AnswerResponse, object], AnswerResponse]
    should_abort_for_low_confidence: Callable[[str, object, object], bool]
    build_low_confidence_message: Callable[[object], str]
    build_answer_evidences: Callable[[list[object]], list[object]]
    resolve_corrective_time_range: Callable[[object, str, str | None, str | None], tuple[str | None, str | None]]
    should_accept_corrective_retry: Callable[[object, object], bool]
    build_contextual_query: Callable[[str, list[ConversationMessage]], str]
    build_conversation_context: Callable[[list[ConversationMessage]], str]
    build_evidence_context: Callable[[list[object]], str]
    build_plan_summary: Callable[[object], str]
    build_extractive_answer: Callable[[str, object, list[object]], str]
    should_use_fast_answer: Callable[[object], bool]


def preserve_or_default_answer_status(response: AnswerResponse) -> None:
    if response.answerStatus in {"clarification", "insufficient_evidence", "upstream_degraded"}:
        return
    response.answerStatus = response.answerStatus or "good_answer"


def create_orbis_agent_graph(
    *,
    embedder: EmbeddingModel,
    callbacks: OrbisGraphCallbacks,
    checkpointer: object | None,
) -> object:
    builder = StateGraph(OrbisAgentState)
    # 노드는 "질문 이해 → 정형/검색 실행 → 답변 생성 → 액션 부착" 순서로 한 번씩 통과한다.
    # 새 분기를 추가할 때는 node 등록, edge 연결, state payload 직렬화 계약을 함께 맞춰야 한다.
    builder.add_node("prepare_context", _prepare_context_node)
    builder.add_node("ambiguous_guard", _build_ambiguous_guard_node(embedder=embedder, callbacks=callbacks))
    builder.add_node("preflight", _preflight_node)
    builder.add_node("clarification", _clarification_node)
    builder.add_node("recommendation", _build_recommendation_node(embedder=embedder))
    builder.add_node("comparison", _build_comparison_node())
    builder.add_node("graph_structured", _build_graph_structured_node(embedder=embedder, callbacks=callbacks))
    builder.add_node("structured", _build_structured_node(embedder=embedder, callbacks=callbacks))
    builder.add_node("discovery", _build_discovery_node(embedder=embedder, callbacks=callbacks))
    builder.add_node("planner_fallback", _build_planner_fallback_node(embedder=embedder, callbacks=callbacks))
    builder.add_node("retrieval", _build_retrieval_node(embedder=embedder, callbacks=callbacks))
    builder.add_node("answer", _build_answer_node(callbacks=callbacks))
    builder.add_node("draft_compose", _build_draft_compose_node(embedder=embedder))
    builder.add_node("finalize", _finalize_node)

    # preflight에서 의도와 라우트를 먼저 정하고, 각 전문 노드가 처리 못 하면 다음 후보로 넘긴다.
    builder.add_edge(START, "prepare_context")
    builder.add_edge("prepare_context", "ambiguous_guard")
    builder.add_conditional_edges("ambiguous_guard", _route_on_response, {"done": "draft_compose", "continue": "preflight"})
    builder.add_conditional_edges(
        "preflight",
        _route_after_preflight,
        {
            "clarification": "clarification",
            "recommendation": "recommendation",
            "comparison": "comparison",
            "continue": "graph_structured",
        },
    )
    builder.add_edge("clarification", "draft_compose")
    builder.add_conditional_edges("recommendation", _route_on_response, {"done": "draft_compose", "continue": "graph_structured"})
    builder.add_conditional_edges("comparison", _route_on_response, {"done": "draft_compose", "continue": "graph_structured"})
    builder.add_conditional_edges("graph_structured", _route_on_response, {"done": "draft_compose", "continue": "structured"})
    builder.add_conditional_edges("structured", _route_on_response, {"done": "draft_compose", "continue": "discovery"})
    builder.add_conditional_edges("discovery", _route_on_response, {"done": "draft_compose", "continue": "planner_fallback"})
    builder.add_conditional_edges("planner_fallback", _route_on_response, {"done": "draft_compose", "continue": "retrieval"})
    builder.add_conditional_edges("retrieval", _route_on_response, {"done": "draft_compose", "continue": "answer"})
    builder.add_edge("answer", "draft_compose")
    builder.add_edge("draft_compose", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile(checkpointer=checkpointer, name="orbis-chatbot-agent")


def invoke_orbis_agent_graph(
    *,
    compiled_graph: object,
    query: str,
    limit: int,
    source_types: list[str] | None,
    attachment_session_id: str | None,
    start_at: str | None,
    end_at: str | None,
    history: list[ConversationMessage],
    thread_id: str | None,
    user_context: UserContext | None = None,
) -> AnswerResponse:
    effective_thread_id, graph_input = build_graph_input(
        query=query,
        limit=limit,
        source_types=source_types,
        attachment_session_id=attachment_session_id,
        start_at=start_at,
        end_at=end_at,
        history=history,
        thread_id=thread_id,
        user_context=user_context,
    )
    state = compiled_graph.invoke(
        graph_input,
        config={"configurable": {"thread_id": effective_thread_id}},
    )
    return parse_graph_output(state, thread_id=effective_thread_id)


def _prepare_context_node(state: OrbisAgentState) -> dict[str, Any]:
    incoming = _normalize_history(state.get("input_history", []))
    persisted = _normalize_history(state.get("conversation_history", []))
    merged = incoming if len(incoming) >= len(persisted) else persisted
    return {"conversation_history": _serialize_history(_trim_history(merged))}


def _build_ambiguous_guard_node(
    *,
    embedder: EmbeddingModel,
    callbacks: OrbisGraphCallbacks,
) -> Callable[[OrbisAgentState], dict[str, Any]]:
    def node(state: OrbisAgentState) -> dict[str, Any]:
        history = deserialize_history(state.get("conversation_history"))
        response = callbacks.build_ambiguous_reference_response(
            query=state["query"],
            history=history,
            embedder=embedder,
        )
        if response is None:
            return {}
        response.threadId = state.get("thread_id")
        return {"response": response.model_dump(mode="json"), "route": response.route}

    return node


def _preflight_node(state: OrbisAgentState) -> dict[str, Any]:
    history = deserialize_history(state.get("conversation_history"))
    graph_state = build_preflight_graph_state(
        query=state["query"],
        history=history,
        start_at=state.get("start_at"),
        end_at=state.get("end_at"),
        attachment_session_id=state.get("attachment_session_id"),
        normalization=None,
    )
    return {
        "graph_state": graph_state.model_dump(mode="json"),
        "route": route_to_response_value(graph_state.route),
    }


def _clarification_node(state: OrbisAgentState) -> dict[str, Any]:
    graph_state = _load_graph_state(state)
    response = AnswerResponse(
        query=state["query"],
        answer=graph_state.clarification.question or "질문을 처리하려면 추가 정보가 필요합니다.",
        threadId=state.get("thread_id"),
        route=route_to_response_value(graph_state.route),
        answerStatus="clarification",
        embeddingModel=settings.ai_embedding_model,
        chatModel="graph-clarification-guard",
        retrievalConfidence=None,
        degradedReason=None,
        excludedSourceTypes=[],
        plan=None,
        evidences=[],
    )
    return {"response": response.model_dump(mode="json")}


def _build_graph_structured_node(
    *,
    embedder: EmbeddingModel,
    callbacks: OrbisGraphCallbacks,
) -> Callable[[OrbisAgentState], dict[str, Any]]:
    def node(state: OrbisAgentState) -> dict[str, Any]:
        graph_state = _load_graph_state(state)
        effective_query = graph_state.rewrittenQuery or state["query"]
        response = answer_graph_structured_extension(
            query=effective_query,
            graph_state=graph_state,
            limit=state["limit"],
            embedder=embedder,
            user_context=_load_user_context(state),
        )
        if response is None:
            return {}
        response.query = state["query"]
        response.threadId = state.get("thread_id")
        response.route = route_to_response_value(graph_state.route)
        preserve_or_default_answer_status(response)
        response = callbacks.attach_graph_contract(response, graph_state=graph_state)
        return {"response": response.model_dump(mode="json")}

    return node


def _build_structured_node(
    *,
    embedder: EmbeddingModel,
    callbacks: OrbisGraphCallbacks,
) -> Callable[[OrbisAgentState], dict[str, Any]]:
    def node(state: OrbisAgentState) -> dict[str, Any]:
        graph_state = _load_graph_state(state)
        effective_query = graph_state.rewrittenQuery or state["query"]
        normalization = normalize_query_context(effective_query)
        effective_start_at = state.get("start_at") or graph_state.timeRange.startAt
        effective_end_at = state.get("end_at") or graph_state.timeRange.endAt
        plan = build_structured_execution_plan(
            query=effective_query,
            normalization=normalization,
            graph_state=graph_state,
        )
        response = execute_structured_execution_plan(
            plan=plan,
            query=effective_query,
            normalization=normalization,
            graph_state=graph_state,
            limit=state["limit"],
            start_at=effective_start_at,
            end_at=effective_end_at,
            embedder=embedder,
            user_context=_load_user_context(state),
        )
        if response is None:
            return {}
        response.query = state["query"]
        response.threadId = state.get("thread_id")
        response.route = route_to_response_value(graph_state.route)
        preserve_or_default_answer_status(response)
        response = callbacks.attach_graph_contract(response, graph_state=graph_state)
        return {"response": response.model_dump(mode="json")}

    return node


def _build_discovery_node(
    *,
    embedder: EmbeddingModel,
    callbacks: OrbisGraphCallbacks,
) -> Callable[[OrbisAgentState], dict[str, Any]]:
    def node(state: OrbisAgentState) -> dict[str, Any]:
        graph_state = _load_graph_state(state)
        effective_query = graph_state.rewrittenQuery or state["query"]
        plan = build_discovery_execution_plan(graph_state=graph_state)
        response = execute_discovery_execution_plan(
            plan=plan,
            query=effective_query,
            graph_state=graph_state,
            limit=state["limit"],
            embedder=embedder,
        )
        if response is None:
            return {}
        response.query = state["query"]
        response.threadId = state.get("thread_id")
        response.route = route_to_response_value(graph_state.route)
        response = callbacks.attach_graph_contract(response, graph_state=graph_state)
        return {"response": response.model_dump(mode="json")}

    return node


def _build_planner_fallback_node(
    *,
    embedder: EmbeddingModel,
    callbacks: OrbisGraphCallbacks,
) -> Callable[[OrbisAgentState], dict[str, Any]]:
    def node(state: OrbisAgentState) -> dict[str, Any]:
        graph_state = _load_graph_state(state)
        effective_query = graph_state.rewrittenQuery or state["query"]
        normalization = normalize_query_context(effective_query)
        effective_start_at = state.get("start_at") or graph_state.timeRange.startAt
        effective_end_at = state.get("end_at") or graph_state.timeRange.endAt

        chat_plan, normalization = plan_chat_query(effective_query, normalization)
        if chat_plan.task == "needs_clarification":
            response = AnswerResponse(
                query=state["query"],
                answer=chat_plan.clarification_message or "질문을 처리하려면 추가 정보가 필요합니다.",
                threadId=state.get("thread_id"),
                route="mixed" if normalization.target_hint in {"opportunity", "activity", "maintenance", "contract", "project"} else "discovery",
                answerStatus="clarification",
                embeddingModel=embedder.config.model_name,
                chatModel="query-planner",
                excludedSourceTypes=[],
                plan=build_query_plan_view(chat_plan),
                evidences=[],
            )
            response = callbacks.attach_graph_contract(response, graph_state=graph_state)
            return {"response": response.model_dump(mode="json")}

        structured_plan = build_structured_execution_plan(
            query=effective_query,
            normalization=normalization,
            graph_state=graph_state,
        )
        structured_intent = structured_plan.structured_intent or parse_structured_query_intent(effective_query, normalization)
        planned_by_gms = False
        should_use_structured_gms = chat_plan.task == "semantic_search"
        if structured_intent is None and should_use_structured_gms:
            structured_intent = plan_structured_query_with_gms(effective_query)
            planned_by_gms = structured_intent is not None

        if structured_intent is not None:
            fallback_plan = structured_plan
            if fallback_plan.structured_intent is None:
                fallback_plan = StructuredExecutionPlan(
                    route=graph_state.route,
                    steps=[StructuredExecutionStep(strategy="structured_intent", tool_name="structured_intent")],
                    structured_intent=structured_intent,
                )
            structured_response = execute_structured_execution_plan(
                plan=fallback_plan,
                query=effective_query,
                normalization=normalization,
                graph_state=graph_state,
                limit=state["limit"],
                start_at=effective_start_at,
                end_at=effective_end_at,
                embedder=embedder,
            )
            if structured_response is not None:
                structured_response.query = state["query"]
                structured_response.threadId = state.get("thread_id")
                structured_response.route = route_to_response_value(graph_state.route)
                preserve_or_default_answer_status(structured_response)
                structured_response = callbacks.attach_graph_contract(structured_response, graph_state=graph_state)
                return {"response": structured_response.model_dump(mode="json")}

        payload = asdict(chat_plan)
        payload["planned_by_gms"] = planned_by_gms
        return {"chat_plan": payload}

    return node


def _build_retrieval_node(
    *,
    embedder: EmbeddingModel,
    callbacks: OrbisGraphCallbacks,
) -> Callable[[OrbisAgentState], dict[str, Any]]:
    def node(state: OrbisAgentState) -> dict[str, Any]:
        graph_state = _load_graph_state(state)
        effective_query = graph_state.rewrittenQuery or state["query"]
        normalization = normalize_query_context(effective_query)
        chat_plan = _load_chat_plan(state)
        effective_start_at = state.get("start_at") or graph_state.timeRange.startAt
        effective_end_at = state.get("end_at") or graph_state.timeRange.endAt
        user_context = _load_user_context(state)
        retrieval_plan = build_retrieval_execution_plan(
            graph_state=graph_state,
            requested_limit=state["limit"],
            requested_source_types=state.get("source_types"),
        )
        effective_limit = retrieval_plan.limit if retrieval_plan is not None else state["limit"]
        effective_source_types = retrieval_plan.source_types if retrieval_plan is not None else state.get("source_types")
        history = deserialize_history(state.get("conversation_history"))
        search_query = callbacks.build_contextual_query(
            query=graph_state.semanticQuery or effective_query,
            history=history,
        )
        # 1차 검색은 벡터 검색, 키워드 검색, 정확 코드/엔티티 스코프를 합쳐 후보 근거를 만든다.
        search_response = search_knowledge(
            query=search_query,
            limit=effective_limit,
            source_types=effective_source_types,
            attachment_session_id=state.get("attachment_session_id"),
            start_at=effective_start_at,
            end_at=effective_end_at,
            embedder=embedder,
            chat_plan=chat_plan,
            normalization=normalization,
            retrieval_plan=retrieval_plan,
            user_context=user_context,
        )
        corrective_decision = evaluate_corrective_retrieval(
            graph_state=graph_state,
            search_response=search_response,
            retrieval_plan=retrieval_plan,
            explicit_source_types=state.get("source_types"),
            explicit_start_at=state.get("start_at"),
            explicit_end_at=state.get("end_at"),
        )
        if corrective_decision.should_retry and retrieval_plan is not None:
            # 근거가 너무 좁거나 기간/문서유형 필터가 과한 경우 한 번만 보정 검색을 수행한다.
            graph_state.correctiveAction = corrective_decision.action
            retry_plan = retrieval_plan.__class__(
                route=retrieval_plan.route,
                search_mode=f"{retrieval_plan.search_mode}:{corrective_decision.action}",
                limit=retrieval_plan.limit,
                source_types=corrective_decision.source_types or retrieval_plan.source_types,
                use_reranker=retrieval_plan.use_reranker,
            )
            retry_start_at, retry_end_at = callbacks.resolve_corrective_time_range(
                graph_state=graph_state,
                action=corrective_decision.action,
                current_start_at=effective_start_at,
                current_end_at=effective_end_at,
            )
            retry_response = search_knowledge(
                query=search_query,
                limit=retry_plan.limit,
                source_types=retry_plan.source_types,
                attachment_session_id=state.get("attachment_session_id"),
                start_at=retry_start_at,
                end_at=retry_end_at,
                embedder=embedder,
                chat_plan=chat_plan,
                normalization=normalization,
                retrieval_plan=retry_plan,
                user_context=user_context,
            )
            if callbacks.should_accept_corrective_retry(original=search_response, retry=retry_response):
                search_response = retry_response
                merged_reasons = list(search_response.confidenceReasons)
                for reason in ["corrective_retry_applied", *corrective_decision.reasons]:
                    if reason not in merged_reasons:
                        merged_reasons.append(reason)
                search_response.confidenceReasons = merged_reasons

        graph_state.confidenceReasons = list(search_response.confidenceReasons)
        if not search_response.results:
            response = AnswerResponse(
                query=state["query"],
                answer="제공된 근거만으로는 확인하기 어렵습니다.",
                threadId=state.get("thread_id"),
                route=search_response.route,
                answerStatus="insufficient_evidence",
                embeddingModel=search_response.embeddingModel,
                chatModel=settings.gms_chat_model if settings.gms_key else "extractive-fallback",
                retrievalConfidence=search_response.retrievalConfidence,
                confidenceReasons=search_response.confidenceReasons,
                excludedSourceTypes=search_response.excludedSourceTypes,
                plan=search_response.plan,
                evidences=[],
                typedEvidences=group_answer_evidences([]),
            )
            response = callbacks.attach_graph_contract(response, graph_state=graph_state)
            return {
                "response": response.model_dump(mode="json"),
                "search_response": search_response.model_dump(mode="json"),
                "graph_state": graph_state.model_dump(mode="json"),
            }

        if callbacks.should_abort_for_low_confidence(
            query=state["query"],
            search_response=search_response,
            normalization=normalization,
        ):
            # 낮은 신뢰도 답변은 그럴듯하게 꾸미지 않고, 부족한 근거를 사용자에게 그대로 보여준다.
            low_confidence_evidences = callbacks.build_answer_evidences(search_response.results)
            response = AnswerResponse(
                query=state["query"],
                answer=callbacks.build_low_confidence_message(graph_state=graph_state),
                threadId=state.get("thread_id"),
                route=search_response.route,
                answerStatus="insufficient_evidence",
                embeddingModel=search_response.embeddingModel,
                chatModel="confidence-guard",
                retrievalConfidence=search_response.retrievalConfidence,
                confidenceReasons=search_response.confidenceReasons,
                excludedSourceTypes=search_response.excludedSourceTypes,
                plan=search_response.plan,
                evidences=low_confidence_evidences,
                typedEvidences=group_answer_evidences(low_confidence_evidences),
            )
            response = callbacks.attach_graph_contract(response, graph_state=graph_state)
            return {
                "response": response.model_dump(mode="json"),
                "search_response": search_response.model_dump(mode="json"),
                "graph_state": graph_state.model_dump(mode="json"),
            }

        return {
            "search_response": search_response.model_dump(mode="json"),
            "graph_state": graph_state.model_dump(mode="json"),
        }

    return node


def _build_answer_node(*, callbacks: OrbisGraphCallbacks) -> Callable[[OrbisAgentState], dict[str, Any]]:
    def node(state: OrbisAgentState) -> dict[str, Any]:
        graph_state = _load_graph_state(state)
        search_response = SearchResponse.model_validate(state["search_response"])
        history = deserialize_history(state.get("conversation_history"))
        if callbacks.should_use_fast_answer(plan=search_response.plan):
            generated_answer = callbacks.build_extractive_answer(
                query=state["query"],
                plan=search_response.plan,
                results=search_response.results,
            )
            chat_model = "fast-extractive"
            answer_status = "good_answer"
            degraded_reason = None
        elif settings.gms_key:
            # LLM은 검색된 근거와 이전 대화 맥락만 받아 답한다. DB를 직접 조회하지 않는다.
            client = GmsChatClient(
                GmsChatConfig(
                    api_key=settings.gms_key,
                    url=settings.gms_chat_completions_url,
                    model=settings.gms_chat_model,
                    timeout_seconds=settings.gms_timeout_seconds,
                )
            )
            try:
                generated_answer = client.create_grounded_answer(
                    query=state["query"],
                    context=callbacks.build_evidence_context(results=search_response.results),
                    conversation_context=callbacks.build_conversation_context(history=history),
                    plan_summary=callbacks.build_plan_summary(plan=search_response.plan),
                )
                chat_model = settings.gms_chat_model
                answer_status = "good_answer"
                degraded_reason = None
            except RuntimeError:
                generated_answer = callbacks.build_extractive_answer(
                    query=state["query"],
                    plan=search_response.plan,
                    results=search_response.results,
                )
                chat_model = "extractive-fallback"
                answer_status = "upstream_degraded"
                degraded_reason = "grounded_answer_generation_failed"
        else:
            generated_answer = callbacks.build_extractive_answer(
                query=state["query"],
                plan=search_response.plan,
                results=search_response.results,
            )
            chat_model = "extractive-fallback"
            answer_status = "upstream_degraded"
            degraded_reason = "llm_unavailable"

        evidences = callbacks.build_answer_evidences(search_response.results)
        response = AnswerResponse(
            query=state["query"],
            answer=generated_answer,
            threadId=state.get("thread_id"),
            route=search_response.route,
            answerStatus=answer_status,
            embeddingModel=search_response.embeddingModel,
            chatModel=chat_model,
            retrievalConfidence=search_response.retrievalConfidence,
            confidenceReasons=search_response.confidenceReasons,
            degradedReason=degraded_reason,
            excludedSourceTypes=search_response.excludedSourceTypes,
            plan=search_response.plan,
            evidences=evidences,
            typedEvidences=group_answer_evidences(evidences),
        )
        response = callbacks.attach_graph_contract(response, graph_state=graph_state)
        return {"response": response.model_dump(mode="json")}

    return node


def _build_draft_compose_node(*, embedder: EmbeddingModel) -> Callable[[OrbisAgentState], dict[str, Any]]:
    def node(state: OrbisAgentState) -> dict[str, Any]:
        # NOTE: ai_enable_draft_actions 가 False 여도 edit_field action 은 시도.
        # (edit_field 는 페이지 navigate + prefill 만 하므로 안전)
        response_payload = state.get("response")
        if not isinstance(response_payload, dict):
            return {}

        graph_state_payload = state.get("graph_state")
        graph_state = (
            GraphState.model_validate(graph_state_payload)
            if isinstance(graph_state_payload, dict)
            else None
        )
        # edit_field action 은 draftIntent 없어도 동작하므로 query 만 있으면 진입
        if graph_state is None:
            return {}

        try:
            response = AnswerResponse.model_validate(response_payload)
        except Exception:
            return {}

        has_draft_intent = graph_state.draftIntent is not None
        has_edit_intent = bool(state.get("query"))  # query 있으면 edit_intent 확인 시도

        if not has_draft_intent and not has_edit_intent:
            return {}

        history = deserialize_history(state.get("conversation_history"))
        user_context_payload = state.get("user_context")
        user_context = (
            UserContext.model_validate(user_context_payload)
            if isinstance(user_context_payload, dict)
            else None
        )

        # draft action 은 사용자가 명시적으로 "작성해줘/만들어줘/초안" 같은 trigger 를
        # 발화했을 때만 detect_draft_intent 가 None 이 아니다. 발화 의도가 명확하므로
        # settings.ai_enable_draft_actions 무시하고 항상 시도 (저장 안 함, 폼 prefill 만).
        if has_draft_intent:
            try:
                response = attach_draft_action_to_response(
                    response=response,
                    graph_state=graph_state,
                    history=history,
                    user_context=user_context,
                    embedder=embedder,
                )
            except Exception:
                pass
        if has_edit_intent:
            try:
                response = attach_edit_field_action_to_response(
                    response=response,
                    graph_state=graph_state,
                    user_context=user_context,
                )
            except Exception:
                pass
        try:
            if response.actions:
                response = annotate_answer_with_draft_hint(response=response)
        except Exception:
            pass

        return {"response": response.model_dump(mode="json")}

    return node


def _finalize_node(state: OrbisAgentState) -> dict[str, Any]:
    response = parse_graph_output(state, thread_id=state.get("thread_id") or "")
    history = _normalize_history(state.get("conversation_history", []))
    if state.get("query"):
        history.append({"role": "user", "content": state["query"]})
    history.append({"role": "assistant", "content": response.answer})
    return {
        "conversation_history": _trim_history(history),
        "graph_state": None,
        "chat_plan": None,
        "search_response": None,
        "response": response.model_dump(mode="json"),
    }


def _build_recommendation_node(
    *,
    embedder: EmbeddingModel | None = None,
) -> Callable[[OrbisAgentState], dict[str, Any]]:
    def node(state: OrbisAgentState) -> dict[str, Any]:
        graph_state = _load_graph_state(state)
        entity_scope = graph_state.entityScope
        exact_codes = list(entity_scope.exactCodes)
        query_terms = list(entity_scope.entityTerms or entity_scope.scopeTerms or [])

        try:
            result = build_opportunity_recommendations(
                opportunity_code=exact_codes[0] if exact_codes else None,
                query_terms=query_terms,
                exact_codes=exact_codes,
            )
        except Exception:
            return {}
        if result is None:
            return {}

        similar_section = _build_similar_cases_section(
            opportunity_code=result.get("opportunityCode"),
            query=state.get("query", ""),
            embedder=embedder,
        )
        answer = format_recommendation_answer(result)
        if similar_section:
            answer = answer + "\n\n" + similar_section

        response = AnswerResponse(
            query=state["query"],
            answer=answer,
            threadId=state.get("thread_id"),
            route=route_to_response_value(graph_state.route),
            answerStatus="good_answer",
            embeddingModel=settings.ai_embedding_model,
            chatModel="recommendation-engine",
            excludedSourceTypes=[],
            evidences=[],
        )
        return {"response": response.model_dump(mode="json")}

    return node


def _build_similar_cases_section(
    *,
    opportunity_code: str | None,
    query: str,
    embedder: EmbeddingModel | None,
) -> str:
    """유사 수주 사례 요약 섹션을 생성한다. 실패 시 빈 문자열 반환."""
    if not opportunity_code or not embedder:
        return ""
    try:
        from app.services.similar_opportunity_service import find_similar_won_opportunities
        import re
        years_match = re.search(r"최근\s*(\d+)\s*년", query)
        years_back = int(years_match.group(1)) if years_match else None

        similar = find_similar_won_opportunities(
            opportunity_code=opportunity_code,
            embedder=embedder,
            top_k=3,
            years_back=years_back,
        )
        if not similar:
            return ""

        lines = ["### 유사 수주 사례"]
        for r in similar:
            score_pct = int(r.similarity_score * 100)
            amount = f" / 계약금액: {r.contract_amount}" if r.contract_amount else ""
            lines.append(
                f"- **{r.opportunity_name or r.opportunity_code}** ({r.customer_name or ''})"
                f" — 유형: {r.business_type or '-'}{amount} (유사도 {score_pct}%)"
            )
        return "\n".join(lines)
    except Exception:
        return ""


def _build_comparison_node() -> Callable[[OrbisAgentState], dict[str, Any]]:
    def node(state: OrbisAgentState) -> dict[str, Any]:
        graph_state = _load_graph_state(state)
        pairs = graph_state.comparisonPairs
        if len(pairs) < 2:
            return {}

        try:
            result = build_comparison_result(
                pair_a=pairs[0],
                pair_b=pairs[1],
                metric=graph_state.comparisonMetric,
            )
        except Exception:
            return {}
        if result is None:
            return {}

        answer = format_comparison_answer(result)
        response = AnswerResponse(
            query=state["query"],
            answer=answer,
            threadId=state.get("thread_id"),
            route=route_to_response_value(graph_state.route),
            answerStatus="good_answer",
            embeddingModel=settings.ai_embedding_model,
            chatModel="comparison-engine",
            excludedSourceTypes=[],
            evidences=[],
        )
        return {"response": response.model_dump(mode="json")}

    return node


def _route_on_response(state: OrbisAgentState) -> Literal["done", "continue"]:
    return "done" if state.get("response") else "continue"


def _route_after_preflight(
    state: OrbisAgentState,
) -> Literal["clarification", "recommendation", "comparison", "continue"]:
    graph_state = _load_graph_state(state)
    if graph_state.clarification.needed:
        return "clarification"
    # draftIntent 가 있으면 recommendation 노드 대신 일반 검색 경로로 진행한다.
    # 유사 사례 기반 초안 작성 쿼리에서 빈 evidences 가 생기는 문제를 방지한다.
    if graph_state.intent == "recommendation" and graph_state.draftIntent is None:
        return "recommendation"
    if graph_state.comparisonPairs and len(graph_state.comparisonPairs) >= 2:
        return "comparison"
    return "continue"


def _load_graph_state(state: OrbisAgentState) -> GraphState:
    payload = state.get("graph_state")
    if not isinstance(payload, dict):
        raise RuntimeError("LangGraph state에 graph_state가 없습니다.")
    return GraphState.model_validate(payload)


def _load_user_context(state: OrbisAgentState) -> UserContext | None:
    payload = state.get("user_context")
    if not isinstance(payload, dict):
        return None
    try:
        return UserContext.model_validate(payload)
    except Exception:
        return None


def _load_chat_plan(state: OrbisAgentState) -> ChatQueryPlan | None:
    payload = state.get("chat_plan")
    if not isinstance(payload, dict):
        return None
    payload = {key: value for key, value in payload.items() if key != "planned_by_gms"}
    return ChatQueryPlan(**payload)


def _normalize_history(history: list[dict[str, str]] | None) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    if not history:
        return normalized
    for item in history:
        role = str(item.get("role") or "").strip()
        content = str(item.get("content") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue
        normalized.append({"role": role, "content": content})
    return normalized


def _serialize_history(history: list[dict[str, str]]) -> list[dict[str, str]]:
    return [dict(item) for item in history]


def _trim_history(history: list[dict[str, str]], *, max_items: int = 16) -> list[dict[str, str]]:
    if len(history) <= max_items:
        return _serialize_history(history)
    return _serialize_history(history[-max_items:])
