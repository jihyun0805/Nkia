# 인수인계 메모: 챗봇 서비스 계층입니다. 색인, 검색, 근거 선별, 답변 생성, 추천/비교 등 실제 업무 로직이 모여 있습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
import re
from dataclasses import replace
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.embeddings.model import EmbeddingModel
from app.langgraph import (
    evaluate_corrective_retrieval,
    build_discovery_execution_plan,
    StructuredExecutionPlan,
    StructuredExecutionStep,
    build_preflight_graph_state,
    build_retrieval_execution_plan,
    build_structured_execution_plan,
    execute_discovery_execution_plan,
    execute_structured_execution_plan,
    route_to_response_value,
)
from app.llm.gms_client import GmsChatClient, GmsChatConfig
from app.models.user_context import UserContext
from app.orchestration import OrbisGraphCallbacks, invoke_orbis_agent_graph
from app.repositories.backend_query_repository import resolve_primary_opportunity
from app.schemas.answer import AnswerEvidence, AnswerResponse, ConversationMessage
from app.schemas.search import QueryPlanView, SearchResult
from app.services.evidence_service import group_answer_evidences
from app.services.chat_planner_service import plan_chat_query
from app.services.query_normalization_service import normalize_query_context
from app.services.query_intent_service import parse_structured_query_intent
from app.services.query_plan_service import plan_structured_query_with_gms
from app.services.search_service import build_query_plan_view, search_knowledge
from app.services.structured_answer_service import answer_graph_structured_extension

BUSINESS_CODE_PATTERN = re.compile(r"(?<![A-Z0-9-])[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){2,}(?![A-Z0-9-])")
KST = timezone(timedelta(hours=9))


def preserve_or_default_answer_status(response: AnswerResponse) -> None:
    if response.answerStatus in {"clarification", "insufficient_evidence", "upstream_degraded"}:
        return
    response.answerStatus = response.answerStatus or "good_answer"


def build_answer_graph_callbacks() -> OrbisGraphCallbacks:
    return OrbisGraphCallbacks(
        build_ambiguous_reference_response=build_ambiguous_reference_response,
        attach_graph_contract=attach_graph_contract,
        should_abort_for_low_confidence=should_abort_for_low_confidence,
        build_low_confidence_message=build_low_confidence_message,
        build_answer_evidences=build_answer_evidences,
        resolve_corrective_time_range=resolve_corrective_time_range,
        should_accept_corrective_retry=should_accept_corrective_retry,
        build_contextual_query=build_contextual_query,
        build_conversation_context=build_conversation_context,
        build_evidence_context=build_evidence_context,
        build_plan_summary=build_plan_summary,
        build_extractive_answer=build_extractive_answer,
        should_use_fast_answer=should_use_fast_answer,
    )


