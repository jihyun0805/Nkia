#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any
from urllib import error, request

import psycopg
from psycopg import sql
from psycopg.rows import dict_row

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.models.constants import METADATA_ALIASES, SourceType  # noqa: E402


@dataclass(frozen=True)
class DocumentConfig:
    table: str
    source_type: str
    id_fields: tuple[str, ...]
    title_fields: tuple[str, ...]
    content_fields: tuple[str, ...] = ()
    source_path_fields: tuple[str, ...] = ()
    payload_aliases: dict[str, tuple[str, ...]] = field(default_factory=dict)


CURRENT_PUBLIC_CONFIGS: tuple[DocumentConfig, ...] = (
    DocumentConfig(
        table="project_opportunity",
        source_type=SourceType.PROJECT_OPPORTUNITY,
        id_fields=("opportunityCode", "opportunity_code", "id"),
        title_fields=("opportunityName", "opportunity_name", "id"),
        content_fields=(
            "current_status", "business_type", "expected_amount",
            "main_content", "issue_content", "competitor_status",
            "decision_structure", "contact_line",
            "recent_activity_summary",
        ),
        payload_aliases={
            "opportunityId": ("id",),
            "customerCompanyId": ("customer_company_id",),
            "opportunityCode": ("opportunity_code",),
            "opportunityName": ("opportunity_name",),
            "currentStatus": ("current_status",),
            "businessType": ("business_type",),
            "expectedAmount": ("expected_amount",),
            "mainContent": ("main_content",),
            "issueContent": ("issue_content",),
        },
    ),
    DocumentConfig(
        table="sales_activity",
        source_type=SourceType.SALES_ACTIVITY,
        id_fields=("activityCode", "activity_code", "id"),
        title_fields=("activityCode", "activity_code", "activity_content", "id"),
        content_fields=(
            "opportunity_name", "customer_name",
            "activity_date_time",
            "activity_type", "activity_purpose", "activity_content",
            "customer_interest", "issue", "next_activity",
        ),
        payload_aliases={
            "activityAt": ("activity_date_time",),
            "activityType": ("activity_type",),
            "activityPurpose": ("activity_purpose",),
            "content": ("activity_content",),
            "customerInterest": ("customer_interest",),
            "nextAction": ("next_activity",),
            "progressStatus": ("status",),
            "opportunityId": ("project_opportunity_id",),
            "opportunityName": ("opportunity_name",),
            "customerName": ("customer_name",),
        },
    ),
    DocumentConfig(
        table="quotation",
        source_type=SourceType.QUOTATION,
        id_fields=("quotation_code", "quoteCode", "id"),
        title_fields=("quotation_code", "id"),
        content_fields=("payment_condition", "total_price", "consumer_total_price", "note"),
        payload_aliases={
            "quoteCode": ("quotation_code",),
            "quoteDate": ("quotation_date",),
            "totalAmount": ("total_price",),
            "paymentTerms": ("payment_condition",),
            "specialNote": ("note",),
            "opportunityId": ("project_opportunity_id",),
        },
    ),
    DocumentConfig(
        table="rfp_analyze_result",
        source_type=SourceType.RFP_ANALYSIS,
        id_fields=("rfpAnalysisCode", "rfp_analysis_code", "rfpCode", "rfp_code", "id"),
        title_fields=("project_name", "opportunity_name", "rfpAnalysisCode", "rfp_analysis_code", "rfpCode", "rfp_code", "id"),
        content_fields=(
            "issuer", "project_scope", "project_period",
            "requirements", "risk_factors", "special_notes",
            "key_requirements", "analysis_summary",
            "project_name", "project_description", "expected_duration",
            "project_location", "proposal_deadline", "analysis_status", "status",
        ),
        payload_aliases={
            "opportunityId": ("project_opportunity_id", "opportunity_id"),
            "rfpAnalysisCode": ("rfp_analysis_code", "rfp_code", "id"),
            "rfpCode": ("rfp_code", "rfp_analysis_code", "id"),
            "projectScope": ("project_scope", "project_description"),
            "submissionDeadline": ("submission_deadline", "proposal_deadline"),
            "analysisStatus": ("analysis_status", "status"),
        },
    ),
    DocumentConfig(
        table="prb",
        source_type=SourceType.PRB,
        id_fields=("prbCode", "prb_code", "id"),
        title_fields=("prbCode", "prb_code", "id"),
        content_fields=(
            "prb_date", "expected_win_rate", "estimated_revenue",
            "estimated_profit_rate", "business_overview",
            "risk_factors", "competitor_status", "prb_opinion",
        ),
        payload_aliases={
            "opportunityId": ("project_opportunity_id",),
            "prbCode": ("id",),
            "prbDate": ("prb_date",),
            "expectedWinRate": ("expected_win_rate",),
            "estimatedRevenue": ("estimated_revenue",),
            "estimatedProfitRate": ("estimated_profit_rate",),
            "riskFactors": ("risk_factors",),
        },
    ),
    DocumentConfig(
        table="prb_result",
        source_type=SourceType.PRB_RESULT,
        id_fields=("prbResultCode", "prb_result_code", "id"),
        title_fields=("prbResultCode", "prb_result_code", "id"),
        content_fields=(
            "decision_status", "result_date",
            "risk_review", "final_opinion", "attendee_opinions",
        ),
        payload_aliases={
            "prbResultCode": ("id",),
            "prbId": ("prb_id",),
            "decisionStatus": ("decision_status",),
            "resultDate": ("result_date",),
            "riskReview": ("risk_review",),
            "finalOpinion": ("final_opinion",),
        },
    ),
    DocumentConfig(
        table="proposal",
        source_type=SourceType.PROPOSAL,
        id_fields=("proposalCode", "proposal_code", "id"),
        title_fields=("proposalName", "proposal_name", "proposalCode", "proposal_code", "id"),
        content_fields=("proposal_summary", "strategy_summary", "key_proposal_points"),
        payload_aliases={
            "proposalCode": ("id",),
            "proposalSummary": ("proposal_summary",),
            "strategySummary": ("strategy_summary",),
        },
    ),
    DocumentConfig(
        table="bid_result",
        source_type=SourceType.BID_RESULT,
        id_fields=("bidResultCode", "bid_result_code", "id"),
        title_fields=("bidResultCode", "bid_result_code", "id"),
        content_fields=(
            "result_status", "result_date", "win_loss_reason",
            "competitor_summary", "outcome_summary",
        ),
        payload_aliases={
            "bidResultCode": ("id",),
            "opportunityId": ("project_opportunity_id",),
            "resultStatus": ("result_status",),
            "winLossReason": ("win_loss_reason",),
            "competitorSummary": ("competitor_summary",),
        },
    ),
    DocumentConfig(
        table="order_report",
        source_type=SourceType.ORDER_REPORT,
        id_fields=("wonReportCode", "won_report_code", "id"),
        title_fields=("wonReportCode", "won_report_code", "id"),
        content_fields=(
            "contract_date", "contract_amount", "business_scope",
            "special_notes", "outcome_summary",
        ),
        payload_aliases={
            "wonReportCode": ("id",),
            "opportunityId": ("project_opportunity_id",),
            "contractDate": ("contract_date",),
            "contractAmount": ("contract_amount",),
            "businessScope": ("business_scope",),
        },
    ),
    DocumentConfig(
        table="contract",
        source_type=SourceType.CONTRACT,
        id_fields=("contractCode", "contract_code", "id"),
        title_fields=("contractCode", "contract_code", "id"),
        content_fields=("contract_status", "start_date", "end_date", "memo"),
        payload_aliases={
            "contractCode": ("id",),
            "orderReportId": ("order_report_id",),
            "contractStatus": ("contract_status",),
        },
    ),
    DocumentConfig(
        table="project",
        source_type=SourceType.PROJECT,
        id_fields=("code", "projectCode", "project_code", "id"),
        title_fields=("code", "pjt_number", "id"),
        content_fields=("type", "end_date", "project_overview", "team_name"),
        payload_aliases={
            "projectCode": ("code",),
            "deliveryDate": ("end_date",),
            "projectOwner": ("manager_id",),
            "projectStatus": ("type",),
        },
    ),
    DocumentConfig(
        table="project_result_report",
        source_type=SourceType.PROJECT_RESULT_REPORT,
        id_fields=("projectReportCode", "project_report_code", "id"),
        title_fields=("projectReportCode", "project_report_code", "id"),
        payload_aliases={
            "projectReportCode": ("id",),
            "projectId": ("project_id",),
        },
    ),
    DocumentConfig(
        table="maintenance",
        source_type=SourceType.MAINTENANCE,
        id_fields=("maintenanceCode", "maintenance_code", "id"),
        title_fields=("maintenanceCode", "maintenance_code", "id"),
        payload_aliases={
            "maintenanceCode": ("id",),
            "projectId": ("project_id",),
        },
    ),
    DocumentConfig(
        table="maintenance_quotation",
        source_type=SourceType.MAINTENANCE_QUOTE,
        id_fields=("maintenanceQuoteCode", "maintenance_quote_code", "ref_no", "id"),
        title_fields=("ref_no", "maintenanceQuoteCode", "maintenance_quote_code", "id"),
        content_fields=(
            "ref_no", "quotation_date", "payment_terms",
            "total_amount", "start_date", "end_date",
            "sp_maintenance_cost", "monthly_supply_price",
            "total_quotation_amount", "special_notes",
        ),
        payload_aliases={
            "maintenanceQuoteCode": ("id",),
            "refNo": ("ref_no",),
            "projectId": ("project_id",),
            "quotationDate": ("quotation_date",),
            "paymentTerms": ("payment_terms",),
            "totalAmount": ("total_amount",),
            "startDate": ("start_date",),
            "endDate": ("end_date",),
            "specialNotes": ("special_notes",),
        },
    ),
    DocumentConfig(
        table="customer_support",
        source_type=SourceType.CUSTOMER_SUPPORT,
        id_fields=("supportCode", "support_code", "id"),
        title_fields=("supportCode", "support_code", "id"),
        payload_aliases={
            "supportCode": ("id",),
            "maintenanceId": ("maintenance_id",),
        },
    ),
    DocumentConfig(
        table="company",
        source_type=SourceType.COMPANY,
        id_fields=("companyCode", "company_code", "id"),
        title_fields=("companyName", "company_name", "id"),
        payload_aliases={
            "companyCode": ("id",),
            "companyName": ("id",),
            "customerType": ("company_type",),
        },
    ),
    DocumentConfig(
        table="license",
        source_type=SourceType.LICENSE,
        id_fields=("licenseCode", "license_code", "id"),
        title_fields=("licenseCode", "license_code", "id"),
        payload_aliases={
            "licenseCode": ("id",),
            "orderReportId": ("order_report_id",),
            "moduleId": ("product_module_id",),
        },
    ),
    DocumentConfig(
        table="billing",
        source_type=SourceType.BILLING,
        id_fields=("billingCode", "billing_code", "id"),
        title_fields=("billingCode", "billing_code", "id"),
        payload_aliases={
            "billingCode": ("id",),
            "projectId": ("project_id",),
        },
    ),
    DocumentConfig(
        table="rfp_analyze_requirement",
        source_type=SourceType.RFP_ANALYSIS,
        id_fields=("requirementCode", "requirement_code", "id"),
        title_fields=("requirement_title", "requirement_code", "id"),
        content_fields=(
            "category", "requirement_code", "requirement_title",
            "requirement_content", "support_status", "review_note", "effort",
        ),
        payload_aliases={
            "rfpAnalyzeResultId": ("rfp_analyze_result_id",),
            "requirementCode": ("requirement_code",),
            "requirementTitle": ("requirement_title",),
            "supportStatus": ("support_status",),
            "reviewNote": ("review_note",),
            "effort": ("effort",),
        },
    ),
    DocumentConfig(
        table="rfp_requirement",
        source_type=SourceType.RFP_ANALYSIS,
        id_fields=("requirementCode", "requirement_code", "id"),
        title_fields=("requirement_title", "name", "requirement_code", "id"),
        content_fields=(
            "category", "requirement_code", "requirement_title", "name",
            "requirement_content", "description", "support_status", "support_type",
            "review_note", "review_comment", "effort",
        ),
        payload_aliases={
            "rfpAnalyzeResultId": ("rfp_analyze_result_id",),
            "requirementCode": ("requirement_code",),
            "requirementTitle": ("requirement_title", "name"),
            "supportStatus": ("support_status", "support_type"),
            "reviewNote": ("review_note", "review_comment"),
            "effort": ("effort",),
        },
    ),
)

