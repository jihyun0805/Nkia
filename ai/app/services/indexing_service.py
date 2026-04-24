import hashlib
from datetime import datetime
from typing import Any

from app.core.config import settings
from app.core.database import pool
from app.embeddings.chunker import split_text
from app.embeddings.model import EmbeddingModel
from app.embeddings.vector import vector_literal
from app.repositories.index_repository import (
    fetch_source_for_update,
    mark_source_deleted,
    replace_chunks,
    upsert_source,
)
from app.schemas.indexing import BatchIndexDocumentsResponse, IndexDocumentRequest, IndexDocumentResult
from app.services.document_builder import build_document_text

ATTACHMENT_SOURCE_TYPES = {"ATTACHMENT"}
ATTACHMENT_METADATA_FIELDS: dict[str, tuple[str, ...]] = {
    "fileId": ("fileId", "id"),
    "fileName": ("fileName", "filename", "originalFilename", "originalFileName", "name"),
    "extension": ("extension", "ext", "fileExtension"),
    "fileType": ("fileType", "mimeType", "contentType", "mediaType"),
    "parentSourceType": ("parentSourceType", "ownerSourceType", "domainSourceType"),
    "parentSourceId": ("parentSourceId", "ownerSourceId", "domainSourceId"),
    "pageCount": ("pageCount", "pages", "sheetCount", "slideCount"),
}
ATTACHMENT_PARENT_ENTITY_FIELDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("PROJECT_OPPORTUNITY", ("projectOpportunityId",)),
    ("SALES_ACTIVITY", ("salesActivityId",)),
    ("QUOTATION", ("quotationId",)),
    ("RFP_ANALYSIS", ("rfpAnalyzeResultId", "rfpAnalysisId")),
    ("PRB", ("prbId",)),
    ("BID_RESULT", ("bidResultId",)),
    ("ORDER_REPORT", ("orderReportId",)),
    ("CONTRACT", ("contractId",)),
    ("PROJECT", ("projectId",)),
    ("PROJECT_RESULT_REPORT", ("projectResultReportId",)),
    ("MAINTENANCE", ("maintenanceId",)),
    ("MAINTENANCE_QUOTE", ("maintenanceQuotationId",)),
    ("CUSTOMER_SUPPORT", ("customerSupportId",)),
    ("LICENSE", ("licenseId",)),
    ("BILLING", ("billingId",)),
)


def index_documents(
    *,
    documents: list[IndexDocumentRequest],
    embedder: EmbeddingModel,
) -> BatchIndexDocumentsResponse:
    return BatchIndexDocumentsResponse(results=[index_document(document=document, embedder=embedder) for document in documents])