def answer_question(
    *,
    query: str,
    limit: int,
    source_types: list[str] | None,
    attachment_session_id: str | None,
    thread_id: str | None,
    start_at: str | None,
    end_at: str | None,
    history: list[ConversationMessage],
    embedder: EmbeddingModel,
    compiled_graph: object | None = None,
    user_context: UserContext | None = None,
) -> AnswerResponse:
    # 인사/잡담 short-circuit — 자연스러운 친근한 응답
    small_talk = _answer_small_talk(query=query, embedder=embedder, thread_id=thread_id)
    if small_talk is not None:
        return small_talk

    # === 신규: tool-use loop 시도 ===
    try:
        from app.orchestration.tool_loop import run_tool_loop, should_try_tool_loop  # noqa: PLC0415
        if should_try_tool_loop(query):
            tool_response = run_tool_loop(
                query=query,
                user_context=user_context,
                history=history,
                embedder=embedder,
            )
            if tool_response is not None:
                tool_response.threadId = thread_id
                return tool_response
    except Exception as exc:
        import logging as _logging  # noqa: PLC0415
        _logging.getLogger(__name__).warning("tool_loop 실패, fallthrough: %s", exc)

    if compiled_graph is not None:
        return invoke_orbis_agent_graph(
            compiled_graph=compiled_graph,
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

    response = _answer_question_legacy(
        query=query,
        limit=limit,
        source_types=source_types,
        attachment_session_id=attachment_session_id,
        start_at=start_at,
        end_at=end_at,
        history=history,
        embedder=embedder,
        user_context=user_context,
    )
    response.threadId = thread_id
    return response


def _answer_question_legacy(
    *,
    query: str,
    limit: int,
    source_types: list[str] | None,
    attachment_session_id: str | None,
    start_at: str | None,
    end_at: str | None,
    history: list[ConversationMessage],
    embedder: EmbeddingModel,
    user_context: UserContext | None = None,
) -> AnswerResponse:
    ambiguous_response = build_ambiguous_reference_response(query=query, history=history, embedder=embedder)
    if ambiguous_response is not None:
        return ambiguous_response

    graph_state = build_preflight_graph_state(
        query=query,
        history=history,
        start_at=start_at,
        end_at=end_at,
        attachment_session_id=attachment_session_id,
        normalization=None,
    )
    effective_query = graph_state.rewrittenQuery or query
    normalization = normalize_query_context(effective_query)
    effective_start_at = start_at or graph_state.timeRange.startAt
    effective_end_at = end_at or graph_state.timeRange.endAt

    if graph_state.clarification.needed:
        return attach_graph_contract(
            AnswerResponse(
                query=query,
                answer=graph_state.clarification.question or "질문을 처리하려면 추가 정보가 필요합니다.",
                route=route_to_response_value(graph_state.route),
                answerStatus="clarification",
                embeddingModel=embedder.config.model_name,
                chatModel="graph-clarification-guard",
                retrievalConfidence=None,
                degradedReason=None,
                excludedSourceTypes=[],
                plan=None,
                evidences=[],
            ),
            graph_state=graph_state,
        )

    graph_structured_response = answer_graph_structured_extension(
        query=effective_query,
        graph_state=graph_state,
        limit=limit,
        embedder=embedder,
        user_context=user_context,
    )
    if graph_structured_response is not None:
        graph_structured_response.query = query
        graph_structured_response.route = route_to_response_value(graph_state.route)
        preserve_or_default_answer_status(graph_structured_response)
        return attach_graph_contract(graph_structured_response, graph_state=graph_state)

    structured_plan = build_structured_execution_plan(
        query=effective_query,
        normalization=normalization,
        graph_state=graph_state,
    )
    structured_response = execute_structured_execution_plan(
        plan=structured_plan,
        query=effective_query,
        normalization=normalization,
        graph_state=graph_state,
        limit=limit,
        start_at=effective_start_at,
        end_at=effective_end_at,
        embedder=embedder,
        user_context=user_context,
    )
    if structured_response is not None:
        structured_response.query = query
        structured_response.route = route_to_response_value(graph_state.route)
        preserve_or_default_answer_status(structured_response)
        return attach_graph_contract(structured_response, graph_state=graph_state)

    discovery_plan = build_discovery_execution_plan(graph_state=graph_state)
    discovery_response = execute_discovery_execution_plan(
        plan=discovery_plan,
        query=effective_query,
        graph_state=graph_state,
        limit=limit,
        embedder=embedder,
    )
    if discovery_response is not None:
        discovery_response.query = query
        discovery_response.route = route_to_response_value(graph_state.route)
        return attach_graph_contract(discovery_response, graph_state=graph_state)

    chat_plan, normalization = plan_chat_query(effective_query, normalization)
    if chat_plan.task == "needs_clarification":
        return attach_graph_contract(
            AnswerResponse(
                query=query,
                answer=chat_plan.clarification_message or "질문을 처리하려면 추가 정보가 필요합니다.",
                route="mixed" if normalization.target_hint in {"opportunity", "activity", "maintenance", "contract", "project"} else "discovery",
                answerStatus="clarification",
                embeddingModel=embedder.config.model_name,
                chatModel="query-planner",
                excludedSourceTypes=[],
                plan=build_query_plan_view(chat_plan),
                evidences=[],
            ),
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
            limit=limit,
            start_at=effective_start_at,
            end_at=effective_end_at,
            embedder=embedder,
            user_context=user_context,
        )
        if structured_response is not None:
            structured_response.query = query
            structured_response.route = route_to_response_value(graph_state.route)
            preserve_or_default_answer_status(structured_response)
            return attach_graph_contract(structured_response, graph_state=graph_state)

    retrieval_plan = build_retrieval_execution_plan(
        graph_state=graph_state,
        requested_limit=limit,
        requested_source_types=source_types,
    )
    effective_limit = retrieval_plan.limit if retrieval_plan is not None else limit
    effective_source_types = retrieval_plan.source_types if retrieval_plan is not None else source_types
    search_query = build_contextual_query(query=graph_state.semanticQuery or effective_query, history=history)
    search_response = search_knowledge(
        query=search_query,
        limit=effective_limit,
        source_types=effective_source_types,
        attachment_session_id=attachment_session_id,
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
        explicit_source_types=source_types,
        explicit_start_at=start_at,
        explicit_end_at=end_at,
    )
    if corrective_decision.should_retry and retrieval_plan is not None:
        graph_state.correctiveAction = corrective_decision.action
        retry_plan = replace(
            retrieval_plan,
            search_mode=f"{retrieval_plan.search_mode}:{corrective_decision.action}",
            source_types=corrective_decision.source_types or retrieval_plan.source_types,
        )
        retry_start_at, retry_end_at = resolve_corrective_time_range(
            graph_state=graph_state,
            action=corrective_decision.action,
            current_start_at=effective_start_at,
            current_end_at=effective_end_at,
        )
        retry_response = search_knowledge(
            query=search_query,
            limit=retry_plan.limit,
            source_types=retry_plan.source_types,
            attachment_session_id=attachment_session_id,
            start_at=retry_start_at,
            end_at=retry_end_at,
            embedder=embedder,
            chat_plan=chat_plan,
            normalization=normalization,
            retrieval_plan=retry_plan,
            user_context=user_context,
        )
        if should_accept_corrective_retry(original=search_response, retry=retry_response):
            search_response = retry_response
            merged_reasons = list(search_response.confidenceReasons)
            for reason in ["corrective_retry_applied", *corrective_decision.reasons]:
                if reason not in merged_reasons:
                    merged_reasons.append(reason)
            search_response.confidenceReasons = merged_reasons
    graph_state.confidenceReasons = list(search_response.confidenceReasons)
    if not search_response.results:
        return attach_graph_contract(
            AnswerResponse(
                query=query,
                answer="제공된 근거만으로는 확인하기 어렵습니다.",
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
            ),
            graph_state=graph_state,
        )

    if should_abort_for_low_confidence(
        query=query,
        search_response=search_response,
        normalization=normalization,
    ):
        low_confidence_evidences = build_answer_evidences(search_response.results)
        return attach_graph_contract(
            AnswerResponse(
                query=query,
                answer=build_low_confidence_message(graph_state=graph_state),
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
            ),
            graph_state=graph_state,
        )

    if should_use_fast_answer(plan=search_response.plan):
        generated_answer = build_extractive_answer(query=query, plan=search_response.plan, results=search_response.results)
        chat_model = "fast-extractive"
        answer_status = "good_answer"
        degraded_reason = None
    elif settings.gms_key:
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
                query=query,
                context=build_evidence_context(search_response.results),
                conversation_context=build_conversation_context(history),
                plan_summary=build_plan_summary(search_response.plan),
            )
            chat_model = settings.gms_chat_model
            answer_status = "good_answer"
            degraded_reason = None
        except RuntimeError:
            generated_answer = build_extractive_answer(query=query, plan=search_response.plan, results=search_response.results)
            chat_model = "extractive-fallback"
            answer_status = "upstream_degraded"
            degraded_reason = "grounded_answer_generation_failed"
    else:
        generated_answer = build_extractive_answer(query=query, plan=search_response.plan, results=search_response.results)
        chat_model = "extractive-fallback"
        answer_status = "upstream_degraded"
        degraded_reason = "llm_unavailable"

    evidences = build_answer_evidences(search_response.results)
    return attach_graph_contract(
        AnswerResponse(
            query=query,
            answer=generated_answer,
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
        ),
        graph_state=graph_state,
    )