ALWAYS_CONFIGS: tuple[DocumentConfig, ...] = (
    DocumentConfig(
        table="product_module",
        source_type=SourceType.MODULE,
        id_fields=("moduleId", "module_id", "id"),
        title_fields=("product_name", "moduleName", "module_name", "id"),
        content_fields=(
            "product_class", "product_group", "product_name",
            "license_standard", "license_unit", "unit_price",
        ),
        payload_aliases={
            "moduleId": ("id",),
            "moduleName": ("product_name",),
            "moduleType": ("product_group",),
            "productClass": ("product_class",),
            "licenseStandard": ("license_standard",),
            "licenseUnit": ("license_unit",),
            "listPrice": ("unit_price",),
        },
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Orbis AI 재색인 스크립트")
    parser.add_argument("--db-url", required=True, help="PostgreSQL connection URL")
    parser.add_argument("--ai-base-url", required=True, help="AI API base URL")
    parser.add_argument("--ai-internal-token", required=True, help="AI internal token")
    parser.add_argument("--batch-size", type=int, default=50, help="index API 배치 크기")
    parser.add_argument("--limit-per-table", type=int, default=0, help="테이블별 로우 제한. 0이면 전체")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    with psycopg.connect(args.db_url, row_factory=dict_row) as conn:
        existing_tables = fetch_existing_tables(conn)
        documents = build_documents(
            conn=conn,
            existing_tables=existing_tables,
            limit_per_table=args.limit_per_table,
        )

    if not documents:
        print("[reindex] 색인할 문서가 없습니다.", flush=True)
        return 0

    response_payloads = post_document_batches(
        documents=documents,
        batch_size=max(args.batch_size, 1),
        ai_base_url=args.ai_base_url.rstrip("/"),
        token=args.ai_internal_token,
    )

    indexed = sum(result.get("status") == "INDEXED" for payload in response_payloads for result in payload.get("results", []))
    skipped = sum(result.get("status", "").startswith("SKIPPED") for payload in response_payloads for result in payload.get("results", []))
    print(
        f"[reindex] documents={len(documents)} indexed={indexed} skipped={skipped}",
        flush=True,
    )
    return 0


def fetch_existing_tables(conn: psycopg.Connection[Any]) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            """
        )
        return {row["table_name"] for row in cur.fetchall()}


def build_documents(
    *,
    conn: psycopg.Connection[Any],
    existing_tables: set[str],
    limit_per_table: int,
) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []

    configs = list(ALWAYS_CONFIGS) + list(CURRENT_PUBLIC_CONFIGS)

    for config in configs:
        if config.table not in existing_tables:
            continue
        rows = fetch_table_rows(conn=conn, table=config.table, limit=limit_per_table)
        for row in rows:
            if truthy(row.get("deleted")):
                continue
            if config.table == "project_opportunity":
                documents.extend(build_current_opportunity_documents(conn=conn, row=row))
            elif config.table == "sales_activity":
                documents.extend(build_current_activity_documents(conn=conn, row=row))
            elif config.table == "rfp_analyze_result":
                documents.extend(build_current_rfp_documents(row))
            elif config.table in {"rfp_analyze_requirement", "rfp_requirement"}:
                documents.extend(build_current_rfp_requirement_documents(conn=conn, row=row))
            elif config.table == "bid_result":
                documents.extend(build_current_bid_result_documents(row))
            elif config.table == "order_report":
                documents.extend(build_current_order_report_documents(row))
            else:
                document = build_document(config=config, row=row)
                if document is not None:
                    documents.append(document)
    return documents


def fetch_table_rows(
    *,
    conn: psycopg.Connection[Any],
    table: str,
    limit: int,
) -> list[dict[str, Any]]:
    query = sql.SQL("SELECT to_jsonb(t) AS row FROM {} t").format(sql.Identifier(table))
    if limit > 0:
        query += sql.SQL(" LIMIT {}").format(sql.Literal(limit))
    with conn.cursor() as cur:
        cur.execute(query)
        return [dict(record["row"]) for record in cur.fetchall()]


def build_current_opportunity_documents(
    *,
    conn: psycopg.Connection[Any],
    row: dict[str, Any],
) -> list[dict[str, Any]]:
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "project_opportunity")
    opp_id = row.get("id")

    activity_summary = ""
    if opp_id is not None:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        activity_content,
                        customer_interest,
                        issue,
                        next_activity,
                        activity_date_time
                    FROM sales_activity
                    WHERE project_opportunity_id = %s
                      AND deleted = false
                    ORDER BY activity_date_time DESC NULLS LAST
                    LIMIT 3
                    """,
                    (opp_id,),
                )
                activities = cur.fetchall()
                if activities:
                    parts: list[str] = []
                    for act in activities:
                        act_parts: list[str] = []
                        if act[0]:
                            act_parts.append(f"활동내용: {act[0]}")
                        if act[1]:
                            act_parts.append(f"고객관심사: {act[1]}")
                        if act[2]:
                            act_parts.append(f"이슈: {act[2]}")
                        if act[3]:
                            act_parts.append(f"다음활동: {act[3]}")
                        if act_parts:
                            parts.append(" / ".join(act_parts))
                    if parts:
                        activity_summary = "\n".join(parts)
        except Exception:
            pass

    enriched_row = dict(row)
    if activity_summary:
        enriched_row["recent_activity_summary"] = activity_summary

    document = build_document(config=config, row=enriched_row)
    return [document] if document is not None else []


_ACTIVITY_TYPE_LABELS: dict[str, str] = {
    "EMAIL": "이메일",
    "CALL": "전화",
    "VIDEO_MEETING": "화상회의",
    "OFFLINE_MEETING": "대면미팅",
    "ETC": "기타",
}

_ACTIVITY_PURPOSE_LABELS: dict[str, str] = {
    "CONSULTING": "컨설팅",
    "PRODUCT_INTRODUCTION": "제품소개",
    "DEMO": "데모",
    "POC": "POC",
    "BMT": "BMT",
    "DOCUMENT_DELIVERY": "문서전달",
    "RFP_ANALYSIS": "RFP분석",
    "PROPOSAL_WRITING": "제안서작성",
    "SI_PROPOSAL_WRITING": "SI제안서작성",
    "ETC": "기타",
}


def build_current_activity_documents(
    row: dict[str, Any],
    conn: psycopg.Connection[Any] | None = None,
) -> list[dict[str, Any]]:
    source_type = SourceType.SALES_ACTIVITY if row.get("project_opportunity_id") else SourceType.POST_SALES
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "sales_activity")
    enriched_row = dict(row)

    opp_id = enriched_row.get("project_opportunity_id")
    if conn is not None and opp_id and not enriched_row.get("opportunity_name"):
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT o.opportunity_name, c.company_name
                    FROM project_opportunity o
                    LEFT JOIN company c ON c.id = o.customer_company_id
                    WHERE o.id = %s
                    """,
                    (opp_id,),
                )
                result = cur.fetchone()
                if result:
                    enriched_row["opportunity_name"] = result[0]
                    enriched_row["customer_name"] = result[1]
        except Exception:
            pass

    if enriched_row.get("activity_type"):
        enriched_row["activity_type"] = _ACTIVITY_TYPE_LABELS.get(
            enriched_row["activity_type"], enriched_row["activity_type"]
        )
    if enriched_row.get("activity_purpose"):
        enriched_row["activity_purpose"] = _ACTIVITY_PURPOSE_LABELS.get(
            enriched_row["activity_purpose"], enriched_row["activity_purpose"]
        )
    document = build_document(config=config, row=enriched_row, override_source_type=source_type)
    return [document] if document is not None else []


def build_current_rfp_documents(row: dict[str, Any]) -> list[dict[str, Any]]:
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "rfp_analyze_result")
    rfp_doc = build_document(
        config=config,
        row=row,
        override_source_type=SourceType.RFP,
        override_id_fields=("rfpCode", "rfp_code", "rfpAnalysisCode", "rfp_analysis_code", "id"),
        override_title_fields=("project_name", "opportunity_name", "rfpCode", "rfp_analysis_code", "id"),
    )
    analysis_doc = build_document(config=config, row=row)
    return [doc for doc in (rfp_doc, analysis_doc) if doc is not None]


def build_current_rfp_requirement_documents(
    *,
    conn: psycopg.Connection[Any],
    row: dict[str, Any],
) -> list[dict[str, Any]]:
    """RFP 요구사항 행 하나를 AI 청크로 변환.

    부모 RFP(rfp_analyze_result)와 사업기회(project_opportunity)의 고객사/코드 정보를
    함께 포함하여 '삼성카드 RFP 요구사항 REQ-001은?' 등의 질문에 대응한다.
    """
    table_name = "rfp_analyze_requirement" if "requirement_title" in row else "rfp_requirement"
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == table_name)
    rfp_result_id = row.get("rfp_analyze_result_id")

    enriched = dict(row)
    if table_name == "rfp_requirement":
        enriched.setdefault("requirement_title", enriched.get("name"))
        enriched.setdefault("requirement_content", enriched.get("description"))
        enriched.setdefault("review_note", enriched.get("review_comment"))
        support_type = enriched.get("support_type")
        if support_type not in (None, "") and enriched.get("support_status") in (None, ""):
            enriched["support_status"] = {
                "PROVIDED": "O",
                "PARTIAL_CUSTOMIZATION": "∆",
                "NOT_PROVIDED": "X",
                "NEEDS_REVIEW": "?",
            }.get(str(support_type), support_type)
    if rfp_result_id is not None:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        r.id            AS rfp_id,
                        r.rfp_code,
                        r.rfp_analysis_code,
                        r.project_opportunity_id,
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name          AS customer_name
                    FROM rfp_analyze_result r
                    LEFT JOIN project_opportunity o ON o.id = r.project_opportunity_id
                    LEFT JOIN company c ON c.id = o.customer_company_id
                    WHERE r.id = %s
                    """,
                    (rfp_result_id,),
                )
                parent = cur.fetchone()
                if parent:
                    enriched.update({
                        "rfp_code":           parent[1],
                        "rfp_analysis_code":  parent[2] or parent[1] or parent[0],
                        "opportunity_code":   parent[4],
                        "opportunity_name":   parent[5],
                        "customer_name":      parent[6],
                    })
        except Exception:
            pass

    status_label = {
        "O": "지원(O)", "∆": "부분지원(∆)", "X": "미지원(X)", "?": "검토필요(?)"
    }.get(str(enriched.get("support_status", "")), enriched.get("support_status", ""))
    enriched["support_status_label"] = status_label

    document = build_document(config=config, row=enriched)
    return [document] if document is not None else []


