"""일반 첨부파일 색인 endpoint.

사업기회·RFP·제안서·견적 등 모든 도메인의 첨부파일을 영구 ATTACHMENT 로 색인.
chat_attachments 와 유사하지만 parentSourceType/Id 를 caller (backend) 가 지정.

호출 흐름:
    backend UploadFileService.uploadFile() → MinIO 저장 → 본 endpoint 로 binary + parent 전달
    → extract_attachment_text → IndexAttachmentRequest → index_documents → ai_knowledge_sources
"""
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from app.core.security import require_internal_token
from app.embeddings.model import EmbeddingModel
from app.schemas.indexing import IndexAttachmentRequest
from app.services.attachment_text_extractor import extract_attachment_text
from app.services.indexing_service import index_documents, map_attachment_to_document


router = APIRouter(prefix="/internal/attachments", tags=["Indexing"], dependencies=[Depends(require_internal_token)])


@router.post("/upload", summary="일반 첨부파일 업로드 및 영구 색인 (도메인 첨부)")
async def upload_domain_attachment(
    request: Request,
    file_id: str = Form(..., alias="fileId"),
    parent_source_type: str = Form(..., alias="parentSourceType"),
    parent_source_id: str = Form(..., alias="parentSourceId"),
    file: UploadFile = File(...),
    file_name: Optional[str] = Form(default=None, alias="fileName"),
    source_path: Optional[str] = Form(default=None, alias="sourcePath"),
    root_source_type: Optional[str] = Form(default=None, alias="rootSourceType"),
    root_source_id: Optional[str] = Form(default=None, alias="rootSourceId"),
    document_stage: Optional[str] = Form(default=None, alias="documentStage"),
    business_domain: Optional[str] = Form(default=None, alias="businessDomain"),
) -> dict:
    """첨부 binary 를 multipart 로 받아 텍스트 추출 + ATTACHMENT 색인.

    - file_id: backend upload_file.id (영구 식별자)
    - parent_source_type/_id: 어느 도메인의 첨부인지 (예: RFP_ANALYSIS / 123)
    - root_source_type/_id: 사업기회 단위 grouping (옵션)
    """
    if not file_id.strip():
        raise HTTPException(status_code=400, detail="fileId 는 필수입니다.")
    if not parent_source_type.strip() or not parent_source_id.strip():
        raise HTTPException(status_code=400, detail="parentSourceType/Id 는 필수입니다.")

    file_bytes = await file.read()
    try:
        extracted = extract_attachment_text(
            filename=file.filename,
            content_type=file.content_type,
            file_bytes=file_bytes,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    embedder: EmbeddingModel = request.app.state.embedder
    safe_file_name = (file_name or file.filename or "attachment").strip() or "attachment"

    attachment = IndexAttachmentRequest(
        fileId=file_id,
        parentSourceType=parent_source_type,
        parentSourceId=parent_source_id,
        rootSourceType=root_source_type or parent_source_type,
        rootSourceId=root_source_id or parent_source_id,
        operation="UPSERT",
        fileName=safe_file_name,
        sourcePath=source_path,
        extractedText=extracted.text,
        extension=extracted.extension,
        fileType=extracted.file_type,
        documentStage=document_stage,
        businessDomain=business_domain or parent_source_type,
        evidenceGroupKey=f"{parent_source_type}:{parent_source_id}",
        metadata={
            "origin": "domain_attachment",
            "parentSourceType": parent_source_type,
            "parentSourceId": parent_source_id,
            "fileSize": len(file_bytes),
        },
    )

    response = index_documents(documents=[map_attachment_to_document(attachment)], embedder=embedder)
    result = response.results[0]
    return {
        "fileId": file_id,
        "fileName": safe_file_name,
        "extension": extracted.extension,
        "fileType": extracted.file_type,
        "size": len(file_bytes),
        "indexedStatus": result.status,
        "sourceType": result.sourceType,
        "sourceId": result.sourceId,
        "chunkCount": result.chunkCount,
        "preview": (extracted.text or "")[:240],
    }


@router.post("/delete", summary="첨부파일 색인 삭제")
async def delete_domain_attachment(
    request: Request,
    file_id: str = Form(..., alias="fileId"),
    parent_source_type: str = Form(..., alias="parentSourceType"),
    parent_source_id: str = Form(..., alias="parentSourceId"),
) -> dict:
    if not file_id.strip():
        raise HTTPException(status_code=400, detail="fileId 는 필수입니다.")

    embedder: EmbeddingModel = request.app.state.embedder
    attachment = IndexAttachmentRequest(
        fileId=file_id,
        parentSourceType=parent_source_type,
        parentSourceId=parent_source_id,
        operation="DELETE",
        deleted=True,
    )
    response = index_documents(documents=[map_attachment_to_document(attachment)], embedder=embedder)
    result = response.results[0]
    return {
        "fileId": file_id,
        "status": result.status,
        "sourceType": result.sourceType,
        "sourceId": result.sourceId,
    }
