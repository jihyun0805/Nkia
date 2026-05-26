# 인수인계: 사업기회 추천/주의사항 답변을 생성하는 서비스입니다.
# 핵심 흐름: 유사 수주 사례나 리스크 신호를 근거로 제안 방향을 만들고 LangGraph recommendation 노드가 호출합니다.
# 같이 확인: 추천 로직 변경 시 similar_opportunity_service.py와 프론트 액션 안내 문구를 같이 확인하세요.
from __future__ import annotations

from typing import Any

from app.repositories.backend_query_repository import (
    fetch_opportunity_snapshot,
    fetch_maintenance_snapshot_by_opportunity,
    resolve_primary_opportunity,
)


# 라이프사이클 단계별 추천 액션
# priority: high/medium/low, form: draft_registry의 type 키 (없으면 None)
_PHASE_RECOMMENDATIONS: dict[str, list[dict[str, str | None]]] = {
    "DISCOVERY": [
        {"priority": "high", "action": "영업활동 등록",
         "detail": "고객 접촉 기록을 영업활동으로 등록하고 이력을 시작하세요.", "form": "sales_activity"},
        {"priority": "medium", "action": "사업기회 정보 보완",
         "detail": "예상 금액·입찰 예정일·경쟁사 현황을 파악해 사업기회에 업데이트하세요.", "form": None},
    ],
    "SALES_ACTIVITY": [
        {"priority": "high", "action": "견적서 작성",
         "detail": "고객 예산 규모를 파악한 후 견적서를 준비하세요.", "form": "quotation"},
        {"priority": "medium", "action": "영업활동 지속 기록",
         "detail": "미팅·통화 내용을 영업활동으로 기록해 이력을 관리하세요.", "form": "sales_activity"},
    ],
    "QUOTATION": [
        {"priority": "high", "action": "RFP 분석 준비",
         "detail": "RFP가 접수되었으면 RFP 분석 초안을 작성하세요.", "form": "rfp_analysis"},
        {"priority": "medium", "action": "PRB 보고서 검토",
         "detail": "입찰 의사결정이 필요한 경우 PRB 보고서를 준비하세요.", "form": "prb_report"},
    ],
    "RFP_ANALYSIS": [
        {"priority": "high", "action": "PRB 보고서 작성",
         "detail": "RFP 분석 결과를 기반으로 PRB 보고서를 작성하세요.", "form": "prb_report"},
        {"priority": "medium", "action": "제안서 준비 시작",
         "detail": "제안팀과 협의해 제안서 작성 일정을 잡으세요.", "form": "proposal"},
    ],
    "PRB_REVIEW": [
        {"priority": "high", "action": "PRB 심의 요청",
         "detail": "PRB 보고서가 완성되면 심의를 요청하세요.", "form": None},
        {"priority": "high", "action": "제안서 병행 준비",
         "detail": "심의 결과와 무관하게 제안서 초안을 준비해두세요.", "form": "proposal"},
    ],
    "PRB_RESULT_REVIEW": [
        {"priority": "high", "action": "PRB 결과 등록",
         "detail": "PRB 심의 결과를 PRB 결과에 등록하세요.", "form": "prb_result"},
        {"priority": "high", "action": "제안서 최종 제출",
         "detail": "승인된 경우 제안서를 최종 제출하세요.", "form": "proposal"},
    ],
    "PROPOSAL_PREPARATION": [
        {"priority": "high", "action": "입찰 결과 등록 준비",
         "detail": "제안서 제출 후 입찰 결과를 등록하세요.", "form": "bid_result"},
        {"priority": "medium", "action": "제출 마감일 재확인",
         "detail": "제안서 제출 마감일과 심사 일정을 다시 확인하세요.", "form": None},
    ],
    "ORDER_CONFIRMED": [
        {"priority": "high", "action": "계약 체결 진행",
         "detail": "수주보고 승인 후 계약서를 작성하고 체결하세요.", "form": None},
        {"priority": "high", "action": "프로젝트 팀 구성",
         "detail": "PM과 팀원을 배정하고 PJT 번호를 발행받으세요.", "form": None},
    ],
    "PROJECT_EXECUTION": [
        {"priority": "high", "action": "납기일 일정 점검",
         "detail": "납기일 기준으로 일정을 점검하고 리스크를 관리하세요.", "form": None},
        {"priority": "medium", "action": "청구 계획 확인",
         "detail": "계약서의 청구 조건에 따라 청구서 발행을 준비하세요.", "form": None},
        {"priority": "medium", "action": "결과 보고 준비",
         "detail": "프로젝트 완료 시 결과 보고서를 작성하세요.", "form": "project_result_report"},
    ],
    "WARRANTY_MAINTENANCE": [
        {"priority": "high", "action": "유상 전환 견적 준비",
         "detail": "무상 유지보수 만료 전 유상 전환 견적을 준비하세요.", "form": "quotation"},
        {"priority": "medium", "action": "고객지원 기록 유지",
         "detail": "지원 내역을 고객지원으로 기록하세요.", "form": None},
    ],
    "PAID_MAINTENANCE": [
        {"priority": "high", "action": "유지보수 견적 갱신",
         "detail": "계약 만료 전 갱신 견적을 준비하세요.", "form": "quotation"},
        {"priority": "medium", "action": "추가 사업 기회 발굴",
         "detail": "운영 중 발견된 업그레이드·확장 기회를 검토하세요.", "form": None},
    ],
    "INTEGRATED_SUPPORT": [
        {"priority": "high", "action": "통합지원 계약 갱신",
         "detail": "갱신 일정을 확인하고 견적을 준비하세요.", "form": "quotation"},
        {"priority": "medium", "action": "고객 만족도 점검",
         "detail": "정기 미팅을 통해 고객 만족도를 확인하고 기록하세요.", "form": None},
    ],
    "LOST": [
        {"priority": "medium", "action": "실주 원인 분석",
         "detail": "경쟁사와의 차이, 가격 경쟁력, 제안 품질을 분석해 기록하세요.", "form": None},
        {"priority": "low", "action": "재도전 기회 탐색",
         "detail": "차기 발주 때 재도전하기 위해 고객사와 관계를 유지하세요.", "form": None},
    ],
}


