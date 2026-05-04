from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.security import require_internal_token
from app.embeddings.model import EmbeddingModel
from app.schemas.answer import AnswerRequest, AnswerResponse
from app.services.answer_service import answer_question

router = APIRouter(tags=["Answer"], dependencies=[Depends(require_internal_token)])


@router.post("/answer", response_model=AnswerResponse, summary="검색 근거 기반 자연어 답변 생성")
def answer(request_body: AnswerRequest, request: Request) -> AnswerResponse:
    embedder: EmbeddingModel = request.app.state.embedder
    try:
        return answer_question(
            query=request_body.query,
            limit=request_body.limit,
            source_types=request_body.source_types,
            attachment_session_id=request_body.attachment_session_id,
            thread_id=request_body.thread_id,
            start_at=request_body.start_at,
            end_at=request_body.end_at,
            history=request_body.history,
            embedder=embedder,
            compiled_graph=getattr(request.app.state, "orbis_answer_graph", None),
            user_context=request_body.user_context,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