def should_use_fast_answer(*, plan: QueryPlanView | None) -> bool:
    if plan is None:
        return False
    return plan.task in {"needs_clarification"}


def build_answer_evidences(results: list[SearchResult]) -> list[AnswerEvidence]:
    return [
        AnswerEvidence(
            evidenceType=getattr(result, "evidenceType", "retrieved_evidence"),
            sourceType=result.sourceType,
            sourceId=result.sourceId,
            title=result.title,
            chunkIndex=result.chunkIndex,
            distance=result.distance,
            vectorScore=result.vectorScore,
            keywordScore=result.keywordScore,
            finalScore=result.finalScore,
            matchedBy=result.matchedBy,
            content=result.content,
            metadata=result.metadata,
        )
        for result in results
    ]


def attach_graph_contract(response: AnswerResponse, *, graph_state: object) -> AnswerResponse:
    response.appliedDefaults = list(getattr(graph_state, "appliedDefaults", []) or [])
    response.missingRequiredSlots = list(getattr(graph_state, "missingRequiredSlots", []) or [])
    if not response.confidenceReasons:
        response.confidenceReasons = list(getattr(graph_state, "confidenceReasons", []) or [])
    if response.confidenceBand is None:
        response.confidenceBand = infer_confidence_band(response)
    return response


def infer_confidence_band(response: AnswerResponse) -> str | None:
    confidence = response.retrievalConfidence
    if confidence is not None:
        if confidence >= 0.75:
            return "high"
        if confidence >= 0.5:
            return "medium"
        return "low"

    reasons = set(response.confidenceReasons or [])
    if response.answerStatus == "upstream_degraded":
        return "low"
    if response.answerStatus == "clarification":
        return None
    if response.answerStatus == "insufficient_evidence":
        return "low"

    if reasons & {
        "fast_structured",
        "comparison_query",
        "delta_query",
        "structured_query",
        "discovery_summary_rule",
        "pattern_aggregation",
        "maintenance_transition",
    }:
        return "high"
    if reasons & {"hybrid", "global_scope", "graph_scoped", "retrieval_retry"}:
        return "medium"
    return None


def should_abort_for_low_confidence(
    *,
    query: str,
    search_response: object,
    normalization: object,
) -> bool:
    confidence = getattr(search_response, "retrievalConfidence", None)
    if confidence is not None and confidence < 0.42:
        return True

    results = getattr(search_response, "results", []) or []
    if not results:
        return True

    source_types = {result.sourceType for result in results}
    if source_types == {"ATTACHMENT"} and has_structured_signal_query(query):
        return True

    target_hint = getattr(normalization, "target_hint", None)
    if target_hint in {"opportunity", "project", "maintenance"} and source_types == {"ATTACHMENT"}:
        return True

    return False


def build_low_confidence_message(*, graph_state: object) -> str:
    missing_slots = set(getattr(graph_state, "missingRequiredSlots", []) or [])
    applied_defaults = set(getattr(graph_state, "appliedDefaults", []) or [])
    route = getattr(graph_state, "route", "UNKNOWN")
    slots = getattr(graph_state, "slots", {}) or {}
    document_scope = None
    if "document_scope" in slots:
        document_scope = getattr(slots["document_scope"], "value", None)

    if "metric" in missing_slots:
        return "순위를 정하려면 비교 기준이 필요합니다. 예: 횟수, 금액, 최근성, 예상 수주율, 유지보수 건수, 계약 금액."

    if "entity_scope" in missing_slots:
        return "어느 사업을 기준으로 볼지 알려주세요. 사업코드, 사업명, 고객사 중 하나를 지정해 주세요."

    if route == "DISCOVERY" and "time_range:recent->90d" in applied_defaults:
        if document_scope == "PRB":
            return (
                "현재는 최근 90일 PRB 문서를 기준으로 보았지만 검색 신뢰도가 낮습니다. "
                "기간 기준만 더 구체적으로 주시면 다시 답변하겠습니다. 예: 최근 30일, 최근 6개월."
            )
        return (
            "현재는 최근 90일 기준으로 보았지만 검색 신뢰도가 낮습니다. "
            "기간 기준만 더 구체적으로 주시면 다시 답변하겠습니다. 예: 최근 30일, 최근 6개월."
        )

    if route == "DISCOVERY":
        return "관련 근거는 일부 찾았지만 현재 검색 신뢰도가 낮아 답변을 확정하지 않겠습니다. 기간 기준을 더 구체적으로 주시면 다시 답변하겠습니다."

    return "관련 근거는 일부 찾았지만 현재 검색 신뢰도가 낮아 답변을 확정하지 않겠습니다. 사업코드나 기간 기준을 더 구체적으로 주시면 다시 답변하겠습니다."