def build_current_bid_result_documents(row: dict[str, Any]) -> list[dict[str, Any]]:
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "bid_result")
    documents: list[dict[str, Any]] = []
    bid_doc = build_document(config=config, row=row)
    if bid_doc is not None:
        documents.append(bid_doc)
    if is_lost_row(row):
        lost_doc = build_document(
            config=config,
            row=row,
            override_source_type=SourceType.LOST,
            override_id_fields=("lostCode", "bidResultCode", "bid_result_code", "id"),
            override_title_fields=("lostCode", "bidResultCode", "id"),
        )
        if lost_doc is not None:
            documents.append(lost_doc)
    return documents


def build_current_order_report_documents(row: dict[str, Any]) -> list[dict[str, Any]]:
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "order_report")
    order_doc = build_document(config=config, row=row)
    won_doc = build_document(
        config=config,
        row=row,
        override_source_type=SourceType.WON,
        override_id_fields=("wonCode", "wonReportCode", "won_report_code", "id"),
        override_title_fields=("wonCode", "wonReportCode", "id"),
    )
    return [doc for doc in (order_doc, won_doc) if doc is not None]


def build_document(
    *,
    config: DocumentConfig,
    row: dict[str, Any],
    override_source_type: str | None = None,
    override_id_fields: tuple[str, ...] | None = None,
    override_title_fields: tuple[str, ...] | None = None,
) -> dict[str, Any] | None:
    payload = normalize_payload(row=row, extra_aliases=config.payload_aliases)
    source_type = override_source_type or config.source_type
    source_id = build_source_id(payload, override_id_fields or config.id_fields)
    if source_id is None:
        return None
    title = build_title(
        payload=payload,
        title_fields=override_title_fields or config.title_fields,
        source_type=source_type,
        source_id=source_id,
    )
    content = build_content(payload=payload, content_fields=config.content_fields)
    source_path = first_string(payload, config.source_path_fields)
    occurred_at = first_value(payload, ("updated_at", "updatedAt", "created_at", "createdAt"))

    return {
        "sourceType": source_type,
        "sourceId": source_id,
        "operation": "UPSERT",
        "title": title,
        "sourcePath": source_path,
        "content": content,
        "payload": payload,
        "metadata": build_metadata(payload=payload, source_type=source_type, source_table=config.table),
        "eventId": f"seed:{config.table}:{source_type}:{source_id}",
        "occurredAt": occurred_at,
    }


