# 인수인계: 엔키아 ERP의 상태명, 문서 타입, 도메인 별칭을 AI 내부 표준 값으로 맞추는 어댑터입니다.
# 핵심 흐름: 사용자 질문의 한국어 표현과 DB payload 키가 다를 때 이 매핑을 거쳐 검색/정형 조회 조건으로 들어갑니다.
# 같이 확인: 새 도메인이나 상태값을 추가하면 models/constants.py와 document_builder.py의 sourceType 처리도 확인하세요.
from __future__ import annotations

from typing import Any

from app.models.canonical import (
    CanonicalContractContext,
    CanonicalMaintenanceContext,
    CanonicalOpportunityContext,
    CanonicalProjectContext,
    CanonicalWorkflowContext,
    CanonicalWorkflowStage,
)
from app.models.constants import SNAPSHOT_ALIASES


WORKFLOW_STATUS_MAP = {
    "승인완료": "APPROVED",
    "승인": "APPROVED",
    "승인됨": "APPROVED",
    "접수완료": "APPROVED",
    "완료": "COMPLETED",
    "수주": "COMPLETED",
    "대기": "PENDING",
    "승인대기": "PENDING",
    "결재대기": "PENDING",
    "검토중": "IN_PROGRESS",
    "검토": "IN_PROGRESS",
    "진행중": "IN_PROGRESS",
    "제안": "IN_PROGRESS",
    "경쟁중": "IN_PROGRESS",
    "반려": "REJECTED",
    "실주": "REJECTED",
}


def normalize_workflow_status(value: str | None) -> str:
    normalized = (value or "").strip()
    if not normalized:
        return "UNKNOWN"
    return WORKFLOW_STATUS_MAP.get(normalized, "UNKNOWN")


def adapt_opportunity_snapshot(snapshot: dict[str, object]) -> CanonicalOpportunityContext:
    return CanonicalOpportunityContext(
        opportunityCode=_lookup(snapshot, "opportunity_code") or "",
        opportunityName=_lookup(snapshot, "opportunity_name") or "",
        customerName=_lookup(snapshot, "customer_name"),
        customerGroup=_lookup(snapshot, "customer_group"),
        customerType=_lookup(snapshot, "customer_type"),
        currentStatus=_lookup(snapshot, "current_status"),
        businessType=_lookup(snapshot, "business_type"),
        expectedAmount=_as_number(_lookup(snapshot, "expected_amount")),
        mainContent=_lookup(snapshot, "main_content"),
        issueContent=_lookup(snapshot, "issue_content"),
        competitorStatus=_lookup(snapshot, "competitor_status"),
        decisionStructure=_lookup(snapshot, "decision_structure"),
        contactLine=_lookup(snapshot, "contact_line"),
    )


def adapt_contract_snapshot(snapshot: dict[str, object]) -> CanonicalContractContext:
    return CanonicalContractContext(
        contractCode=_lookup(snapshot, "contract_code") or "",
        opportunityCode=_lookup(snapshot, "opportunity_code") or "",
        opportunityName=_lookup(snapshot, "opportunity_name") or "",
        customerName=_lookup(snapshot, "customer_name"),
        contractStatus=_lookup(snapshot, "contract_status"),
        contractAmount=_as_number(_lookup(snapshot, "contract_amount")),
        contractDate=_lookup(snapshot, "contract_date"),
        contractStartDate=_lookup(snapshot, "contract_start_date"),
        contractEndDate=_lookup(snapshot, "contract_end_date"),
        paymentTerms=_lookup(snapshot, "payment_terms"),
        businessScope=_lookup(snapshot, "business_scope"),
        specialNotes=_lookup(snapshot, "special_notes"),
    )


def adapt_project_snapshot(snapshot: dict[str, object]) -> CanonicalProjectContext:
    return CanonicalProjectContext(
        projectCode=_lookup(snapshot, "project_code") or "",
        opportunityCode=_lookup(snapshot, "opportunity_code"),
        opportunityName=_lookup(snapshot, "opportunity_name") or "",
        customerName=_lookup(snapshot, "customer_name"),
        projectStatus=_lookup(snapshot, "project_status"),
        pjtNo=_lookup(snapshot, "pjt_no"),
        projectType=_lookup(snapshot, "project_type"),
        projectOwner=_lookup(snapshot, "project_owner"),
        teamName=_lookup(snapshot, "team_name"),
        deliveryDate=_lookup(snapshot, "delivery_date"),
        latestReportCode=_lookup(snapshot, "project_report_code"),
        latestResultStatus=_lookup(snapshot, "result_status"),
        latestReportContent=_lookup(snapshot, "detail_content"),
    )


def adapt_maintenance_snapshot(snapshot: dict[str, object]) -> CanonicalMaintenanceContext:
    return CanonicalMaintenanceContext(
        maintenanceCode=_lookup(snapshot, "maintenance_code") or "",
        opportunityCode=_lookup(snapshot, "opportunity_code"),
        opportunityName=_lookup(snapshot, "opportunity_name") or "",
        customerName=_lookup(snapshot, "customer_name"),
        contractType=_lookup(snapshot, "contract_type"),
        status=_lookup(snapshot, "status"),
        maintenanceStartDate=_lookup(snapshot, "maintenance_start_date"),
        maintenanceEndDate=_lookup(snapshot, "maintenance_end_date"),
        detailContent=_lookup(snapshot, "detail_content"),
        latestSupportDate=_lookup(snapshot, "activity_date"),
        latestSupportType=_lookup(snapshot, "activity_type"),
        latestSupportContent=_lookup(snapshot, "activity_content"),
        latestSupportPerformance=_lookup(snapshot, "performance"),
    )