def resolve_corrective_time_range(
    *,
    graph_state: object,
    action: str,
    current_start_at: str | None,
    current_end_at: str | None,
) -> tuple[str | None, str | None]:
    if action != "retry_expand_recent_window":
        return current_start_at, current_end_at

    end = datetime.now(KST).replace(microsecond=0)
    start = end - timedelta(days=180)
    return start.isoformat(), end.isoformat()


def should_accept_corrective_retry(*, original: AnswerResponse | object, retry: AnswerResponse | object) -> bool:
    original_confidence = getattr(original, "retrievalConfidence", 0.0) or 0.0
    retry_confidence = getattr(retry, "retrievalConfidence", 0.0) or 0.0
    original_count = len(getattr(original, "results", []) or [])
    retry_count = len(getattr(retry, "results", []) or [])
    if retry_count == 0:
        return False
    if original_count == 0:
        return True
    return retry_confidence >= original_confidence or retry_count > original_count


def has_structured_signal_query(query: str) -> bool:
    normalized = " ".join(query.lower().split())
    return any(
        keyword in normalized
        for keyword in [
            "실주",
            "사유",
            "의사결정",
            "구조",
            "결과보고",
            "견적서",
            "정기점검",
            "긴급",
            "리스크",
            "근거 문서",
        ]
    )


def build_contextual_query(*, query: str, history: list[ConversationMessage]) -> str:
    recent_messages = history[-4:]
    context_parts = [message.content.strip() for message in recent_messages if message.content.strip()]
    context_parts.append(query.strip())
    return "\n".join(part for part in context_parts if part)


def rewrite_followup_query(*, query: str, history: list[ConversationMessage]) -> str:
    if not history or not has_followup_reference(query):
        return query

    subject = infer_followup_subject(history)
    if not subject:
        return query
    if subject in query:
        return query
    return f"{subject} {query}".strip()


def has_followup_reference(query: str) -> bool:
    normalized = " ".join(query.lower().split())
    compact = normalized.replace(" ", "")
    keywords = [
        "그사업",
        "그건",
        "그사건",
        "그프로젝트",
        "그거",
        "저거",
        "해당사업",
        "해당건",
        "이건",
        "이사업",
    ]
    return any(keyword in compact for keyword in keywords)


def infer_followup_subject(history: list[ConversationMessage]) -> str | None:
    recent_messages = history[-6:]
    codes: list[str] = []
    for message in reversed(recent_messages):
        content = get_message_content(message)
        if content:
            codes.extend(extract_business_codes_from_text(content))
    if codes:
        return codes[0]

    combined_text = "\n".join(content for message in recent_messages if (content := get_message_content(message)))
    normalization = normalize_query_context(combined_text)
    entity = resolve_primary_opportunity(
        query_terms=normalization.scope_terms or normalization.entity_terms,
        exact_codes=extract_business_codes_from_text(combined_text),
    )
    if entity is None:
        return None
    return f"{entity['opportunity_code']} {entity['opportunity_name']}"


def extract_business_codes_from_text(text: str) -> list[str]:
    return list(dict.fromkeys(match.group(0).upper() for match in BUSINESS_CODE_PATTERN.finditer(text.upper())))


def get_message_content(message: object) -> str:
    if isinstance(message, dict):
        return str(message.get("content") or "").strip()
    content = getattr(message, "content", "")
    return str(content or "").strip()


def build_ambiguous_reference_response(
    *,
    query: str,
    history: list[ConversationMessage],
    embedder: EmbeddingModel,
) -> AnswerResponse | None:
    if history:
        return None

    if has_followup_reference(query):
        return AnswerResponse(
            query=query,
            answer=(
                "이전 대화에서 가리킬 사업을 찾을 수 없습니다. "
                "사업명이나 사업기회코드를 함께 알려주면 해당 사업의 다음 활동을 확인하겠습니다."
            ),
            answerStatus="clarification",
            embeddingModel=embedder.config.model_name,
            chatModel="guardrail",
            excludedSourceTypes=[],
            plan=None,
            evidences=[],
        )

    if not has_ambiguous_reference(query):
        return None

    return AnswerResponse(
        query=query,
        answer=(
            "질문에서 가리키는 대상 사업이나 판단 기준이 명확하지 않습니다. "
            "사업명, 사업기회코드, 또는 기준을 함께 알려주면 근거 기반으로 다시 답변할 수 있습니다. "
            "예: '한국전력 통합관제 사업을 포기했어야 했는지 알려줘' 또는 "
            "'수주율과 리스크 기준으로 포기 후보를 알려줘'."
        ),
        answerStatus="clarification",
        embeddingModel=embedder.config.model_name,
        chatModel="guardrail",
        excludedSourceTypes=[],
        plan=None,
        evidences=[],
    )


def has_ambiguous_reference(query: str) -> bool:
    normalized = " ".join(query.lower().split())
    compact = normalized.replace(" ", "")
    reference_keywords = ["이거", "그거", "저거", "이사업", "그사업", "아까", "방금", "위에"]
    decision_keywords = ["포기", "위험", "문제", "어려", "조심", "실수"]
    return any(keyword in compact for keyword in reference_keywords) and any(
        keyword in compact for keyword in decision_keywords
    )