def _derive_lifecycle_phase(snapshot: dict[str, Any]) -> str:
    """fetch_opportunity_snapshot 결과에서 라이프사이클 단계를 추론한다."""
    rfp_code = snapshot.get("rfp_code") or snapshot.get("rfp_analysis_code")
    won_code = snapshot.get("won_code") or snapshot.get("won_report_code")
    if snapshot.get("current_status") == "실주":
        return "LOST"
    if snapshot.get("maintenance_code"):
        return "PAID_MAINTENANCE"  # 유지보수 타입 세분화는 별도 조회 필요
    if snapshot.get("project_code"):
        return "PROJECT_EXECUTION"
    if won_code:
        return "ORDER_CONFIRMED"
    if snapshot.get("prb_code") and rfp_code:
        return "PRB_RESULT_REVIEW"
    if snapshot.get("prb_code"):
        return "PRB_REVIEW"
    if rfp_code:
        return "RFP_ANALYSIS"
    return "DISCOVERY"


def build_opportunity_recommendations(
    *,
    opportunity_code: str | None = None,
    query_terms: list[str] | None = None,
    exact_codes: list[str] | None = None,
) -> dict[str, Any] | None:
    """사업기회 코드 또는 검색어로 추천을 생성한다.

    Returns None if no opportunity can be resolved.
    """
    if not opportunity_code and (query_terms or exact_codes):
        entity = resolve_primary_opportunity(
            query_terms=query_terms or [],
            exact_codes=exact_codes or [],
        )
        if entity:
            opportunity_code = entity.get("opportunity_code")

    if not opportunity_code:
        return None

    snapshot = fetch_opportunity_snapshot(opportunity_code=opportunity_code)
    if snapshot is None:
        return None

    lifecycle_phase = _derive_lifecycle_phase(snapshot)

    # 유지보수 타입 세분화 (무상 / 통합지원)
    if lifecycle_phase == "PAID_MAINTENANCE" and snapshot.get("maintenance_code"):
        mnt = fetch_maintenance_snapshot_by_opportunity(opportunity_code=opportunity_code)
        if mnt:
            contract_type = mnt.get("contract_type") or ""
            if contract_type == "무상":
                lifecycle_phase = "WARRANTY_MAINTENANCE"
            elif contract_type == "통합지원":
                lifecycle_phase = "INTEGRATED_SUPPORT"

    recommendations = _PHASE_RECOMMENDATIONS.get(lifecycle_phase, [])
    rfp_code = snapshot.get("rfp_code") or snapshot.get("rfp_analysis_code")
    won_report_code = snapshot.get("won_report_code")
    won_code = snapshot.get("won_code") or won_report_code or opportunity_code

    return {
        "opportunityCode": opportunity_code,
        "opportunityName": snapshot.get("opportunity_name") or "",
        "customerName": snapshot.get("customer_name") or "",
        "currentStatus": snapshot.get("current_status") or "",
        "lifecyclePhase": lifecycle_phase,
        "recommendations": recommendations,
        "suggestedForms": list({r["form"] for r in recommendations if r.get("form")}),
        "prbCode": snapshot.get("prb_code"),
        "rfpCode": rfp_code,
        "wonCode": won_code,
        "wonReportCode": won_report_code,
        "projectCode": snapshot.get("project_code"),
        "maintenanceCode": snapshot.get("maintenance_code"),
    }


def format_recommendation_answer(result: dict[str, Any]) -> str:
    phase_labels = {
        "DISCOVERY": "발굴",
        "SALES_ACTIVITY": "영업활동 진행",
        "QUOTATION": "견적 단계",
        "RFP_ANALYSIS": "RFP 분석",
        "PRB_REVIEW": "PRB 심의 준비",
        "PRB_RESULT_REVIEW": "PRB 결과 검토",
        "PROPOSAL_PREPARATION": "제안 준비",
        "ORDER_CONFIRMED": "수주 확정",
        "PROJECT_EXECUTION": "프로젝트 진행 중",
        "WARRANTY_MAINTENANCE": "무상 유지보수",
        "PAID_MAINTENANCE": "유상 유지보수",
        "INTEGRATED_SUPPORT": "통합지원",
        "LOST": "실주",
    }
    phase = result["lifecyclePhase"]
    phase_label = phase_labels.get(phase, phase)
    opp_name = result["opportunityName"] or result["opportunityCode"]
    customer = result["customerName"]
    status = result["currentStatus"]

    lines = [
        f"**{opp_name}** ({customer}) — 현재 단계: {phase_label} / 상태: {status}",
        "",
        "### 다음 단계 추천",
    ]
    for i, rec in enumerate(result["recommendations"], 1):
        priority_icon = {"high": "🔴", "medium": "🟡", "low": "⚪"}.get(rec["priority"], "•")
        form_hint = f"  → 폼: **{rec['form']}** 초안 작성 가능" if rec.get("form") else ""
        lines.append(f"{i}. {priority_icon} **{rec['action']}**")
        lines.append(f"   {rec['detail']}{form_hint}")

    if result.get("suggestedForms"):
        forms = ", ".join(result["suggestedForms"])
        lines += ["", f"💡 이 단계에서 바로 작성할 수 있는 폼: **{forms}**"]

    return "\n".join(lines)
