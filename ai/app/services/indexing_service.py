# 인수인계: IndexDocumentRequest를 source/chunk/embedding으로 저장하거나 삭제 표시하는 색인 서비스입니다.
# 핵심 흐름: 중복 eventId, 오래된 occurredAt, 동일 본문 hash를 걸러 불필요한 임베딩 재생성을 막습니다.
# 같이 확인: 본문 생성은 document_builder.py, 실제 SQL은 repositories/index_repository.py가 담당합니다.
import hashlib
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.core.database import pool
from app.embeddings.chunker import split_text
from app.embeddings.model import EmbeddingModel
from app.embeddings.vector import vector_literal
from app.models.constants import METADATA_ALIASES, SourceType
from app.repositories.index_repository import (
    fetch_source_for_update,
    mark_source_deleted,
    replace_chunks,
    upsert_source,
)
from app.schemas.indexing import BatchIndexDocumentsResponse, IndexAttachmentRequest, IndexDocumentRequest, IndexDocumentResult
from app.services.document_builder import build_document_text

ATTACHMENT_SOURCE_TYPES = {SourceType.ATTACHMENT}
ATTACHMENT_METADATA_FIELDS: dict[str, tuple[str, ...]] = {
    "attachmentCode": ("attachmentCode", "attachment_code"),
    "fileId": ("fileId", "id"),
    "fileName": ("fileName", "filename", "originalFilename", "originalFileName", "name"),
    "extension": ("extension", "ext", "fileExtension"),
    "fileType": ("fileType", "mimeType", "contentType", "mediaType"),
    "fileKind": ("fileKind", "kind"),
    "parentSourceType": ("parentSourceType", "ownerSourceType", "domainSourceType"),
    "parentSourceId": ("parentSourceId", "ownerSourceId", "domainSourceId"),
    "pageCount": ("pageCount", "pages", "sheetCount", "slideCount"),
    "relatedType": ("relatedType", "related_type"),
    "relatedCode": ("relatedCode", "related_code"),
    "companyCode": ("companyCode", "company_code"),
    "companyName": ("companyName", "company_name"),
    "customerCompanyCode": ("customerCompanyCode", "customer_company_code"),
    "customerCompanyName": ("customerCompanyName", "customer_company_name"),
    "customerGroup": ("customerGroup", "customer_group"),
    "customerType": ("customerType", "customer_type"),
    "contactName": ("contactName", "contact_name"),
    "contactDepartment": ("contactDepartment", "contact_department"),
    "opportunityId": ("opportunityId", "projectOpportunityId"),
    "opportunityCode": ("opportunityCode", "opportunity_code"),
    "opportunityName": ("opportunityName", "opportunity_name"),
    "businessType": ("businessType", "business_type"),
    "currentStatus": ("currentStatus", "current_status"),
    "activityId": ("activityId", "salesActivityId"),
    "activityType": ("activityType", "activity_type"),
    "activityChannel": ("activityChannel", "activity_channel"),
    "quoteCode": ("quoteCode", "quotationCode", "quote_code"),
    "rfpCode": ("rfpCode", "rfp_code"),
    "rfpAnalysisCode": ("rfpAnalysisCode", "rfp_analysis_code"),
    "proposalCode": ("proposalCode", "proposal_code"),
    "prbCode": ("prbCode", "prb_code"),
    "prbResultCode": ("prbResultCode", "prb_result_code"),
    "bidResultCode": ("bidResultCode", "bid_result_code"),
    "wonReportCode": ("wonReportCode", "won_report_code"),
    "contractCode": ("contractCode", "contract_code"),
    "projectCode": ("projectCode", "project_code"),
    "projectReportCode": ("projectReportCode", "project_report_code"),
    "maintenanceCode": ("maintenanceCode", "maintenance_code"),
    "contractType": ("contractType", "contract_type"),
    "supportCode": ("supportCode", "support_code"),
    "maintenanceQuoteCode": ("maintenanceQuoteCode", "maintenance_quote_code"),
    "licenseCode": ("licenseCode", "license_code"),
    "licenseTypeCode": ("licenseTypeCode", "license_type_code"),
    "billingCode": ("billingCode", "billing_code"),
    "collectionCode": ("collectionCode", "collection_code"),
    "moduleId": ("moduleId", "module_id", "productModuleId", "product_module_id"),
    "moduleName": ("moduleName", "module_name", "productName", "product_name"),
    "moduleType": ("moduleType", "module_type", "productType", "product_type"),
}
ATTACHMENT_PARENT_ENTITY_FIELDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("PROJECT_OPPORTUNITY", ("projectOpportunityId",)),
    ("SALES_ACTIVITY", ("salesActivityId",)),
    ("POST_SALES", ("postSalesId", "salesActivityId")),
    ("QUOTATION", ("quotationId",)),
    ("RFP", ("rfpId", "rfpCode")),
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
ATTACHMENT_ROOT_ENTITY_FIELDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("PROJECT_OPPORTUNITY", ("rootSourceId", "projectOpportunityId", "opportunityId")),
    ("PROJECT", ("projectId",)),
    ("MAINTENANCE", ("maintenanceId",)),
)


