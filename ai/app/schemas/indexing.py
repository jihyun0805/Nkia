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


class IndexDocumentResult(BaseModel):
    sourceType: str
    sourceId: str
    operation: IndexOperation
    status: Literal["INDEXED", "DELETED", "SKIPPED_UNCHANGED", "SKIPPED_DUPLICATE", "SKIPPED_STALE", "SKIPPED_EMPTY"]
    chunkCount: int = 0
    message: str | None = None


class BatchIndexDocumentsResponse(BaseModel):
    results: list[IndexDocumentResult]
