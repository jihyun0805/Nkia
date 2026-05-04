from fastapi import APIRouter, Depends, Request

from app.core.security import require_internal_token
from app.embeddings.model import EmbeddingModel
from app.schemas.search import SearchRequest, SearchResponse, SearchableDateRangeResponse
from app.services.answer_service import rewrite_followup_query
from app.services.chat_planner_service import build_heuristic_plan, plan_chat_query
from app.services.query_normalization_service import normalize_query_context
from app.services.search_service import get_searchable_date_range, search_knowledge

router = APIRouter(tags=["Search"], dependencies=[Depends(require_internal_token)])


@router.post("/search", response_model=SearchResponse, summary="질의 계획 기반 하이브리드 검색")
def search(request_body: SearchRequest, request: Request) -> SearchResponse:
    embedder: EmbeddingModel = request.app.state.embedder
    effective_query = rewrite_followup_query(query=request_body.query, history=request_body.history)
    normalization = normalize_query_context(effective_query)
    if request_body.history:
        chat_plan = build_heuristic_plan(query=effective_query, normalization=normalization)
    else:
        chat_plan, normalization = plan_chat_query(effective_query)
    return search_knowledge(
        query=effective_query,
        limit=request_body.limit,
        source_types=request_body.source_types,
        attachment_session_id=request_body.attachment_session_id,
        start_at=request_body.start_at,
        end_at=request_body.end_at,
        embedder=embedder,
        chat_plan=chat_plan,
        normalization=normalization,
    )


@router.get("/search/date-range", response_model=SearchableDateRangeResponse, summary="검색 가능한 문서 기간 범위")
def search_date_range() -> SearchableDateRangeResponse:
    return get_searchable_date_range()