def build_vague_metric_response(*, query: str, embedder: EmbeddingModel) -> AnswerResponse | None:
    if not has_vague_metric_question(query):
        return None

    return AnswerResponse(
        query=query,
        answer=(
            "질문의 비교 기준이 명확하지 않아 특정 대상을 단정하기 어렵습니다. "
            "비교 기준이나 집계 기준을 함께 알려주면 그 기준으로 데이터를 조회해 답변하겠습니다. "
            "예: 횟수 기준, 금액 기준, 최근 기준, 상태 기준, 리스크 기준, 후속 조치 기준 등."
        ),
        answerStatus="clarification",
        embeddingModel=embedder.config.model_name,
        chatModel="guardrail",
        excludedSourceTypes=[],
        plan=None,
        evidences=[],
    )


def has_vague_metric_question(query: str) -> bool:
    normalized = " ".join(query.lower().split())
    superlative_keywords = ["가장", "제일", "최고", "최대", "상위", "top", "top3", "top 3"]
    vague_activity_keywords = ["적극", "활발", "열심", "우수", "성과", "의미있는", "좋은", "잘한"]
    measurable_keywords = [
        "횟수",
        "건수",
        "빈도",
        "시간",
        "최근",
        "날짜",
        "기간",
        "후속",
        "미팅",
        "방문",
        "통화",
        "메일",
        "매출",
        "이익",
        "금액",
        "수주율",
        "이익률",
        "수익성",
        "계약",
        "점수",
    ]

    has_superlative = any(keyword in normalized for keyword in superlative_keywords)
    has_vague_activity = any(keyword in normalized for keyword in vague_activity_keywords)
    has_activity_context = any(
        keyword in normalized for keyword in ("활동", "사업", "유지보수", "결과", "입찰", "영업기회")
    )
    has_measurable_basis = any(keyword in normalized for keyword in measurable_keywords)
    return has_superlative and has_vague_activity and has_activity_context and not has_measurable_basis


def build_conversation_context(history: list[ConversationMessage]) -> str:
    """LLM 에 전달할 대화 컨텍스트.

    의도: follow-up 흐름 파악용 — user 질문만 짧게 노출.
    이전 assistant 답변은 포함하지 않음 (LLM 이 답변 내용을 재인용/재사용해
    [근거 문서] 와 무관한 환각/leak 을 만드는 패턴을 차단).

    중요: 첫 user 질문은 항상 보존한다.
    drilldown follow-up (예: turn 5 "수주보고 내용 알려줘") 에서 entity 가
    turn 1 에만 명시된 경우, 마지막 N개만 보이면 LLM 이 entity 를 잃고
    "특정 사업/회사 명시 안 됨" 으로 잘못 refusal 하는 패턴 차단.
    """
    if not history:
        return ""

    user_messages = [m for m in history if m.role == "user"]
    if not user_messages:
        return ""

    # 첫 user (entity 가능성 높음) + 최근 2개. dedup.
    if len(user_messages) <= 3:
        preserved = user_messages
    else:
        preserved = [user_messages[0]] + user_messages[-2:]

    lines = []
    seen_contents: set[str] = set()
    for message in preserved:
        content = (message.content or "").strip()
        if not content or content in seen_contents:
            continue
        seen_contents.add(content)
        # 너무 긴 query 는 자름 (LLM 토큰 절약 + 환각 줄임)
        lines.append(f"사용자(이전): {content[:200]}")
    return "\n".join(lines)


def build_evidence_context(results: list[SearchResult]) -> str:
    sections = []
    for index, result in enumerate(results, start=1):
        metadata_lines = build_metadata_context_lines(result.metadata)
        header = f"[근거 {index}] {result.sourceType} · {result.sourceId}"
        if result.title:
            header += f" · {result.title}"
        sections.append(
            "\n".join(
                [
                    header,
                    *metadata_lines,
                    "content:",
                    result.content,
                ]
            )
        )
    return "\n\n---\n\n".join(sections)


def build_metadata_context_lines(metadata: dict | None) -> list[str]:
    if not metadata:
        return []

    interesting_keys = [
        "rootOpportunityCode",
        "rootOpportunityName",
        "rootBusinessType",
        "rootOpportunityStatus",
        "documentStage",
        "lifecyclePhase",
        "opportunityFlowCategory",
        "prospectListEligible",
        "salesStartedAt",
        "orderContractedAt",
        "projectStartAt",
        "projectEndAt",
        "warrantyStartAt",
        "warrantyEndAt",
        "paidMaintenanceStartAt",
        "paidMaintenanceEndAt",
        "integratedSupportStartAt",
        "integratedSupportEndAt",
        "documentWrittenAt",
        "documentStartAt",
        "documentEndAt",
        "businessStartAt",
        "businessEndAt",
        "maintenanceContractType",
    ]
    lines: list[str] = []
    for key in interesting_keys:
        value = metadata.get(key)
        if value in (None, "", [], {}):
            continue
        lines.append(f"metadata.{key}: {value}")
    return lines


_TASK_KO = {
    "summarize_period": "기간 요약",
    "rank_metric": "지표 기준 순위",
    "list_by_status": "상태별 목록 조회",
    "rank_and_explain": "난이도/리스크 기준 순위",
    "semantic_search": "의미 기반 검색",
    "needs_clarification": "추가 정보 필요",
}

_SOURCE_TYPE_KO = {
    "OPPORTUNITY": "영업기회",
    "PROJECT_OPPORTUNITY": "사업기회",
    "ORDER_REPORT": "수주 보고서",
    "PRB": "PRB 검토서",
    "PRB_RESULT": "PRB 심의 결과",
    "BID_RESULT": "입찰 결과",
    "RFP": "RFP",
    "RFP_ANALYSIS": "RFP 분석",
    "WON": "수주",
    "LOST": "실주",
    "WON_REPORT": "수주 보고서",
    "CONTRACT": "계약서",
    "SALES_ACTIVITY": "영업 활동",
    "POST_SALES": "사후영업",
    "MODULE": "모듈",
    "MAINTENANCE_CONTRACT": "유지보수 계약",
}

