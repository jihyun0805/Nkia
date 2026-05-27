# 인수인계 메모: FastAPI 엔드포인트 계층입니다. 백엔드에서 들어온 요청을 서비스 계층으로 넘기고 응답 스키마로 감쌉니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.security import require_internal_token
from app.embeddings.model import EmbeddingModel
from app.schemas.answer import AnswerRequest, AnswerResponse
from app.services.answer_service import answer_question

logger = logging.getLogger(__name__)

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
    except Exception as exc:
        logger.error("Unexpected error in /answer: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
