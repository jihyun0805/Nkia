from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.core.config import settings
from app.llm.gms_client import GmsChatClient, GmsChatConfig
from app.models.user_context import UserContext
from app.schemas.answer import AnswerEvidence
from app.schemas.report import ManagementReportResponse, ReportType

if TYPE_CHECKING:
    from app.embeddings.model import EmbeddingModel


DEFAULT_MANAGEMENT_REPORT_SOURCE_TYPES = [
    "PROJECT_OPPORTUNITY",
    "SALES_ACTIVITY",
    "QUOTATION",
    "RFP",
    "RFP_ANALYSIS",
    "PRB",
    "PRB_RESULT",
    "BID_RESULT",
    "WON",
    "LOST",
    "ORDER_REPORT",
    "CONTRACT",
    "PROJECT",
    "PROJECT_RESULT_REPORT",
    "POST_SALES",
    "MAINTENANCE",
    "MAINTENANCE_QUOTE",
    "CUSTOMER_SUPPORT",
    "LICENSE",
    "BILLING",
    "ATTACHMENT",
]

DEFAULT_SECTIONS_BY_TYPE: dict[ReportType, list[str]] = {
    "management": ["Executive summary", "Key status", "Issues", "Risks", "Recommendations", "Evidence"],
    "sales": ["Executive summary", "Sales pipeline", "Win/loss factors", "Key accounts", "Recommendations", "Evidence"],
    "risk": ["Executive summary", "Major risks", "Impact", "Mitigation", "Monitoring points", "Evidence"],
    "project": ["Executive summary", "Project status", "Schedule/scope issues", "Risks", "Next actions", "Evidence"],
    "maintenance": ["Executive summary", "Maintenance status", "Customer support issues", "Contract/license points", "Recommendations", "Evidence"],
    "custom": ["Executive summary", "Analysis", "Risks", "Recommendations", "Evidence"],
}


def create_management_report(
    *,
    query: str,
    title: str | None,
    report_type: ReportType,
    limit: int,
    source_types: list[str] | None,
    attachment_session_id: str | None,
    start_at: str | None,
    end_at: str | None,
    customer_group: str | None,
    business_types: list[str],
    statuses: list[str],
    sections: list[str],
    audience: str,
    embedder: EmbeddingModel,
    user_context: UserContext | None = None,
) -> ManagementReportResponse:
    from app.services.chat_planner_service import plan_chat_query
    from app.services.query_normalization_service import normalize_query_context
    from app.services.search_service import search_knowledge

    effective_title = title or infer_report_title(query=query, report_type=report_type)
    effective_sections = sections or DEFAULT_SECTIONS_BY_TYPE[report_type]
    effective_source_types = source_types or DEFAULT_MANAGEMENT_REPORT_SOURCE_TYPES
    report_query = build_report_search_query(
        query=query,
        report_type=report_type,
        sections=effective_sections,
        customer_group=customer_group,
        business_types=business_types,
        statuses=statuses,
    )
    normalization = normalize_query_context(report_query)
    chat_plan, normalization = plan_chat_query(report_query, normalization)
    search_response = search_knowledge(
        query=report_query,
        limit=limit,
        source_types=effective_source_types,
        attachment_session_id=attachment_session_id,
        start_at=start_at,
        end_at=end_at,
        metadata_filters=build_report_metadata_filters(
            customer_group=customer_group,
            business_types=business_types,
            statuses=statuses,
        ),
        embedder=embedder,
        chat_plan=chat_plan,
        normalization=normalization,
        user_context=user_context,
    )
    evidences = build_answer_evidences(search_response.results)

    if not search_response.results:
        return ManagementReportResponse(
            query=query,
            title=effective_title,
            reportType=report_type,
            reportStatus="insufficient_evidence",
            report="Insufficient evidence to generate a management report. Adjust the period, customer group, business type, or status filters.",
            embeddingModel=search_response.embeddingModel,
            chatModel="evidence-guard",
            retrievalConfidence=search_response.retrievalConfidence,
            confidenceBand=search_response.confidenceBand,
            confidenceReasons=search_response.confidenceReasons,
            sourceTypes=effective_source_types,
            evidences=[],
        )

    if settings.gms_key:
        client = GmsChatClient(
            GmsChatConfig(
                api_key=settings.gms_key,
                url=settings.gms_chat_completions_url,
                model=settings.gms_chat_model,
                timeout_seconds=settings.gms_timeout_seconds,
            )
        )
        try:
            report = client.create_grounded_answer(
                query=build_report_generation_query(
                    query=query,
                    title=effective_title,
                    report_type=report_type,
                    audience=audience,
                    sections=effective_sections,
                    filters={
                        "startAt": start_at,
                        "endAt": end_at,
                        "customerGroup": customer_group,
                        "businessTypes": business_types,
                        "statuses": statuses,
                    },
                ),
                context=build_evidence_context(search_response.results),
            )
            return ManagementReportResponse(
                query=query,
                title=effective_title,
                reportType=report_type,
                reportStatus="good_report",
                report=report,
                embeddingModel=search_response.embeddingModel,
                chatModel=settings.gms_chat_model,
                retrievalConfidence=search_response.retrievalConfidence,
                confidenceBand=search_response.confidenceBand,
                confidenceReasons=search_response.confidenceReasons,
                sourceTypes=effective_source_types,
                evidences=evidences,
            )
        except RuntimeError:
            return build_fallback_report_response(
                query=query,
                title=effective_title,
                report_type=report_type,
                search_response=search_response,
                source_types=effective_source_types,
                evidences=evidences,
                degraded_reason="management_report_generation_failed",
            )

    return build_fallback_report_response(
        query=query,
        title=effective_title,
        report_type=report_type,
        search_response=search_response,
        source_types=effective_source_types,
        evidences=evidences,
        degraded_reason="llm_unavailable",
    )