def index_documents(
    *,
    documents: list[IndexDocumentRequest],
    embedder: EmbeddingModel,
) -> BatchIndexDocumentsResponse:
    return BatchIndexDocumentsResponse(results=[index_document(document=document, embedder=embedder) for document in documents])


def map_attachment_to_document(attachment: IndexAttachmentRequest) -> IndexDocumentRequest:
    parent_source_type = normalize_source_type(attachment.parent_source_type)
    parent_source_id = attachment.parent_source_id.strip()
    file_id = attachment.file_id.strip()

    metadata = dict(attachment.metadata)
    metadata.setdefault("fileId", file_id)
    metadata.setdefault("fileName", attachment.file_name)
    metadata.setdefault("extension", attachment.extension)
    metadata.setdefault("fileType", attachment.file_type)
    metadata.setdefault("pageCount", attachment.page_count)
    metadata.setdefault("parentSourceType", parent_source_type)
    metadata.setdefault("parentSourceId", parent_source_id)
    if attachment.root_source_type:
        metadata.setdefault("rootSourceType", normalize_source_type(attachment.root_source_type))
    if attachment.root_source_id:
        metadata.setdefault("rootSourceId", attachment.root_source_id.strip())
    if attachment.document_stage:
        metadata.setdefault("documentStage", attachment.document_stage.strip())
    if attachment.business_domain:
        metadata.setdefault("businessDomain", attachment.business_domain.strip())
    if attachment.evidence_group_key:
        metadata.setdefault("evidenceGroupKey", attachment.evidence_group_key.strip())
    else:
        metadata.setdefault("evidenceGroupKey", f"{parent_source_type}:{parent_source_id}")

    payload: dict[str, Any] = {
        "fileId": file_id,
        "fileName": attachment.file_name,
        "extension": attachment.extension,
        "fileType": attachment.file_type,
        "pageCount": attachment.page_count,
        "parentSourceType": parent_source_type,
        "parentSourceId": parent_source_id,
        "rootSourceType": metadata.get("rootSourceType"),
        "rootSourceId": metadata.get("rootSourceId"),
        "documentStage": metadata.get("documentStage"),
        "businessDomain": metadata.get("businessDomain"),
        "evidenceGroupKey": metadata.get("evidenceGroupKey"),
        "extractedText": attachment.extracted_text,
    }
    for key, value in metadata.items():
        if value not in (None, ""):
            payload.setdefault(key, value)

    return IndexDocumentRequest(
        sourceType="ATTACHMENT",
        sourceId=build_attachment_source_id(
            parent_source_type=parent_source_type,
            parent_source_id=parent_source_id,
            file_id=file_id,
        ),
        operation=attachment.operation,
        title=attachment.file_name,
        sourcePath=attachment.source_path,
        content=attachment.extracted_text,
        payload=payload,
        metadata={key: value for key, value in metadata.items() if value not in (None, "")},
        deleted=attachment.deleted,
        deletedAt=attachment.deleted_at,
        eventId=attachment.event_id,
        occurredAt=attachment.occurred_at,
    )


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
                # 동일 이벤트 재수신이나 과거 이벤트 역전은 기존 색인을 덮어쓰지 않는다.
                return IndexDocumentResult(
                    sourceType=source_type,
                    sourceId=source_id,
                    operation=document.operation,
                    status=stale_status,
                    message="이미 처리된 이벤트이거나 더 오래된 이벤트입니다.",
                )

            if document.operation == "DELETE" or document.deleted:
                # 삭제는 청크를 물리 삭제하지 않고 source를 deleted 처리해 검색 결과에서 제외한다.
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
                # 텍스트가 없는 엔티티는 벡터화할 수 없으므로 source/chunk 생성을 건너뛴다.
                return IndexDocumentResult(
                    sourceType=source_type,
                    sourceId=source_id,
                    operation="UPSERT",
                    status="SKIPPED_EMPTY",
                    message="색인할 텍스트가 없습니다.",
                )

            source_text_hash = sha256_text(document_text)
            if existing and not existing.get("is_deleted") and existing.get("source_text_hash") == source_text_hash:
                # 본문이 같으면 메타데이터만 갱신하고 임베딩 재생성 비용을 피한다.
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
            # source 단위로 청크를 통째로 교체해 이전 버전 청크가 검색에 섞이지 않게 한다.
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
    normalize_document_metadata(metadata=metadata, payload=document.payload)
    apply_attachment_metadata_defaults(metadata=metadata, source_type=source_type, payload=document.payload)
    if document.event_id:
        metadata["eventId"] = document.event_id
    if document.occurred_at:
        metadata["occurredAt"] = document.occurred_at.isoformat()
    if document.deleted_at:
        metadata["deletedAt"] = document.deleted_at.isoformat()
    return metadata


