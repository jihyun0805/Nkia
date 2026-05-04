import re
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from app.embeddings.model import EmbeddingModel
from app.langgraph.state import GraphState
from app.repositories.backend_query_repository import (
    fetch_prb_risk_rows,
    fetch_project_result_highlight_in_range,
)
from app.schemas.answer import AnswerEvidence, AnswerResponse


RISK_PATTERNS: list[tuple[str, tuple[str, ...]]] = [
    (
        "시스템 연계/이행 조율 리스크",
        ("현행 시스템 연계", "단계별 이행 계획", "이행 계획 조율", "병행운영", "통합", "연계"),
    ),
    (
        "보안/규제 대응 리스크",
        ("보안 요구사항", "보안", "규제", "보험권", "컴플라이언스"),
    ),
    (
        "프로세스/데이터 정비 리스크",
        ("프로세스 표준화", "데이터 정합성", "업무 프로세스", "표준화"),
    ),
    (
        "교육/내부 설득 리스크",
        ("교육 일정", "운영부서 설득", "설득이 필요", "파일럿 대상"),
    ),
    (
        "운영 체계/SLA 리스크",
        ("sla", "운영 체계", "운영 조직", "안정화"),
    ),
    ("고객 의사결정 지연", ("의사결정 지연", "결정 지연", "승인 지연", "결재 지연")),
    ("경쟁 심화/대체 공급자 검토", ("대체 공급자", "경쟁 심화", "경쟁사", "대체 벤더")),
    ("신뢰 저하/관계 악화", ("신뢰 저하", "관계 악화", "관계 이슈", "신뢰 문제")),
    ("기술 우위 부족", ("기술 우위 부족", "기술 경쟁력 부족", "기술 상의 우위 부족", "기술 적합성")),
    ("보안/장애 리스크", ("보안 문제", "보안 리스크", "장애", "중단", "무중단 전환")),
    ("예산/수익성 제약", ("예산", "비용", "수익성", "이익률", "단가")),
    ("일정/자원 리스크", ("일정", "납기", "자원 부족", "인력 부족", "지연")),
]