_ANSWER_STYLE_KO = {
    "bullet_summary": "글머리 요약",
    "timeline": "타임라인",
    "comparison": "비교 분석",
    "detailed": "상세 설명",
    "list": "목록",
}

_FILTER_KEY_KO = {
    "customer_group": "고객 그룹",
    "customer_type": "고객 유형",
    "business_type": "사업 유형",
}


def build_plan_summary(plan: QueryPlanView | None) -> str:
    if plan is None:
        return ""

    task_label = _TASK_KO.get(plan.task, plan.task)
    source_labels = [_SOURCE_TYPE_KO.get(s, s) for s in plan.sourceTypes]
    style_label = _ANSWER_STYLE_KO.get(plan.answerStyle, plan.answerStyle)

    lines = [f"질의 유형: {task_label}", f"참조 문서: {', '.join(source_labels) if source_labels else '전체'}"]

    if plan.timeRange and (plan.timeRange.label or plan.timeRange.startAt):
        time_label = plan.timeRange.label or f"{plan.timeRange.startAt} ~ {plan.timeRange.endAt}"
        lines.append(f"조회 기간: {time_label}")

    if plan.filters:
        filter_parts = [
            f"{_FILTER_KEY_KO.get(k, k)}: {', '.join(v)}" for k, v in plan.filters.items() if v
        ]
        if filter_parts:
            lines.append(f"필터: {' / '.join(filter_parts)}")

    lines.append(f"답변 형식: {style_label}")
    return "\n".join(lines)


def build_extractive_answer(*, query: str, plan: QueryPlanView | None, results: list[SearchResult]) -> str:
    if not results:
        return build_plain_fallback_answer(
            conclusion="제공된 근거만으로는 확인하기 어렵습니다.",
            reasons=["현재 질문과 직접 연결되는 근거를 찾지 못했습니다."],
            next_step="사업명, 고객사명, 기간 중 하나를 더 구체적으로 입력해 주세요.",
        )

    top_results = results[:3]
    subject_names = [name for name in dict.fromkeys(extract_subject_name(result) for result in top_results) if name]
    source_labels = [label for label in dict.fromkeys(describe_source_type(result.sourceType) for result in top_results) if label]
    reference_labels = build_reference_labels(top_results)

    if plan and plan.answerStyle == "timeline":
        if subject_names:
            return build_plain_fallback_answer(
                conclusion=f"확인된 근거 기준으로는 {', '.join(subject_names[:3])} 관련 이력이 우선 확인됩니다.",
                reasons=[
                    f"관련 근거가 총 {len(results)}건 확인되었습니다.",
                    "질문이 이력 확인 성격이라 시간 흐름을 우선 보았습니다.",
                ],
                references=reference_labels,
                next_step="아래 근거를 펼쳐 세부 날짜와 진행 순서를 확인해 주세요.",
            )
        return build_plain_fallback_answer(
            conclusion="확인된 근거 기준으로 관련 이력이 일부 보입니다.",
            reasons=[
                f"관련 근거가 총 {len(results)}건 확인되었습니다.",
                "다만 사업명이나 대상명이 명확하게 잡히지는 않았습니다.",
            ],
            references=reference_labels,
            next_step="아래 근거를 펼쳐 세부 날짜와 진행 순서를 확인해 주세요.",
        )

    if plan and plan.answerStyle == "bullet_summary":
        if subject_names:
            return build_plain_fallback_answer(
                conclusion=f"이번 질문과 직접 연결되는 주요 대상은 {', '.join(subject_names[:3])}입니다.",
                reasons=[
                    f"관련 근거가 총 {len(results)}건 확인되었습니다.",
                    "요약 질문이라 가장 강하게 연결된 대상부터 추렸습니다.",
                ],
                references=reference_labels,
                next_step="아래 근거에서 세부 내용과 수치를 확인해 주세요.",
            )
        return build_plain_fallback_answer(
            conclusion=f"관련 근거 {len(results)}건이 확인되었습니다.",
            reasons=["질문과 연결되는 문서는 찾았지만, 대표 대상명은 뚜렷하지 않습니다."],
            references=reference_labels,
            next_step="아래 근거에서 세부 내용과 수치를 확인해 주세요.",
        )

    if subject_names:
        source_text = f" {', '.join(source_labels[:2])} 기준으로" if source_labels else ""
        reasons = [f"관련 근거가 총 {len(results)}건 확인되었습니다."]
        if source_text:
            reasons.append(f"주로 {', '.join(source_labels[:2])} 문서를 기준으로 보았습니다.")
        return build_plain_fallback_answer(
            conclusion=f"확인된 근거{source_text} 주요 관련 대상은 {', '.join(subject_names[:3])}입니다.",
            reasons=reasons,
            references=reference_labels,
            next_step="아래 근거를 펼쳐 원문과 세부 수치를 확인해 주세요.",
        )

    if source_labels:
        return build_plain_fallback_answer(
            conclusion=f"관련 근거 {len(results)}건이 확인되었습니다.",
            reasons=[f"주로 {', '.join(source_labels[:2])} 문서가 사용되었습니다."],
            references=reference_labels,
            next_step="아래 근거를 펼쳐 원문과 세부 수치를 확인해 주세요.",
        )

    return build_plain_fallback_answer(
        conclusion=f"관련 근거 {len(results)}건이 확인되었습니다.",
        reasons=["질문과 연결되는 근거는 찾았지만, 대표 대상명은 뚜렷하지 않습니다."],
        references=reference_labels,
        next_step="아래 근거를 펼쳐 원문과 세부 수치를 확인해 주세요.",
    )


