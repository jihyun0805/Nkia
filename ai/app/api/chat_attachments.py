from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from app.core.security import require_internal_token
from app.embeddings.model import EmbeddingModel
from app.schemas.indexing import IndexAttachmentRequest
from app.services.attachment_text_extractor import extract_attachment_text
from app.services.indexing_service import index_documents, map_attachment_to_document


router = APIRouter(prefix="/internal/chat", tags=["Indexing"], dependencies=[Depends(require_internal_token)])


@router.post("/attachments", summary="챗봇 세션 임시 첨부파일 업로드 및 색인")
async def upload_chat_attachment(
    request: Request,
    session_id: str = Form(..., alias="sessionId"),
    file: UploadFile = File(...),
) -> dict:
    session_id = session_id.strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="sessionId는 필수입니다.")

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
    file_id = str(uuid4())
    safe_file_name = (file.filename or "attachment").strip() or "attachment"

    attachment = IndexAttachmentRequest(
        fileId=file_id,
        parentSourceType="CHAT_SESSION",
        parentSourceId=session_id,
        rootSourceType="CHAT_SESSION",
        rootSourceId=session_id,
        operation="UPSERT",
        fileName=safe_file_name,
        sourcePath=f"/chatbot/session/{session_id}/{safe_file_name}",
        extractedText=extracted.text,
        extension=extracted.extension,
        fileType=extracted.file_type,
        documentStage="CHAT_UPLOAD",
        businessDomain="CHATBOT",
        evidenceGroupKey=f"CHAT_SESSION:{session_id}",
        metadata={
            "origin": "chat_session",
            "sessionId": session_id,
            "fileSize": len(file_bytes),
            "uploadedAt": request.headers.get("x-uploaded-at"),
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
        "sourceId": result.sourceId,
        "preview": extracted.text[:240],
    }
