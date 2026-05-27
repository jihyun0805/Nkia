# 인수인계 메모: AI 챗봇 공통 코드입니다. 다른 계층에서 재사용하는 설정, 보안, 어댑터, 도구 함수를 담습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.models.user_context import UserContext
from app.schemas.answer import AnswerResponse, ConversationMessage


def serialize_history(history: list[ConversationMessage]) -> list[dict[str, str]]:
    return [{"role": message.role, "content": message.content} for message in history]


def deserialize_history(history: list[dict[str, str]] | None) -> list[ConversationMessage]:
    if not history:
        return []
    messages: list[ConversationMessage] = []
    for item in history:
        try:
            messages.append(ConversationMessage.model_validate(item))
        except Exception:
            continue
    return messages


def build_graph_input(
    *,
    query: str,
    limit: int,
    source_types: list[str] | None,
    attachment_session_id: str | None,
    start_at: str | None,
    end_at: str | None,
    history: list[ConversationMessage],
    thread_id: str | None,
    user_context: UserContext | None = None,
) -> tuple[str, dict[str, Any]]:
    effective_thread_id = thread_id or str(uuid4())
    return effective_thread_id, {
        "thread_id": effective_thread_id,
        "query": query,
        "limit": limit,
        "source_types": source_types,
        "attachment_session_id": attachment_session_id,
        "start_at": start_at,
        "end_at": end_at,
        "input_history": serialize_history(history),
        "route": None,
        "graph_state": None,
        "chat_plan": None,
        "search_response": None,
        "response": None,
        "user_context": user_context.model_dump(mode="json") if user_context is not None else None,
    }


def parse_graph_output(state: dict[str, Any], *, thread_id: str) -> AnswerResponse:
    response_payload = state.get("response")
    if not isinstance(response_payload, dict):
        raise RuntimeError("LangGraph 실행 결과에 응답 payload가 없습니다.")
    response = AnswerResponse.model_validate(response_payload)
    response.threadId = response.threadId or thread_id
    return response
