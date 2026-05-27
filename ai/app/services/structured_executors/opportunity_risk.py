# 인수인계 메모: 챗봇 서비스 계층입니다. 색인, 검색, 근거 선별, 답변 생성, 추천/비교 등 실제 업무 로직이 모여 있습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from app.embeddings.model import EmbeddingModel
from app.repositories.backend_query_repository import (
    fetch_maintenance_history,
    fetch_prb_snapshot,
    fetch_project_progress_rows,
)
from app.schemas.answer import AnswerEvidence, AnswerResponse

KST = timezone(timedelta(hours=9))


def answer_entity_risk_focus_query(
    *,
    query: str,
    opportunity_code: str,
    opportunity_name: str,
    start_at: str | None,
    end_at: str | None,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse | None:
    prb_snapshot = fetch_prb_snapshot(opportunity_code=opportunity_code)
    project_rows = fetch_project_progress_rows(opportunity_code=opportunity_code, limit=3)
    maintenance_rows = fetch_maintenance_history(
        opportunity_code=opportunity_code,
        start_at=start_at,
        end_at=end_at,
        limit=4,
    )
    if prb_snapshot is None and not project_rows and not maintenance_rows:
        return None

    customer_name = None
    if prb_snapshot is not None:
        customer_name = prb_snapshot.get("customer_name")
    elif project_rows:
        customer_name = project_rows[0].get("customer_name")
    elif maintenance_rows:
        customer_name = maintenance_rows[0].get("customer_name")

    prb_risk = summarize_text(prb_snapshot.get("risk_factors") if prb_snapshot else None)
    prb_review = summarize_text(prb_snapshot.get("risk_review") if prb_snapshot else None)
    project_points = extract_project_risk_points(project_rows)
    maintenance_points = extract_maintenance_risk_points(maintenance_rows)

    lead_risk = (
        prb_risk
        or (project_points[0] if project_points else None)
        or (maintenance_points[0] if maintenance_points else None)
        or "현재 데이터에서 특정 리스크를 명확히 확인하기 어렵습니다."
    )

    answer_lines = [
        f"핵심 결론: {opportunity_name} 진행 과정에서 가장 주의가 필요했던 리스크는 {lead_risk}",
    ]
    if customer_name:
        answer_lines.extend(["", f"고객사: {customer_name}"])

    if prb_risk or prb_review:
        answer_lines.extend(
            [
                "",
                "사전 심의(PRB) 기준:",
                f"- 핵심 리스크: {prb_risk or '미기재'}",
            ]
        )
        if prb_review and prb_review != prb_risk:
            answer_lines.append(f"- 리스크 검토 의견: {prb_review}")

    if project_points:
        answer_lines.extend(["", "프로젝트 진행 중 확인된 이슈:"])
        answer_lines.extend([f"- {point}" for point in project_points[:2]])

    if maintenance_points:
        answer_lines.extend(["", "운영/유지보수 과정에서 드러난 이슈:"])
        answer_lines.extend([f"- {point}" for point in maintenance_points[:2]])

    if not (project_points or maintenance_points) and prb_snapshot is not None:
        answer_lines.extend(
            [
                "",
                "참고: 현재 확보된 운영/프로젝트 상세 이슈가 많지 않아, PRB에 기록된 리스크를 우선 근거로 제시했습니다.",
            ]
        )

    evidences = build_entity_risk_evidences(
        prb_snapshot=prb_snapshot,
        project_rows=project_rows,
        maintenance_rows=maintenance_rows,
        limit=limit,
    )
    return AnswerResponse(
        query=query,
        answer="\n".join(answer_lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def summarize_text(value: Any, *, max_length: int = 140) -> str | None:
    text = " ".join(str(value or "").split())
    if not text:
        return None
    return text if len(text) <= max_length else f"{text[: max_length - 1].rstrip()}…"


def extract_project_risk_points(rows: list[dict[str, Any]]) -> list[str]:
    points: list[str] = []
    seen: set[str] = set()
    for row in rows:
        summary = summarize_text(row.get("detail_content"))
        if not summary or summary in seen:
            continue
        seen.add(summary)
        report_date = format_timestamp(row.get("report_date"))
        points.append(f"{report_date} 결과보고: {summary}")
    return points


def extract_maintenance_risk_points(rows: list[dict[str, Any]]) -> list[str]:
    points: list[str] = []
    seen: set[str] = set()
    for row in rows:
        activity = summarize_text(row.get("activity_content"))
        performance = summarize_text(row.get("performance"))
        summary = activity or performance
        if not summary:
            continue
        if performance and performance != activity:
            summary = f"{activity or '활동 내용 미기재'} / 조치 결과: {performance}"
        if summary in seen:
            continue
        seen.add(summary)
        activity_date = format_timestamp(row.get("activity_date"))
        points.append(f"{activity_date} {row.get('activity_type') or '지원'}: {summary}")
    return points


def build_entity_risk_evidences(
    *,
    prb_snapshot: dict[str, Any] | None,
    project_rows: list[dict[str, Any]],
    maintenance_rows: list[dict[str, Any]],
    limit: int,
) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    if prb_snapshot is not None:
        if prb_snapshot.get("prb_code"):
            evidences.append(
                build_structured_snapshot_evidence(
                    source_type="PRB",
                    source_id=str(prb_snapshot.get("prb_code")),
                    title=str(prb_snapshot.get("opportunity_name") or prb_snapshot.get("prb_code")),
                    detail_keys=["risk_factors", "expected_win_rate", "prb_date"],
                    snapshot=prb_snapshot,
                )
            )
        if prb_snapshot.get("prb_result_code"):
            evidences.append(
                build_structured_snapshot_evidence(
                    source_type="PRB_RESULT",
                    source_id=str(prb_snapshot.get("prb_result_code")),
                    title=str(prb_snapshot.get("opportunity_name") or prb_snapshot.get("prb_result_code")),
                    detail_keys=["risk_review", "final_opinion", "decision_status"],
                    snapshot=prb_snapshot,
                )
            )
    for row in project_rows[:2]:
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="PROJECT_RESULT_REPORT",
                sourceId=str(row.get("project_report_code") or row.get("project_code") or row.get("opportunity_code")),
                title=f"{row.get('opportunity_name') or '사업'} 프로젝트 진행 근거",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{format_timestamp(row.get('report_date'))} / "
                    f"{row.get('result_status') or row.get('project_status') or '미기재'} / "
                    f"{row.get('detail_content') or '미기재'}"
                ),
                metadata={
                    "opportunityCode": row.get("opportunity_code"),
                    "projectCode": row.get("project_code"),
                },
            )
        )
    for row in maintenance_rows[:2]:
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="CUSTOMER_SUPPORT",
                sourceId=str(row.get("support_code") or row.get("opportunity_code")),
                title=f"{row.get('opportunity_name') or '사업'} 운영/유지보수 이력",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{format_timestamp(row.get('activity_date'))} / {row.get('activity_type') or '활동'} / "
                    f"{row.get('activity_content') or '미기재'} / "
                    f"{row.get('performance') or '미기재'}"
                ),
                metadata={
                    "opportunityCode": row.get("opportunity_code"),
                    "maintenanceCode": row.get("maintenance_code"),
                },
            )
        )
    return evidences[: max(limit, 3)]


