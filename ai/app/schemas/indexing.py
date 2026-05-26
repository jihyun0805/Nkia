# 인수인계: indexing API 스키마 파일입니다.
# 핵심 흐름: 공개 모델: IndexDocumentRequest, BatchIndexDocumentsRequest, IndexAttachmentRequest, BatchIndexAttachmentsRequest, IndexDocumentResult, BatchIndexDocumentsResponse. 외부 호출 계약을 표현합니다.
# 같이 확인: 필드 추가/삭제는 백엔드 Java DTO와 프론트 TypeScript 타입까지 영향이 있습니다.
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


IndexOperation = Literal["UPSERT", "DELETE"]


class IndexDocumentRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source_type: str = Field(..., alias="sourceType", min_length=1, max_length=50)
    source_id: str = Field(..., alias="sourceId", min_length=1, max_length=100)
    operation: IndexOperation = "UPSERT"
    title: str | None = Field(default=None, max_length=500)
    source_path: str | None = Field(default=None, alias="sourcePath")
    content: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    deleted: bool = False
    deleted_at: datetime | None = Field(default=None, alias="deletedAt")
    event_id: str | None = Field(default=None, alias="eventId", max_length=120)
    occurred_at: datetime | None = Field(default=None, alias="occurredAt")


class BatchIndexDocumentsRequest(BaseModel):
    documents: list[IndexDocumentRequest] = Field(..., min_length=1, max_length=100)


class IndexAttachmentRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    file_id: str = Field(..., alias="fileId", min_length=1, max_length=100)
    parent_source_type: str = Field(..., alias="parentSourceType", min_length=1, max_length=50)
    parent_source_id: str = Field(..., alias="parentSourceId", min_length=1, max_length=100)
    operation: IndexOperation = "UPSERT"
    file_name: str | None = Field(default=None, alias="fileName", max_length=500)
    source_path: str | None = Field(default=None, alias="sourcePath")
    extracted_text: str | None = Field(default=None, alias="extractedText")
    extension: str | None = Field(default=None, max_length=30)
    file_type: str | None = Field(default=None, alias="fileType", max_length=200)
    page_count: int | None = Field(default=None, alias="pageCount", ge=0)
    root_source_type: str | None = Field(default=None, alias="rootSourceType", max_length=50)
    root_source_id: str | None = Field(default=None, alias="rootSourceId", max_length=100)
    document_stage: str | None = Field(default=None, alias="documentStage", max_length=100)
    business_domain: str | None = Field(default=None, alias="businessDomain", max_length=100)
    evidence_group_key: str | None = Field(default=None, alias="evidenceGroupKey", max_length=150)
    metadata: dict[str, Any] = Field(default_factory=dict)
    deleted: bool = False
    deleted_at: datetime | None = Field(default=None, alias="deletedAt")
    event_id: str | None = Field(default=None, alias="eventId", max_length=120)
    occurred_at: datetime | None = Field(default=None, alias="occurredAt")


class BatchIndexAttachmentsRequest(BaseModel):
    attachments: list[IndexAttachmentRequest] = Field(..., min_length=1, max_length=100)


class IndexDocumentResult(BaseModel):
    sourceType: str
    sourceId: str
    operation: IndexOperation
    status: Literal["INDEXED", "DELETED", "SKIPPED_UNCHANGED", "SKIPPED_DUPLICATE", "SKIPPED_STALE", "SKIPPED_EMPTY"]
    chunkCount: int = 0
    message: str | None = None


class BatchIndexDocumentsResponse(BaseModel):
    results: list[IndexDocumentResult]
