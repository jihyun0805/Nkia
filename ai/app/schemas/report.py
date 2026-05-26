# 인수인계: report API 스키마 파일입니다.
# 핵심 흐름: 공개 모델: ManagementReportRequest, ReportMetric, ReportChartPoint, ReportChart, ReportTable, ManagementReportResponse. 외부 호출 계약을 표현합니다.
# 같이 확인: 필드 추가/삭제는 백엔드 Java DTO와 프론트 TypeScript 타입까지 영향이 있습니다.
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.user_context import UserContext
from app.schemas.answer import AnswerEvidence


ReportType = Literal["management", "sales", "risk", "project", "maintenance", "custom"]
ReportStatus = Literal["good_report", "insufficient_evidence", "upstream_degraded"]


class ManagementReportRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str = Field(..., min_length=1)
    title: str | None = None
    report_type: ReportType = Field(default="management", alias="reportType")
    limit: int = Field(default=10, ge=3, le=20)
    source_types: list[str] | None = Field(default=None, alias="sourceTypes")
    attachment_session_id: str | None = Field(default=None, alias="attachmentSessionId")
    start_at: str | None = Field(default=None, alias="startAt")
    end_at: str | None = Field(default=None, alias="endAt")
    customer_group: str | None = Field(default=None, alias="customerGroup")
    business_types: list[str] = Field(default_factory=list, alias="businessTypes")
    statuses: list[str] = Field(default_factory=list)
    sections: list[str] = Field(default_factory=list)
    audience: str = "executive"
    analytics_context: dict[str, Any] = Field(default_factory=dict, alias="analyticsContext")
    user_context: UserContext | None = Field(default=None, alias="userContext")


class ReportMetric(BaseModel):
    label: str
    value: Any
    unit: str | None = None
    description: str | None = None


class ReportChartPoint(BaseModel):
    label: str
    value: Any
    extra: dict[str, Any] = Field(default_factory=dict)


class ReportChart(BaseModel):
    type: str
    title: str
    xKey: str | None = None
    yKey: str | None = None
    data: list[ReportChartPoint] = Field(default_factory=list)


class ReportTable(BaseModel):
    title: str
    columns: list[str] = Field(default_factory=list)
    rows: list[list[Any]] = Field(default_factory=list)


class ManagementReportResponse(BaseModel):
    query: str
    title: str
    reportType: ReportType
    reportStatus: ReportStatus
    report: str
    embeddingModel: str
    chatModel: str
    retrievalConfidence: float | None = None
    confidenceBand: str | None = None
    confidenceReasons: list[str] = Field(default_factory=list)
    sourceTypes: list[str] = Field(default_factory=list)
    metrics: list[ReportMetric] = Field(default_factory=list)
    charts: list[ReportChart] = Field(default_factory=list)
    tables: list[ReportTable] = Field(default_factory=list)
    evidences: list[AnswerEvidence] = Field(default_factory=list)
    degradedReason: str | None = None