def build_structured_snapshot_evidence(
    *,
    source_type: str,
    source_id: str,
    title: str,
    detail_keys: list[str],
    snapshot: dict[str, Any],
) -> AnswerEvidence:
    details = []
    for key in detail_keys:
        value = snapshot.get(key)
        if value in (None, "", []):
            continue
        details.append(f"{key}: {value}")
    content = "\n".join(
        [
            f"sourceType: {source_type}",
            f"sourceId: {source_id}",
            f"title: {title}",
            *details,
        ]
    )
    return AnswerEvidence(
        evidenceType="structured_evidence",
        sourceType=source_type,
        sourceId=source_id,
        title=title,
        chunkIndex=0,
        distance=0.0,
        vectorScore=1.0,
        keywordScore=1.0,
        finalScore=1.0,
        matchedBy=["structured_snapshot"],
        content=content,
        metadata={"snapshotBased": True},
    )


def format_timestamp(value: Any) -> str:
    if value is None:
        return "미기재"
    if isinstance(value, datetime):
        return value.astimezone(KST).strftime("%Y-%m-%d %H:%M")
    return str(value)


def format_number(value: Any, suffix: str = "원") -> str:
    if value is None:
        return "미기재"
    if isinstance(value, Decimal):
        normalized = value.quantize(Decimal("1")) if value == value.to_integral() else value.normalize()
        text = f"{normalized:,}"
    elif isinstance(value, float):
        text = f"{value:,.2f}".rstrip("0").rstrip(".")
    elif isinstance(value, int):
        text = f"{value:,}"
    else:
        text = str(value)
    if suffix and text != "미기재":
        return f"{text}{suffix}"
    return text