def build_source_id(payload: dict[str, Any], fields: tuple[str, ...]) -> str | None:
    value = first_value(payload, fields)
    if value in (None, ""):
        return None
    return str(value).strip()


def build_title(
    *,
    payload: dict[str, Any],
    title_fields: tuple[str, ...],
    source_type: str,
    source_id: str,
) -> str:
    value = first_value(payload, title_fields)
    if value not in (None, ""):
        title = str(value).strip()
        if title:
            return title
    return f"{source_type}:{source_id}"


def build_content(*, payload: dict[str, Any], content_fields: tuple[str, ...]) -> str | None:
    parts: list[str] = []
    for field_name in content_fields:
        value = payload.get(field_name)
        if value in (None, ""):
            continue
        text = str(value).strip()
        if text:
            parts.append(f"{field_name}: {text}")
    if not parts:
        return None
    return "\n".join(parts)


def build_metadata(*, payload: dict[str, Any], source_type: str, source_table: str) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "origin": "seed_reindex",
        "sourceType": source_type,
        "sourceTable": source_table,
    }
    for canonical_key, aliases in METADATA_ALIASES.items():
        value = first_value(payload, aliases)
        if value not in (None, ""):
            metadata[canonical_key] = value
    return metadata


def normalize_payload(*, row: dict[str, Any], extra_aliases: dict[str, tuple[str, ...]]) -> dict[str, Any]:
    payload = {str(key): to_jsonable(value) for key, value in row.items()}
    for canonical_key, aliases in METADATA_ALIASES.items():
        if canonical_key in payload and payload[canonical_key] not in (None, ""):
            continue
        value = first_value(payload, aliases)
        if value not in (None, ""):
            payload[canonical_key] = value
    for canonical_key, aliases in extra_aliases.items():
        if canonical_key in payload and payload[canonical_key] not in (None, ""):
            continue
        value = first_value(payload, aliases)
        if value not in (None, ""):
            payload[canonical_key] = value
    return payload