def build_plain_fallback_answer(
    *,
    conclusion: str,
    reasons: list[str],
    references: list[str] | None = None,
    next_step: str,
) -> str:
    lines = [f"결론: {conclusion}", "", "왜냐하면:"]
    lines.extend(f"- {reason}" for reason in reasons if reason)
    if references:
        lines.extend(["", "참고 문서:", *[f"- {reference}" for reference in references[:3]]])
    lines.extend(["", f"다음에 볼 것: {next_step}"])
    return "\n".join(lines)


def extract_subject_name(result: SearchResult) -> str | None:
    metadata = result.metadata or {}
    candidates = [
        metadata.get("rootOpportunityName"),
        metadata.get("opportunityName"),
        metadata.get("customerName"),
        result.title,
    ]
    for candidate in candidates:
        if candidate is None:
            continue
        text = str(candidate).strip()
        if not text:
            continue
        if text.lower().endswith((".pdf", ".docx", ".pptx", ".hwp", ".hwpx", ".txt", ".md")):
            text = strip_file_extension(text)
        return text
    return None


def build_reference_labels(results: list[SearchResult]) -> list[str]:
    labels: list[str] = []
    for result in results:
        title = strip_file_extension(str(result.title or "").strip())
        source_label = describe_source_type(result.sourceType)
        code = str(result.sourceId or "").strip()
        if title and code:
            label = f"{title} ({source_label}, {code})"
        elif title:
            label = f"{title} ({source_label})"
        elif code:
            label = f"{source_label} {code}"
        else:
            label = source_label
        if label and label not in labels:
            labels.append(label)
    return labels


def strip_file_extension(text: str) -> str:
    return re.sub(r"\.(pdf|docx|pptx|hwp|hwpx|txt|md)$", "", text, flags=re.IGNORECASE)


def describe_source_type(source_type: str) -> str:
    mapping = {
        "PROJECT_OPPORTUNITY": "사업기회",
        "SALES_ACTIVITY": "영업활동",
        "QUOTATION": "견적",
        "RFP": "RFP",
        "RFP_ANALYSIS": "RFP 분석",
        "PRB": "PRB",
        "PRB_RESULT": "PRB 결과",
        "BID_RESULT": "입찰 결과",
        "WON": "수주",
        "LOST": "실주",
        "ORDER_REPORT": "수주보고서",
        "CONTRACT": "계약",
        "PROJECT": "사업",
        "PROJECT_RESULT_REPORT": "결과 보고",
        "PROPOSAL": "제안",
        "POST_SALES": "사후영업",
        "MAINTENANCE": "유지보수",
        "MAINTENANCE_QUOTE": "유지보수 견적",
        "CUSTOMER_SUPPORT": "고객지원",
        "MODULE": "모듈",
        "LICENSE": "라이선스",
        "BILLING": "청구",
        "ATTACHMENT": "첨부파일",
    }
    return mapping.get(source_type, source_type)


def generate_structured_final_answer(
    *,
    query: str,
    structured_response: AnswerResponse,
    history: list[ConversationMessage],
) -> AnswerResponse:
    client = GmsChatClient(
        GmsChatConfig(
            api_key=settings.gms_key or "",
            url=settings.gms_chat_completions_url,
            model=settings.gms_chat_model,
            timeout_seconds=settings.gms_timeout_seconds,
        )
    )
    generated_answer = client.create_grounded_answer(
        query=query,
        context=build_structured_answer_context(structured_response),
        conversation_context=build_conversation_context(history),
    )
    return AnswerResponse(
        query=structured_response.query,
        answer=generated_answer,
        embeddingModel=structured_response.embeddingModel,
        chatModel=settings.gms_chat_model,
        excludedSourceTypes=structured_response.excludedSourceTypes,
        plan=structured_response.plan,
        evidences=structured_response.evidences,
    )


def build_structured_answer_context(response: AnswerResponse) -> str:
    sections = [
        "\n".join(
            [
                "[정형 조회 결과]",
                response.answer,
            ]
        )
    ]
    if response.evidences:
        sections.append(build_evidence_context(response.evidences))
    return "\n\n---\n\n".join(sections)


# === small talk short-circuit ===

_SMALL_TALK_GREETINGS = (
    "안녕", "안녕하세요", "안녕!", "안녕요", "하이", "헬로", "hi", "hello", "반갑",
    "잘 부탁", "잘부탁", "처음 뵙",
)
_SMALL_TALK_THANKS = (
    "고마", "감사", "땡큐", "thanks", "thank you", "수고",
)
_SMALL_TALK_FAREWELL = ("잘 가", "잘가", "bye", "이만", "수고하세요", "안녕히")
# small_talk 패턴 매칭 전에 우회시키는 도메인 키워드 — 업무 query 가 farewell 등으로 오분류되는 것 방지
_DOMAIN_BLOCK_KEYWORDS = (
    "사업기회", "사업 기회", "사업", "유지보수", "유지 보수",
    "견적", "계약", "청구", "수금", "발주", "수주",
    "RFP", "rfp", "PRB", "prb", "제안서", "제안",
    "활동", "고객지원", "고객 지원", "프로젝트", "라이선스", "라이센스",
    "입찰", "결재", "워크플로우", "담당자", "팀장", "팀원", "본부",
    "만료", "종료", "임박", "예정", "납기", "마감",
    "일정", "스케줄",
)
_SMALL_TALK_WHO = ("너 누구", "당신은 누구", "넌 누구", "what are you", "who are you", "너는 누구")
_SMALL_TALK_HELP = ("도와줘", "도움말", "도움", "help", "사용법", "어떻게 써", "어떻게 쓰")
_SMALL_TALK_META = (
    "어떤 정보", "어떤 데이터", "어떤 종류 데이터", "사용 가능한 도메인",
    "도메인 목록", "data 종류", "정보 종류", "기능 목록", "할 수 있는",
)
_SMALL_TALK_INDEX = (
    "색인된 데이터 기준일", "데이터 기준일", "데이터 업데이트", "마지막 업데이트",
    "최신 색인",
)