def index_document(*, document: IndexDocumentRequest, embedder: EmbeddingModel) -> IndexDocumentResult:
    source_type = normalize_source_type(document.source_type)
    source_id = document.source_id.strip()
    event_time = document.occurred_at or datetime.now().astimezone()
    metadata = build_source_metadata(document=document, source_type=source_type)

    with pool.connection() as conn:
        with conn.transaction():
            existing = fetch_source_for_update(conn, source_type=source_type, source_id=source_id)
            stale_status = detect_duplicate_or_stale_event(existing=existing, event_id=document.event_id, occurred_at=event_time)
            if stale_status is not None:
                return IndexDocumentResult(
                    sourceType=source_type,
                    sourceId=source_id,
                    operation=document.operation,
                    status=stale_status,
                    message="이미 처리된 이벤트이거나 더 오래된 이벤트입니다.",
                )

            if document.operation == "DELETE" or document.deleted:
                mark_source_deleted(
                    conn,
                    source_type=source_type,
                    source_id=source_id,
                    title=document.title,
                    source_path=document.source_path,
                    metadata=metadata,
                    deleted_at=document.deleted_at,
                    event_id=document.event_id,
                    occurred_at=event_time,
                )
                return IndexDocumentResult(
                    sourceType=source_type,
                    sourceId=source_id,
                    operation="DELETE",
                    status="DELETED",
                    message="검색 대상에서 제외했습니다.",
                )

            document_text = build_document_text(
                source_type=source_type,
                title=document.title,
                content=document.content,
                payload=document.payload,
            )
            if not document_text:
                return IndexDocumentResult(
                    sourceType=source_type,
                    sourceId=source_id,
                    operation="UPSERT",
                    status="SKIPPED_EMPTY",
                    message="색인할 텍스트가 없습니다.",
                )

            source_text_hash = sha256_text(document_text)
            if existing and not existing.get("is_deleted") and existing.get("source_text_hash") == source_text_hash:
                upsert_source(
                    conn,
                    source_type=source_type,
                    source_id=source_id,
                    title=document.title,
                    source_path=document.source_path,
                    metadata=metadata,
                    source_text_hash=source_text_hash,
                    event_id=document.event_id,
                    occurred_at=event_time,
                )
                return IndexDocumentResult(
                    sourceType=source_type,
                    sourceId=source_id,
                    operation="UPSERT",
                    status="SKIPPED_UNCHANGED",
                    message="문서 본문이 변경되지 않아 임베딩을 재생성하지 않았습니다.",
                )

            chunks = split_text(document_text, chunk_size=settings.ai_chunk_size, chunk_overlap=settings.ai_chunk_overlap)
            embeddings = [vector_literal(vector) for vector in embedder.encode_passages(chunks)]
            source_pk = upsert_source(
                conn,
                source_type=source_type,
                source_id=source_id,
                title=document.title,
                source_path=document.source_path,
                metadata=metadata,
                source_text_hash=source_text_hash,
                event_id=document.event_id,
                occurred_at=event_time,
            )
            replace_chunks(
                conn,
                source_pk=source_pk,
                chunks=chunks,
                embeddings=embeddings,
                embedding_model=embedder.config.model_name,
                embedding_dimension=embedder.config.dimension,
                chunk_metadata=metadata,
                content_hashes=[sha256_text(chunk) for chunk in chunks],
            )
            return IndexDocumentResult(
                sourceType=source_type,
                sourceId=source_id,
                operation="UPSERT",
                status="INDEXED",
                chunkCount=len(chunks),
            )


def normalize_source_type(source_type: str) -> str:
    return source_type.strip().upper()


def build_source_metadata(*, document: IndexDocumentRequest, source_type: str) -> dict[str, Any]:
    metadata = dict(document.metadata)
    metadata.setdefault("sourceType", source_type)
    metadata.setdefault("origin", "crud")
    apply_attachment_metadata_defaults(metadata=metadata, source_type=source_type, payload=document.payload)
    if document.event_id:
        metadata["eventId"] = document.event_id
    if document.occurred_at:
        metadata["occurredAt"] = document.occurred_at.isoformat()
    if document.deleted_at:
        metadata["deletedAt"] = document.deleted_at.isoformat()
    return metadata


def detect_duplicate_or_stale_event(
    *,
    existing: dict[str, Any] | None,
    event_id: str | None,
    occurred_at: datetime,
) -> str | None:
    if not existing:
        return None
    if event_id and existing.get("last_event_id") == event_id:
        return "SKIPPED_DUPLICATE"

    last_event_at = existing.get("last_event_at")
    if last_event_at and occurred_at < last_event_at:
        return "SKIPPED_STALE"
    return None


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def apply_attachment_metadata_defaults(*, metadata: dict[str, Any], source_type: str, payload: dict[str, Any]) -> None:
    if source_type not in ATTACHMENT_SOURCE_TYPES:
        return

    for target_key, candidate_keys in ATTACHMENT_METADATA_FIELDS.items():
        value = lookup_first_payload_value(payload, candidate_keys)
        if value not in (None, ""):
            metadata.setdefault(target_key, value)

    if "parentSourceType" not in metadata or "parentSourceId" not in metadata:
        inferred_parent_type, inferred_parent_id = infer_attachment_parent(payload)
        if inferred_parent_type and inferred_parent_id not in (None, ""):
            metadata.setdefault("parentSourceType", inferred_parent_type)
            metadata.setdefault("parentSourceId", inferred_parent_id)


def lookup_first_payload_value(payload: dict[str, Any], keys: tuple[str, ...]) -> Any:
    for key in keys:
        if key in payload and payload[key] is not None:
            return payload[key]
    return None


def infer_attachment_parent(payload: dict[str, Any]) -> tuple[str | None, Any]:
    for source_type, candidate_keys in ATTACHMENT_PARENT_ENTITY_FIELDS:
        value = lookup_first_payload_value(payload, candidate_keys)
        if value not in (None, ""):
            return source_type, value
    return None, None
