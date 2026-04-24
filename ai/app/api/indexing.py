from fastapi import APIRouter, Depends, Request

from app.core.security import require_internal_token
from app.embeddings.model import EmbeddingModel
from app.schemas.indexing import BatchIndexAttachmentsRequest, BatchIndexDocumentsRequest, BatchIndexDocumentsResponse
from app.services.indexing_service import index_documents, map_attachment_to_document

router = APIRouter(prefix="/internal/index", tags=["Indexing"], dependencies=[Depends(require_internal_token)])


@router.post("/documents", response_model=BatchIndexDocumentsResponse, summary="CRUD 이벤트 기반 문서 색인")
def index_document_batch(request_body: BatchIndexDocumentsRequest, request: Request) -> BatchIndexDocumentsResponse:
    embedder: EmbeddingModel = request.app.state.embedder
    return index_documents(documents=request_body.documents, embedder=embedder)


@router.post("/attachments", response_model=BatchIndexDocumentsResponse, summary="첨부파일 생성/수정/삭제 색인")
def index_attachment_batch(request_body: BatchIndexAttachmentsRequest, request: Request) -> BatchIndexDocumentsResponse:
    embedder: EmbeddingModel = request.app.state.embedder
    documents = [map_attachment_to_document(attachment) for attachment in request_body.attachments]
    return index_documents(documents=documents, embedder=embedder)
