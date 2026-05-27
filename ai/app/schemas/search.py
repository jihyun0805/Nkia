# 인수인계 메모: API 스키마 계층입니다. 외부 요청/응답 형태를 고정해 백엔드와 AI 서버 간 계약을 맞춥니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class QueryTimeRangeView(BaseModel):
    label: str | None = None
    startAt: str | None = None
    endAt: str | None = None


class QueryPlanView(BaseModel):
    task: str
    target: str
    answerStyle: str
    sourceTypes: list[str]
    filters: dict[str, list[str]]
    timeRange: QueryTimeRangeView | None = None
    missingFields: list[str]
    clarificationMessage: str | None = None
    confidence: float


class SearchRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str = Field(..., min_length=1, description="검색 질문")
    limit: int = Field(5, ge=1, le=20, description="반환할 chunk 개수")
    source_types: list[str] | None = Field(default=None, alias="sourceTypes", description="검색 대상 source_type 목록")
    attachment_session_id: str | None = Field(
        default=None,
        alias="attachmentSessionId",
        description="현재 챗봇 세션의 임시 첨부파일을 함께 검색할 세션 ID",
    )
    start_at: str | None = Field(default=None, alias="startAt", description="명시적 검색 시작 시각")
    end_at: str | None = Field(default=None, alias="endAt", description="명시적 검색 종료 시각")
    history: list[dict[str, str]] = Field(default_factory=list, description="이전 대화 히스토리")


class SearchResult(BaseModel):
    evidenceType: str = "retrieved_evidence"
    sourceType: str
    sourceId: str
    title: str | None
    chunkIndex: int
    distance: float
    vectorScore: float
    keywordScore: float
    finalScore: float
    matchedBy: list[str]
    content: str
    metadata: dict[str, Any]


class SearchResultGroups(BaseModel):
    retrievedEvidence: list[SearchResult] = Field(default_factory=list)
    structuredEvidence: list[SearchResult] = Field(default_factory=list)
    derivedSummaryEvidence: list[SearchResult] = Field(default_factory=list)


class SearchResponse(BaseModel):
    query: str
    searchMode: str
    route: str = "discovery"
    embeddingModel: str
    embeddingDimension: int
    retrievalConfidence: float | None = None
    confidenceBand: str | None = None
    confidenceReasons: list[str] = Field(default_factory=list)
    excludedSourceTypes: list[str]
    plan: QueryPlanView | None = None
    results: list[SearchResult]
    typedResults: SearchResultGroups = Field(default_factory=SearchResultGroups)

    @model_validator(mode="after")
    def populate_typed_results(self) -> "SearchResponse":
        if self.results and not (
            self.typedResults.retrievedEvidence
            or self.typedResults.structuredEvidence
            or self.typedResults.derivedSummaryEvidence
        ):
            for result in self.results:
                if result.evidenceType == "structured_evidence":
                    self.typedResults.structuredEvidence.append(result)
                elif result.evidenceType == "derived_summary_evidence":
                    self.typedResults.derivedSummaryEvidence.append(result)
                else:
                    self.typedResults.retrievedEvidence.append(result)
        return self


class SearchableDateRangeResponse(BaseModel):
    startAt: str | None = None
    endAt: str | None = None
