# 인수인계: 백엔드 CRUD 이벤트와 첨부파일 색인 요청을 받는 내부 API입니다.
# 핵심 흐름: 문서를 source 단위로 upsert/delete하고, 본문은 chunk로 나눠 pgvector에 저장합니다.
# 같이 확인: 색인 결과 스키마 변경 시 services/indexing_service.py와 백엔드 notify/seed 호출부를 같이 확인하세요.
from fastapi import APIRouter, Depends, Request

from app.core.config import settings
from app.core.security import require_internal_token
from app.embeddings.model import EmbeddingConfig, EmbeddingModel
from app.schemas.indexing import BatchIndexAttachmentsRequest, BatchIndexDocumentsRequest, BatchIndexDocumentsResponse
from app.services.indexing_service import index_documents, map_attachment_to_document

router = APIRouter(prefix="/internal/index", tags=["Indexing"], dependencies=[Depends(require_internal_token)])


def get_embedder(request: Request) -> EmbeddingModel:
    embedder = getattr(request.app.state, "embedder", None)
    if embedder is None:
        embedder = EmbeddingModel(EmbeddingConfig.from_settings(settings))
        request.app.state.embedder = embedder
    return embedder


@router.post("/documents", response_model=BatchIndexDocumentsResponse, summary="CRUD 이벤트 기반 문서 색인")
def index_document_batch(request_body: BatchIndexDocumentsRequest, request: Request) -> BatchIndexDocumentsResponse:
    return index_documents(documents=request_body.documents, embedder=get_embedder(request))


@router.post("/attachments", response_model=BatchIndexDocumentsResponse, summary="첨부파일 생성/수정/삭제 색인")
def index_attachment_batch(request_body: BatchIndexAttachmentsRequest, request: Request) -> BatchIndexDocumentsResponse:
    embedder = get_embedder(request)
    documents = [map_attachment_to_document(attachment) for attachment in request_body.attachments]
    return index_documents(documents=documents, embedder=embedder)