def build_report_search_query(
    *,
    query: str,
    report_type: ReportType,
    sections: list[str],
    customer_group: str | None = None,
    business_types: list[str] | None = None,
    statuses: list[str] | None = None,
) -> str:
    filter_lines = []
    if customer_group:
        filter_lines.append(f"customerGroup: {customer_group}")
    if business_types:
        filter_lines.append(f"businessTypes: {', '.join(business_types)}")
    if statuses:
        filter_lines.append(f"statuses: {', '.join(statuses)}")
    filter_text = "\n".join(filter_lines) if filter_lines else "no filters"
    return "\n".join(
        [
            query,
            f"reportType: {report_type}",
            f"requiredSections: {', '.join(sections)}",
            filter_text,
            "Find status, metrics, issues, risks, recommendations, and evidence needed for a management report.",
        ]
    )


def build_report_metadata_filters(
    *,
    customer_group: str | None,
    business_types: list[str],
    statuses: list[str],
) -> dict[str, object]:
    filters: dict[str, object] = {}
    if customer_group and customer_group.upper() != "ALL":
        filters["customerGroup"] = customer_group
    effective_business_types = [value for value in business_types if value.upper() != "ALL"]
    if effective_business_types:
        filters["businessTypes"] = effective_business_types
    effective_statuses = [value for value in statuses if value.upper() != "ALL"]
    if effective_statuses:
        filters["statuses"] = effective_statuses
    return filters


def build_report_generation_query(
    *,
    query: str,
    title: str,
    report_type: ReportType,
    audience: str,
    sections: list[str],
    filters: dict[str, object],
) -> str:
    filter_lines = [f"- {key}: {value}" for key, value in filters.items() if value not in (None, "", [], {})]
    section_lines = [f"- {section}" for section in sections]
    return "\n".join(
        [
            f"Report title: {title}",
            f"Report type: {report_type}",
            f"Audience: {audience}",
            "",
            "User request:",
            query,
            "",
            "Filters:",
            "\n".join(filter_lines) if filter_lines else "- none",
            "",
            "Required sections:",
            "\n".join(section_lines),
            "",
            "Writing rules:",
            "- Write the report in Korean.",
            "- Use only the provided evidence documents.",
            "- Do not infer numbers, dates, causes, or forecasts that are not in evidence.",
            "- If evidence is insufficient, explicitly say it is difficult to verify from the provided evidence.",
            "- Make conclusions, risks, and recommendations clear for executive decision making.",
            "- Use Markdown.",
            "- End with an evidence section summarizing the sources used.",
        ]
    )