def _answer_small_talk(*, query: str, embedder: EmbeddingModel, thread_id: str | None) -> AnswerResponse | None:
    """짧은 인사/감사/잡담 query 에 자연스러운 친근한 답변. None 이면 일반 처리."""
    text = (query or "").strip()
    if not text or len(text) > 50:
        return None
    # 도메인 키워드가 하나라도 있으면 업무 질의 — small_talk 우회
    if any(kw in text for kw in _DOMAIN_BLOCK_KEYWORDS):
        return None
    low = text.lower()
    compact = "".join(low.split())

    def has_any(patterns: tuple[str, ...]) -> bool:
        return any(p in low or p in compact for p in patterns)

    msg: str | None = None
    if has_any(_SMALL_TALK_GREETINGS):
        msg = (
            "안녕하세요! 엔키아 영업관리 챗봇입니다. 😊\n\n"
            "사업기회·PRB·RFP·견적·계약·청구·유지보수까지 데이터 기반으로 답변드립니다.\n\n"
            "예시:\n"
            "- \"신한은행 PRB 위험요인 알려줘\"\n"
            "- \"이번 달 청구 현황\"\n"
            "- \"AUTO-OPP-2026-101 사업 담당자 김철수로 수정해줘\" (수정 액션)\n"
            "- \"쿠팡 사업기회 RFP·견적 기반 PRB 보고서 작성해줘\" (초안 작성 액션)\n\n"
            "구체적인 사업명, 고객사명, 사업 코드와 함께 물으면 더 정확하게 답변할 수 있어요."
        )
    elif has_any(_SMALL_TALK_THANKS):
        msg = "감사합니다! 다른 도움이 필요하시면 언제든 말씀해 주세요. 🙌"
    elif has_any(_SMALL_TALK_FAREWELL):
        msg = (
            "수고하셨습니다! 다음에 또 도와드릴게요. 👋\n\n"
            "필요하시면 언제든 사업기회·PRB·견적·청구 관련 질문 주세요."
        )
    elif has_any(_SMALL_TALK_WHO):
        msg = (
            "저는 엔키아 영업관리 시스템의 사내 AI 어시스턴트입니다.\n"
            "사업기회·PRB·RFP·견적·계약·청구·유지보수 데이터를 기반으로 질문에 답변하고, "
            "수정/초안 작성 같은 액션 가이드도 제공합니다."
        )
    elif has_any(_SMALL_TALK_HELP):
        msg = (
            "이런 식으로 물어보시면 됩니다:\n\n"
            "📊 조회: \"신한은행 사업 현황\", \"이번 달 청구 합계\"\n"
            "🔍 분석: \"PRB 위험요인 큰 사업\", \"수주율 높은 패턴\"\n"
            "✏️  수정: \"AUTO-OPP-2026-101 담당자 김철수로 수정해줘\"\n"
            "📝 작성: \"신한은행 RFP·견적 기반 PRB 보고서 작성해줘\"\n\n"
            "사업명·고객사명·사업코드를 명시하면 더 정확합니다."
        )
    elif has_any(_SMALL_TALK_META):
        msg = (
            "다음 도메인 데이터를 다룹니다:\n\n"
            "🏢 **회사·관계자**: 고객사, 협력사(파트너), 담당자\n"
            "📋 **영업기회**: 사업기회 (PROJECT_OPPORTUNITY), 영업활동, 사후영업\n"
            "📑 **입찰**: RFP·RFP 분석, PRB·PRB 결과, 제안서, 입찰 결과(수주/실주)\n"
            "📝 **수주·계약**: 수주보고서, 계약서, 라이선스\n"
            "🛠️  **사업 수행**: 프로젝트, 유지보수, 유지보수 견적, 고객지원\n"
            "💰 **청구·수금**: 청구, 세금계산서\n"
            "📂 **첨부**: 사업기회별 첨부파일, 결재 메모\n\n"
            "조회·집계·분석·수정·초안 작성 모두 가능합니다."
        )
    elif has_any(_SMALL_TALK_INDEX):
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        msg = (
            f"색인된 데이터는 실시간으로 백엔드 DB 와 동기화됩니다 (오늘: {today}).\n\n"
            "사업기회·견적·청구 등 운영 데이터 변경 시 챗봇 응답에 즉시 반영돼요.\n"
            "RFP·계약 첨부파일 등은 업로드/색인 작업 후 약 1-2분 내 반영됩니다."
        )

    if msg is None:
        return None

    return AnswerResponse(
        query=query,
        answer=msg,
        threadId=thread_id,
        route="small_talk",
        answerStatus="good_answer",
        embeddingModel=embedder.config.model_name if embedder else "intfloat/multilingual-e5-base",
        chatModel="small-talk-rule",
        retrievalConfidence=None,
        confidenceBand="high",
        confidenceReasons=["small_talk_detected"],
        excludedSourceTypes=[],
        evidences=[],
    )
