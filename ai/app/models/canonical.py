# 인수인계 메모: 챗봇 내부 모델 계층입니다. 의도, 검색 계획, 정규화 결과, 사용자 컨텍스트 같은 중간 상태를 정의합니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from __future__ import annotations

from pydantic import BaseModel, Field


class CanonicalWorkflowStage(BaseModel):
    stageKey: str
    stageLabel: str
    sourceType: str
    sourceId: str | None = None
    statusRaw: str | None = None
    statusNormalized: str = "UNKNOWN"
    actor: str | None = None
    actedAt: str | None = None
    summary: str | None = None
    isCurrentFocus: bool = False


class CanonicalWorkflowContext(BaseModel):
    opportunityCode: str
    opportunityName: str
    customerName: str | None = None
    currentStatus: str | None = None
    overallWorkflowStatus: str = "UNKNOWN"
    overallWorkflowLabel: str = "미확인"
    currentFocusStage: str | None = None
    stages: list[CanonicalWorkflowStage] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)


class CanonicalOpportunityContext(BaseModel):
    opportunityCode: str
    opportunityName: str
    customerName: str | None = None
    customerGroup: str | None = None
    customerType: str | None = None
    currentStatus: str | None = None
    businessType: str | None = None
    expectedAmount: int | float | None = None
    mainContent: str | None = None
    issueContent: str | None = None
    competitorStatus: str | None = None
    decisionStructure: str | None = None
    contactLine: str | None = None


class CanonicalContractContext(BaseModel):
    contractCode: str
    opportunityCode: str
    opportunityName: str
    customerName: str | None = None
    contractStatus: str | None = None
    contractAmount: int | float | None = None
    contractDate: str | None = None
    contractStartDate: str | None = None
    contractEndDate: str | None = None
    paymentTerms: str | None = None
    businessScope: str | None = None
    specialNotes: str | None = None


class CanonicalProjectContext(BaseModel):
    projectCode: str
    opportunityCode: str | None = None
    opportunityName: str
    customerName: str | None = None
    projectStatus: str | None = None
    pjtNo: str | None = None
    projectType: str | None = None
    projectOwner: str | None = None
    teamName: str | None = None
    deliveryDate: str | None = None
    latestReportCode: str | None = None
    latestResultStatus: str | None = None
    latestReportContent: str | None = None


class CanonicalMaintenanceContext(BaseModel):
    maintenanceCode: str
    opportunityCode: str | None = None
    opportunityName: str
    customerName: str | None = None
    contractType: str | None = None
    status: str | None = None
    maintenanceStartDate: str | None = None
    maintenanceEndDate: str | None = None
    detailContent: str | None = None
    latestSupportDate: str | None = None
    latestSupportType: str | None = None
    latestSupportContent: str | None = None
    latestSupportPerformance: str | None = None