def answer_discovery_summary_query(
    *,
    query: str,
    graph_state: GraphState,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse | None:
    intent = graph_state.intent or ""
    if intent == "pattern_discovery":
        return answer_prb_risk_patterns(
            query=query,
            graph_state=graph_state,
            limit=limit,
            embedder=embedder,
        )
    if intent == "result_highlight":
        return answer_project_result_highlights(
            query=query,
            graph_state=graph_state,
            limit=limit,
            embedder=embedder,
        )
    return None


def answer_prb_risk_patterns(
    *,
    query: str,
    graph_state: GraphState,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    effective_start_at = graph_state.timeRange.startAt
    effective_end_at = graph_state.timeRange.endAt
    effective_label = graph_state.timeRange.label or "지정 기간"
    expanded_window = False
    rows = fetch_prb_risk_rows(
        start_at=effective_start_at,
        end_at=effective_end_at,
        limit=max(limit * 8, 40),
    )
    if not rows and "time_range:recent->90d" in graph_state.appliedDefaults and graph_state.timeRange.endAt:
        expanded_window = True
        end_dt = datetime.fromisoformat(graph_state.timeRange.endAt)
        start_dt = end_dt - timedelta(days=364)
        effective_start_at = start_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        effective_label = "최근 1년"
        rows = fetch_prb_risk_rows(
            start_at=effective_start_at,
            end_at=effective_end_at,
            limit=max(limit * 8, 40),
        )
    if not rows:
        return build_insufficient_discovery_response(query=query, graph_state=graph_state, embedder=embedder)

    signature_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        signature = extract_risk_signature(row)
        if signature:
            signature_groups[signature].append(row)

    repeated_signature_groups = [
        (signature, group_rows)
        for signature, group_rows in signature_groups.items()
        if len(group_rows) >= 2
    ]
    repeated_signature_groups.sort(key=lambda item: len(item[1]), reverse=True)

    if repeated_signature_groups:
        top_groups = repeated_signature_groups[: max(3, min(limit, 5))]
        intro_line = f"핵심 결론: {effective_label} PRB 기준으로 실제로 반복된 리스크 문구는 다음과 같습니다."
        if expanded_window:
            intro_line = (
                "핵심 결론: 최근 90일 내 PRB가 충분하지 않아, 최근 1년의 PRB를 기준으로 실제로 반복된 리스크 문구를 정리했습니다."
            )
        answer_lines = [intro_line, ""]
        evidences: list[AnswerEvidence] = []

        for idx, (signature, group_rows) in enumerate(top_groups, start=1):
            top_examples = group_rows[:2]
            answer_lines.append(f"{idx}. {signature}: {len(group_rows)}건")
            answer_lines.append("   예시 사업: " + ", ".join(example["opportunity_name"] for example in top_examples))
            answer_lines.append("   대표 근거: " + summarize_risk_row(top_examples[0]))
            answer_lines.append("")
            evidences.append(
                AnswerEvidence(
                    evidenceType="derived_summary_evidence",
                    sourceType="PRB_RESULT",
                    sourceId=f"discovery-risk:{idx}",
                    title=f"{signature} 반복 근거",
                    chunkIndex=0,
                    distance=0.0,
                    vectorScore=0.0,
                    keywordScore=0.0,
                    finalScore=float(len(group_rows)),
                    matchedBy=["derived_summary"],
                    content="\n".join(summarize_risk_row(row) for row in top_examples),
                    metadata={
                        "pattern": signature,
                        "count": len(group_rows),
                        "examples": [
                            {
                                "opportunityCode": row["opportunity_code"],
                                "opportunityName": row["opportunity_name"],
                                "customerName": row["customer_name"],
                                "prbCode": row.get("prb_code"),
                                "prbResultCode": row.get("prb_result_code"),
                            }
                            for row in top_examples
                        ],
                        "timeRange": {
                            "label": effective_label,
                            "startAt": effective_start_at,
                            "endAt": effective_end_at,
                        },
                    },
                )
            )

        confidence_reasons = ["discovery_summary_rule", "time_filter_applied", "pattern_aggregation", "risk_signature_grouping"]
        applied_defaults = list(graph_state.appliedDefaults)
        if expanded_window:
            confidence_reasons.append("expanded_prb_pattern_time_window")
            applied_defaults.append("time_range:recent_prb_patterns->365d_fallback")

        return AnswerResponse(
            query=query,
            answer="\n".join(answer_lines).strip(),
            route="discovery",
            answerStatus="good_answer",
            embeddingModel=embedder.config.model_name,
            chatModel="discovery-summary-engine",
            retrievalConfidence=0.84,
            confidenceReasons=confidence_reasons,
            appliedDefaults=applied_defaults,
            missingRequiredSlots=[],
            degradedReason=None,
            excludedSourceTypes=[],
            evidences=evidences,
        )

    pattern_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    uncategorized: list[dict[str, Any]] = []
    for row in rows:
        matched = classify_risk_pattern(row)
        if matched:
            pattern_groups[matched].append(row)
        else:
            uncategorized.append(row)

    ranked_groups = sorted(pattern_groups.items(), key=lambda item: len(item[1]), reverse=True)
    if not ranked_groups:
        if uncategorized:
            ranked_groups = [("기타 주요 리스크", uncategorized)]
        else:
            return build_insufficient_discovery_response(query=query, graph_state=graph_state, embedder=embedder)

    top_groups = ranked_groups[: max(3, min(limit, 5))]
    intro_line = f"핵심 결론: {effective_label} PRB 기준으로 반복적으로 보이는 리스크는 다음과 같습니다."
    if expanded_window:
        intro_line = (
            "핵심 결론: 최근 90일 내 PRB가 충분하지 않아, 최근 1년의 PRB를 기준으로 반복적으로 보이는 리스크를 정리했습니다."
        )
    answer_lines = [intro_line, ""]
    evidences: list[AnswerEvidence] = []

    for idx, (pattern, group_rows) in enumerate(top_groups, start=1):
        top_examples = group_rows[:2]
        answer_lines.append(
            f"{idx}. {pattern}: {len(group_rows)}건"
        )
        answer_lines.append(
            "   예시 사업: " + ", ".join(example["opportunity_name"] for example in top_examples)
        )
        answer_lines.append(
            "   대표 근거: " + summarize_risk_row(top_examples[0])
        )
        evidences.append(
            AnswerEvidence(
                evidenceType="derived_summary_evidence",
                sourceType="PRB_RESULT",
                sourceId=f"discovery-risk:{idx}",
                title=f"{pattern} 요약 근거",
                chunkIndex=0,
                distance=0.0,
                vectorScore=0.0,
                keywordScore=0.0,
                finalScore=float(len(group_rows)),
                matchedBy=["derived_summary"],
                content="\n".join(summarize_risk_row(row) for row in top_examples),
                metadata={
                    "pattern": pattern,
                    "count": len(group_rows),
                    "examples": [
                        {
                            "opportunityCode": row["opportunity_code"],
                            "opportunityName": row["opportunity_name"],
                            "customerName": row["customer_name"],
                            "prbCode": row.get("prb_code"),
                            "prbResultCode": row.get("prb_result_code"),
                        }
                        for row in top_examples
                    ],
                    "timeRange": {
                        "label": effective_label,
                        "startAt": effective_start_at,
                        "endAt": effective_end_at,
                    },
                },
            )
        )
        answer_lines.append("")

    confidence_reasons = ["discovery_summary_rule", "time_filter_applied", "pattern_aggregation"]
    applied_defaults = list(graph_state.appliedDefaults)
    if expanded_window:
        confidence_reasons.append("expanded_prb_pattern_time_window")
        applied_defaults.append("time_range:recent_prb_patterns->365d_fallback")

    return AnswerResponse(
        query=query,
        answer="\n".join(answer_lines).strip(),
        route="discovery",
        answerStatus="good_answer",
        embeddingModel=embedder.config.model_name,
        chatModel="discovery-summary-engine",
        retrievalConfidence=0.82,
        confidenceReasons=confidence_reasons,
        appliedDefaults=applied_defaults,
        missingRequiredSlots=[],
        degradedReason=None,
        excludedSourceTypes=[],
        evidences=evidences,
    )


def answer_project_result_highlights(
    *,
    query: str,
    graph_state: GraphState,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    effective_start_at = graph_state.timeRange.startAt
    effective_end_at = graph_state.timeRange.endAt
    effective_label = graph_state.timeRange.label or "지정 기간"
    expanded_window = False
    rows = fetch_project_result_highlight_in_range(
        start_at=effective_start_at,
        end_at=effective_end_at,
        limit=max(limit, 3),
    )
    if not rows and "time_range:recent->90d" in graph_state.appliedDefaults and graph_state.timeRange.endAt:
        expanded_window = True
        end_dt = datetime.fromisoformat(graph_state.timeRange.endAt)
        start_dt = end_dt - timedelta(days=364)
        effective_start_at = start_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        effective_label = "최근 1년"
        rows = fetch_project_result_highlight_in_range(
            start_at=effective_start_at,
            end_at=effective_end_at,
            limit=max(limit, 3),
        )
    if not rows:
        return build_insufficient_discovery_response(query=query, graph_state=graph_state, embedder=embedder)

    intro_line = f"핵심 결론: {effective_label} 기준으로 의미 있게 볼 만한 완료 사업 결과는 다음과 같습니다."
    if expanded_window:
        intro_line = (
            "핵심 결론: 최근 90일 내 완료 사업 결과가 충분하지 않아, 최근 1년의 완료 사업 결과를 기준으로 의미 있게 볼 만한 결과를 정리했습니다."
        )
    answer_lines = [
        intro_line,
        "",
    ]
    evidences: list[AnswerEvidence] = []

    for idx, row in enumerate(rows[: max(3, limit)], start=1):
        detail = compact_project_result_detail(row.get("detail_content"))
        answer_lines.append(
            f"{idx}. {row['opportunity_name']} ({row['customer_name']})"
        )
        answer_lines.append(
            f"   프로젝트: {row.get('project_code') or '미기재'}, 결과일: {row.get('report_date') or '미기재'}, 상태: {row.get('result_status') or row.get('project_status') or '미기재'}"
        )
        answer_lines.append(f"   핵심 내용: {detail}")
        answer_lines.append("")
        evidences.append(
            AnswerEvidence(
                evidenceType="derived_summary_evidence",
                sourceType="PROJECT_RESULT_REPORT",
                sourceId=str(row.get("project_report_code") or row.get("project_code") or f"result-{idx}"),
                title=f"{row['opportunity_name']} 결과 요약",
                chunkIndex=0,
                distance=0.0,
                vectorScore=0.0,
                keywordScore=0.0,
                finalScore=float(max(len(rows) - idx + 1, 1)),
                matchedBy=["derived_summary"],
                content=detail,
                metadata={
                    "opportunityCode": row.get("opportunity_code"),
                    "opportunityName": row.get("opportunity_name"),
                    "customerName": row.get("customer_name"),
                    "projectCode": row.get("project_code"),
                    "projectReportCode": row.get("project_report_code"),
                    "reportDate": str(row.get("report_date")) if row.get("report_date") is not None else None,
                    "resultStatus": row.get("result_status"),
                    "timeRange": {
                        "label": effective_label,
                        "startAt": effective_start_at,
                        "endAt": effective_end_at,
                    },
                },
            )
        )

    confidence_reasons = ["discovery_summary_rule", "time_filter_applied", "completed_project_reports"]
    applied_defaults = list(graph_state.appliedDefaults)
    if expanded_window:
        confidence_reasons.append("expanded_completed_project_time_window")
        applied_defaults.append("time_range:recent_completed_results->365d_fallback")

    return AnswerResponse(
        query=query,
        answer="\n".join(answer_lines).strip(),
        route="discovery",
        answerStatus="good_answer",
        embeddingModel=embedder.config.model_name,
        chatModel="discovery-summary-engine",
        retrievalConfidence=0.80,
        confidenceReasons=confidence_reasons,
        appliedDefaults=applied_defaults,
        missingRequiredSlots=[],
        degradedReason=None,
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_insufficient_discovery_response(*, query: str, graph_state: GraphState, embedder: EmbeddingModel) -> AnswerResponse:
    return AnswerResponse(
        query=query,
        answer="지정된 범위에서 요약할 만큼 충분한 정형 근거를 찾지 못했습니다. 기간 기준을 더 좁히거나 질문 대상을 구체화해 주세요.",
        route="discovery",
        answerStatus="insufficient_evidence",
        embeddingModel=embedder.config.model_name,
        chatModel="discovery-summary-engine",
        retrievalConfidence=0.35,
        confidenceReasons=["insufficient_discovery_rows"],
        appliedDefaults=list(graph_state.appliedDefaults),
        missingRequiredSlots=[],
        degradedReason=None,
        excludedSourceTypes=[],
        evidences=[],
    )


def classify_risk_pattern(row: dict[str, Any]) -> str | None:
    text = " ".join(
        str(value or "")
        for value in [
            row.get("risk_factors"),
            row.get("risk_review"),
            row.get("final_opinion"),
        ]
    ).lower()
    for label, keywords in RISK_PATTERNS:
        if any(keyword.lower() in text for keyword in keywords):
            return label
    return None


def extract_risk_signature(row: dict[str, Any]) -> str | None:
    raw = str(row.get("risk_review") or row.get("risk_factors") or "").strip()
    if not raw:
        return None

    normalized = re.sub(r"/\s*리스크지수\s*\d+", "", raw, flags=re.IGNORECASE)
    normalized = re.sub(
        r"^(?:AIOps|ITSM|ERP|ContactCenter|Collaboration)\s+도입 범위가 넓어\s+",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(r"\s+", " ", normalized).strip(" .")
    return normalized or None


def summarize_risk_row(row: dict[str, Any]) -> str:
    risk_text = re.sub(r"\s+", " ", str(row.get("risk_review") or row.get("risk_factors") or "")).strip()
    compact = compact_text(risk_text, max_len=100)
    return f"{row['opportunity_name']} / {row['customer_name']} / {compact}"


def compact_project_result_detail(content: Any) -> str:
    return compact_text(str(content or "세부 내용이 기재되지 않았습니다."), max_len=140)


def compact_text(text: str, *, max_len: int) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) <= max_len:
        return normalized
    return normalized[: max_len - 3].rstrip() + "..."