def adapt_workflow_snapshot(snapshot: dict[str, object]) -> CanonicalWorkflowContext:
    stages: list[CanonicalWorkflowStage] = []

    def add_stage(
        *,
        stage_key: str,
        stage_label: str,
        source_type: str,
        source_id: str | None,
        status_raw: str | None,
        actor: str | None,
        acted_at: str | None,
        summary: str | None,
    ) -> None:
        if not any([source_id, status_raw, summary]):
            return
        stages.append(
            CanonicalWorkflowStage(
                stageKey=stage_key,
                stageLabel=stage_label,
                sourceType=source_type,
                sourceId=source_id,
                statusRaw=status_raw,
                statusNormalized=normalize_workflow_status(status_raw),
                actor=actor,
                actedAt=acted_at,
                summary=summary,
            )
        )

    add_stage(
        stage_key="activity_request",
        stage_label="활동 요청",
        source_type="ACTIVITY_REQUEST",
        source_id=_lookup(snapshot, "request_code"),
        status_raw=_lookup(snapshot, "activity_request_status"),
        actor=_lookup(snapshot, "receiver_name"),
        acted_at=_lookup(snapshot, "activity_request_approved_at") or _lookup(snapshot, "activity_request_date"),
        summary=_lookup(snapshot, "request_content"),
    )
    add_stage(
        stage_key="prb_decision",
        stage_label="PRB 심의",
        source_type="PRB_RESULT",
        source_id=_lookup(snapshot, "prb_result_code") or _lookup(snapshot, "prb_code"),
        status_raw=_lookup(snapshot, "decision_status"),
        actor=None,
        acted_at=_lookup(snapshot, "prb_result_date"),
        summary=_lookup(snapshot, "final_opinion"),
    )
    add_stage(
        stage_key="won_report_approval",
        stage_label="수주보고 결재",
        source_type="ORDER_REPORT",
        source_id=_lookup(snapshot, "won_report_code"),
        status_raw=_lookup(snapshot, "approval_status"),
        actor=None,
        acted_at=_lookup(snapshot, "contract_date"),
        summary=_lookup(snapshot, "business_scope") or _lookup(snapshot, "special_notes"),
    )
    add_stage(
        stage_key="contract_execution",
        stage_label="계약 진행",
        source_type="CONTRACT",
        source_id=_lookup(snapshot, "contract_code"),
        status_raw=_lookup(snapshot, "contract_status"),
        actor=None,
        acted_at=_lookup(snapshot, "contract_signed_at"),
        summary=_lookup(snapshot, "contract_memo"),
    )

    current_focus = next(
        (stage for stage in stages if stage.statusNormalized in {"PENDING", "IN_PROGRESS", "REJECTED"}),
        None,
    )
    if current_focus is None and stages:
        current_focus = stages[0]
    if current_focus is not None:
        for stage in stages:
            stage.isCurrentFocus = stage.stageKey == current_focus.stageKey

    overall_status = current_focus.statusNormalized if current_focus is not None else "UNKNOWN"
    overall_label = (
        f"{current_focus.stageLabel} / {current_focus.statusRaw}"
        if current_focus is not None and current_focus.statusRaw
        else "미확인"
    )

    highlights = [
        line
        for line in [
            _format_highlight("활동 요청", _lookup(snapshot, "request_code"), _lookup(snapshot, "activity_request_status")),
            _format_highlight("PRB 심의", _lookup(snapshot, "prb_result_code") or _lookup(snapshot, "prb_code"), _lookup(snapshot, "decision_status")),
            _format_highlight("수주보고 결재", _lookup(snapshot, "won_report_code"), _lookup(snapshot, "approval_status")),
            _format_highlight("계약 진행", _lookup(snapshot, "contract_code"), _lookup(snapshot, "contract_status")),
        ]
        if line is not None
    ]

    return CanonicalWorkflowContext(
        opportunityCode=_lookup(snapshot, "opportunity_code") or "",
        opportunityName=_lookup(snapshot, "opportunity_name") or "",
        customerName=_lookup(snapshot, "customer_name"),
        currentStatus=_lookup(snapshot, "current_status"),
        overallWorkflowStatus=overall_status,
        overallWorkflowLabel=overall_label,
        currentFocusStage=current_focus.stageLabel if current_focus is not None else None,
        stages=stages,
        highlights=highlights,
    )


def _format_highlight(stage_label: str, source_id: object, status: object) -> str | None:
    if not source_id and not status:
        return None
    return f"{stage_label}: {source_id or '코드 미기재'} / {status or '상태 미기재'}"


def _lookup(snapshot: dict[str, Any], field: str) -> str | None:
    """SNAPSHOT_ALIASES 에 등록된 별칭 순서로 snapshot 에서 값을 찾아 반환한다.

    BE 가 SQL 쿼리 컬럼명을 바꾸면 constants.py 의 SNAPSHOT_ALIASES 에 새 키를 추가하면 된다.
    등록되지 않은 field 는 field 자체를 키로 직접 조회한다 (하위호환).
    """
    aliases = SNAPSHOT_ALIASES.get(field, (field,))
    for key in aliases:
        value = snapshot.get(key)
        if value is not None:
            text = str(value).strip()
            if text:
                return text
    return None


def _as_str(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _as_number(value: object) -> int | float | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        text = str(value).replace(",", "").strip()
        if "." in text:
            return float(text)
        return int(text)
    except Exception:
        return None