def infer_report_title(*, query: str, report_type: ReportType) -> str:
    labels = {
        "management": "management report",
        "sales": "sales report",
        "risk": "risk report",
        "project": "project report",
        "maintenance": "maintenance report",
        "custom": "analysis report",
    }
    compact_query = " ".join(query.split())
    if len(compact_query) > 36:
        compact_query = f"{compact_query[:36].rstrip()}..."
    return f"{compact_query} - {labels[report_type]}"


def build_fallback_report_response(
    *,
    query: str,
    title: str,
    report_type: ReportType,
    search_response: Any,
    source_types: list[str],
    evidences: list[AnswerEvidence],
    degraded_reason: str,
) -> ManagementReportResponse:
    return ManagementReportResponse(
        query=query,
        title=title,
        reportType=report_type,
        reportStatus="upstream_degraded",
        report=build_extractive_report(title=title, evidences=evidences),
        embeddingModel=search_response.embeddingModel,
        chatModel="extractive-report-fallback",
        retrievalConfidence=search_response.retrievalConfidence,
        confidenceBand=search_response.confidenceBand,
        confidenceReasons=search_response.confidenceReasons,
        sourceTypes=source_types,
        evidences=evidences,
        degradedReason=degraded_reason,
    )


def build_extractive_report(*, title: str, evidences: list[AnswerEvidence]) -> str:
    lines = [
        f"# {title}",
        "",
        "## Summary",
        "LLM report generation is unavailable, so this fallback report summarizes retrieved evidence.",
        "",
        "## Evidence",
    ]
    for index, evidence in enumerate(evidences[:8], start=1):
        heading = evidence.title or f"{evidence.sourceType} {evidence.sourceId}"
        content = " ".join(evidence.content.split())
        if len(content) > 320:
            content = f"{content[:320].rstrip()}..."
        lines.append(f"{index}. {heading}: {content}")
    lines.extend(["", "## Recommendation", "Refine the target, period, and metrics, then regenerate the detailed report."])
    return "\n".join(lines)


def build_answer_evidences(results: list[object]) -> list[AnswerEvidence]:
    return [
        AnswerEvidence(
            evidenceType=getattr(result, "evidenceType", "retrieved_evidence"),
            sourceType=result.sourceType,
            sourceId=result.sourceId,
            title=result.title,
            chunkIndex=result.chunkIndex,
            distance=result.distance,
            vectorScore=result.vectorScore,
            keywordScore=result.keywordScore,
            finalScore=result.finalScore,
            matchedBy=result.matchedBy,
            content=result.content,
            metadata=result.metadata,
        )
        for result in results
    ]


def build_evidence_context(results: list[object]) -> str:
    sections = []
    for index, result in enumerate(results, start=1):
        header = f"[Evidence {index}] {result.sourceType} - {result.sourceId}"
        if result.title:
            header += f" - {result.title}"
        metadata_lines = build_metadata_context_lines(result.metadata)
        sections.append("\n".join([header, *metadata_lines, "content:", result.content]))
    return "\n\n---\n\n".join(sections)


def build_metadata_context_lines(metadata: dict | None) -> list[str]:
    if not metadata:
        return []
    keys = [
        "rootOpportunityCode",
        "rootOpportunityName",
        "rootBusinessType",
        "rootOpportunityStatus",
        "customerName",
        "rootCustomerName",
        "businessType",
        "expectedAmount",
        "contractAmount",
        "documentStage",
        "documentWrittenAt",
        "businessStartAt",
        "businessEndAt",
    ]
    return [f"metadata.{key}: {metadata[key]}" for key in keys if metadata.get(key) not in (None, "", [], {})]