def to_jsonable(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return int(value) if value == int(value) else float(value)
    if isinstance(value, dict):
        return {str(key): to_jsonable(sub_value) for key, sub_value in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_jsonable(item) for item in value]
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def first_value(payload: dict[str, Any], field_names: tuple[str, ...]) -> Any:
    for field_name in field_names:
        if field_name in payload and payload[field_name] not in (None, ""):
            return payload[field_name]
    return None


def first_string(payload: dict[str, Any], field_names: tuple[str, ...]) -> str | None:
    value = first_value(payload, field_names)
    if value in (None, ""):
        return None
    text = str(value).strip()
    return text or None


def truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    normalized = str(value).strip().lower()
    return normalized in {"true", "t", "1", "y", "yes"}


def is_lost_row(row: dict[str, Any]) -> bool:
    explicit_won = first_value(row, ("won", "is_won", "won_yn"))
    if explicit_won not in (None, ""):
        normalized = str(explicit_won).strip().lower()
        if normalized in {"false", "f", "0", "n", "no"}:
            return True
    for key in ("current_status", "order_status", "bid_result", "result_status", "status"):
        value = row.get(key)
        if value is None:
            continue
        normalized = str(value).strip().lower()
        if any(token in normalized for token in ("lost", "실주", "탈락", "패")):
            return True
    return False


def post_document_batches(
    *,
    documents: list[dict[str, Any]],
    batch_size: int,
    ai_base_url: str,
    token: str,
) -> list[dict[str, Any]]:
    payloads: list[dict[str, Any]] = []
    for index in range(0, len(documents), batch_size):
        batch = documents[index:index + batch_size]
        body = json.dumps({"documents": batch}, ensure_ascii=False).encode("utf-8")
        req = request.Request(
            f"{ai_base_url}/internal/index/documents",
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-Orbis-Internal-Token": token,
            },
            method="POST",
        )
        try:
            with request.urlopen(req) as response:
                payload = json.loads(response.read().decode("utf-8"))
                payloads.append(payload)
                print(
                    f"[reindex] batch={index // batch_size + 1} size={len(batch)} status={response.status}",
                    flush=True,
                )
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"AI indexing API failed: status={exc.code} body={detail}") from exc
    return payloads


if __name__ == "__main__":
    raise SystemExit(main())
