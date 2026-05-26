# 인수인계 메모: API 스키마 계층입니다. 외부 요청/응답 형태를 고정해 백엔드와 AI 서버 간 계약을 맞춥니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.user_context import UserContext
from app.schemas.answer import AnswerEvidence


ReportType = Literal["management", "sales", "risk", "project", "maintenance", "custom"]
ReportStatus = Literal["good_report", "insufficient_evidence", "upstream_degraded"]


class ManagementReportRequest(BaseModel):
    # Java 백엔드의 camelCase 요청 필드와 Python 내부 snake_case 필드를 함께 허용한다.
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
    # 화면 상단 KPI처럼 짧게 보여줄 단일 지표 정보다.
    label: str
    value: Any
    unit: str | None = None
    description: str | None = None


class ReportChartPoint(BaseModel):
    # 차트 데이터의 한 점을 표현하며, extra에는 차트별 부가 메타데이터를 담을 수 있다.
    label: str
    value: Any
    extra: dict[str, Any] = Field(default_factory=dict)


class ReportChart(BaseModel):
    # 리포트와 함께 렌더링할 차트 모델이다.
    type: str
    title: str
    xKey: str | None = None
    yKey: str | None = None
    data: list[ReportChartPoint] = Field(default_factory=list)


class ReportTable(BaseModel):
    # 리포트 보조 표의 제목, 컬럼, 행 데이터를 담는다.
    title: str
    columns: list[str] = Field(default_factory=list)
    rows: list[list[Any]] = Field(default_factory=list)


class ManagementReportResponse(BaseModel):
    # AI 서비스가 백엔드로 반환하는 경영 리포트 전체 응답 계약이다.
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
