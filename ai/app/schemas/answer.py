# 인수인계 메모: API 스키마 계층입니다. 외부 요청/응답 형태를 고정해 백엔드와 AI 서버 간 계약을 맞춥니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.draft import DraftAction
from app.models.user_context import UserContext
from app.schemas.search import QueryPlanView


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, description="대화 메시지 본문")


class AnswerRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str = Field(..., min_length=1, description="답변할 질문")
    limit: int = Field(5, ge=1, le=10, description="답변 근거로 사용할 chunk 개수")
    source_types: list[str] | None = Field(default=None, alias="sourceTypes", description="검색 대상 source_type 목록")
    attachment_session_id: str | None = Field(
        default=None,
        alias="attachmentSessionId",
        description="현재 챗봇 세션에서 업로드한 임시 첨부파일을 검색에 포함할 세션 ID",
    )
    thread_id: str | None = Field(
        default=None,
        alias="threadId",
        description="공식 LangGraph 체크포인터에서 사용할 대화 스레드 ID",
    )
    start_at: str | None = Field(default=None, alias="startAt", description="명시적 검색 시작 시각")
    end_at: str | None = Field(default=None, alias="endAt", description="명시적 검색 종료 시각")
    history: list[ConversationMessage] = Field(default_factory=list, description="이전 대화 히스토리")
    user_context: UserContext | None = Field(
        default=None,
        alias="userContext",
        description="요청자 권한/식별 정보. 추후 권한 기반 근거 필터에 사용",
    )


class AnswerEvidence(BaseModel):
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


class AnswerEvidenceGroups(BaseModel):
    retrievedEvidence: list[AnswerEvidence] = Field(default_factory=list)
    structuredEvidence: list[AnswerEvidence] = Field(default_factory=list)
    derivedSummaryEvidence: list[AnswerEvidence] = Field(default_factory=list)


class AnswerResponse(BaseModel):
    query: str
    answer: str
    threadId: str | None = None
    route: str = "discovery"
    answerStatus: Literal["good_answer", "clarification", "insufficient_evidence", "upstream_degraded"] = "good_answer"
    embeddingModel: str
    chatModel: str
    retrievalConfidence: float | None = None
    confidenceBand: Literal["high", "medium", "low"] | None = None
    confidenceReasons: list[str] = Field(default_factory=list)
    appliedDefaults: list[str] = Field(default_factory=list)
    missingRequiredSlots: list[str] = Field(default_factory=list)
    degradedReason: str | None = None
    excludedSourceTypes: list[str]
    plan: QueryPlanView | None = None
    evidences: list[AnswerEvidence]
    typedEvidences: AnswerEvidenceGroups = Field(default_factory=AnswerEvidenceGroups)
    actions: list[DraftAction] = Field(
        default_factory=list,
        description="응답에 부착된 후속 액션. BE는 그대로 FE에 패스스루하고 FE는 버튼/카드 등으로 렌더한다",
    )

    @model_validator(mode="after")
    def populate_typed_evidences(self) -> "AnswerResponse":
        if self.evidences and not (
            self.typedEvidences.retrievedEvidence
            or self.typedEvidences.structuredEvidence
            or self.typedEvidences.derivedSummaryEvidence
        ):
            for evidence in self.evidences:
                if evidence.evidenceType == "structured_evidence":
                    self.typedEvidences.structuredEvidence.append(evidence)
                elif evidence.evidenceType == "derived_summary_evidence":
                    self.typedEvidences.derivedSummaryEvidence.append(evidence)
                else:
                    self.typedEvidences.retrievedEvidence.append(evidence)
        return self