def normalize_document_metadata(*, metadata: dict[str, Any], payload: dict[str, Any]) -> None:
    combined: dict[str, Any] = {**payload, **metadata}
    for canonical_key, aliases in METADATA_ALIASES.items():
        if canonical_key in metadata and metadata[canonical_key] not in (None, ""):
            continue
        for alias in aliases:
            value = combined.get(alias)
            if value not in (None, ""):
                metadata.setdefault(canonical_key, value)
                break


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
    if last_event_at and occurred_at:
        _occ = occurred_at if occurred_at.tzinfo else occurred_at.replace(tzinfo=timezone.utc)
        _last = last_event_at if last_event_at.tzinfo else last_event_at.replace(tzinfo=timezone.utc)
        if _occ < _last:
            return "SKIPPED_STALE"
    return None


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build_attachment_source_id(*, parent_source_type: str, parent_source_id: str, file_id: str) -> str:
    source_id = f"{parent_source_type}:{parent_source_id}:{file_id}"
    if len(source_id) <= 100:
        return source_id
    digest = sha256_text(source_id)[:16]
    return f"{parent_source_type}:{digest}"[:100]


def apply_attachment_metadata_defaults(*, metadata: dict[str, Any], source_type: str, payload: dict[str, Any]) -> None:
    if source_type not in ATTACHMENT_SOURCE_TYPES:
        return

    for target_key, candidate_keys in ATTACHMENT_METADATA_FIELDS.items():
        value = lookup_first_payload_value(payload, candidate_keys)
        if value not in (None, ""):
            metadata.setdefault(target_key, value)

    modules = lookup_first_payload_value(payload, ("modules", "moduleNames", "productModules"))
    if modules not in (None, ""):
        metadata.setdefault("modules", normalize_collection_value(modules))

    competitors = lookup_first_payload_value(payload, ("competitors",))
    if competitors not in (None, ""):
        metadata.setdefault("competitors", normalize_collection_value(competitors))

    if "parentSourceType" not in metadata or "parentSourceId" not in metadata:
        inferred_parent_type, inferred_parent_id = infer_attachment_parent(payload)
        if inferred_parent_type and inferred_parent_id not in (None, ""):
            metadata.setdefault("parentSourceType", inferred_parent_type)
            metadata.setdefault("parentSourceId", inferred_parent_id)

    if "rootSourceType" not in metadata or "rootSourceId" not in metadata:
        inferred_root_type, inferred_root_id = infer_attachment_root(payload)
        if inferred_root_type and inferred_root_id not in (None, ""):
            metadata.setdefault("rootSourceType", inferred_root_type)
            metadata.setdefault("rootSourceId", inferred_root_id)


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


def infer_attachment_root(payload: dict[str, Any]) -> tuple[str | None, Any]:
    for source_type, candidate_keys in ATTACHMENT_ROOT_ENTITY_FIELDS:
        value = lookup_first_payload_value(payload, candidate_keys)
        if value not in (None, ""):
            return source_type, value
    return None, None


def normalize_collection_value(value: Any) -> list[str] | str:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, tuple):
        return [str(item).strip() for item in value if str(item).strip()]
    text = str(value).strip()
    return text or ""
