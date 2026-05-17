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
            "billing_summary", "prb_comprehensive_opinion",
            "sales_representative_name",
            # description (OID → text) — 실주 사유/사업 요약 등이 여기 있음.
            # _OID_TEXT_COLUMNS 가 fetch 단계에서 텍스트로 풀어준 결과.
            "description",
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
            "attendee_names",
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
        content_fields=(
            "payment_condition", "total_price", "consumer_total_price", "note",
            "opportunity_name", "customer_name", "workflow_summary",
        ),
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
        title_fields=("display_title", "prbCode", "prb_code", "id"),
        content_fields=(
            "prb_date", "expected_win_rate", "estimated_revenue",
            "estimated_profit_margin", "maintenance_description",
            "sales_representative_opinion", "indirect_rate",
            "opportunity_name", "customer_name",
            "estimated_operating_profit",
            "risk_factors_text", "prb_result_opinion_text",
        ),
        payload_aliases={
            "opportunityId": ("project_opportunity_id",),
            "prbCode": ("id",),
            "prbDate": ("prb_date",),
            "expectedWinRate": ("expected_win_rate",),
            "estimatedRevenue": ("estimated_revenue",),
            "estimatedProfitRate": ("estimated_profit_rate",),
            "riskFactors": ("risk_factors_text",),
        },
    ),
    DocumentConfig(
        table="prb_result",
        source_type=SourceType.PRB_RESULT,
        id_fields=("prbResultCode", "prb_result_code", "prb_result_id", "id"),
        title_fields=("prbResultCode", "prb_result_code", "prb_result_id", "id"),
        content_fields=(
            "decision_status", "result_date",
            "risk_review", "final_opinion", "attendee_opinions",
            "risk_factors", "comprehensive_opinion",
            "meeting_location", "meeting_date_time",
            "opportunity_name", "customer_name", "attendee_opinions_text",
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
        title_fields=("display_title", "proposalName", "proposal_name", "proposalCode", "proposal_code", "id"),
        content_fields=(
            "status", "proposal_summary", "strategy_summary", "key_proposal_points",
            "opportunity_name", "customer_name",
        ),
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
        # 실제 DB 컬럼명 + OID 컬럼 (_OID_TEXT_COLUMNS 에서 텍스트로 풀린 것).
        # 기존: result_status/win_loss_reason 등 nonexistent 컬럼 → chunk 가
        # 메타데이터만 포함하고 실주 사유 텍스트 누락 → LLM 환각.
        content_fields=(
            "bid_outcome", "company_name",
            "key_success_factors", "proposal_strategy", "rfp_issues",
            "technical_score", "price_score", "sum_score",
            "presentation_date", "bid_announcement_date",
            "disclosure_status",
        ),
        payload_aliases={
            "bidResultCode": ("id",),
            "opportunityId": ("project_opportunity_id",),
            "bidOutcome": ("bid_outcome",),
            "keySuccessFactors": ("key_success_factors",),
            "proposalStrategy": ("proposal_strategy",),
            "rfpIssues": ("rfp_issues",),
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
            "opportunity_name", "customer_name", "workflow_summary",
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
        content_fields=(
            "contract_status", "start_date", "end_date", "memo",
            "opportunity_name", "customer_name", "workflow_summary",
        ),
        payload_aliases={
            "contractCode": ("id",),
            "orderReportId": ("order_report_id",),
            "contractStatus": ("contract_status",),
        },
    ),
    DocumentConfig(
        table="project",
        source_type=SourceType.PROJECT,
        id_fields=("pjt_number", "code", "projectCode", "project_code", "id"),
        title_fields=("display_title", "pjt_name", "pjt_number", "id"),
        content_fields=(
            "type", "code", "pjt_name", "pjt_number",
            "start_date", "end_date", "total_amount",
            "opportunity_name", "customer_name",
        ),
        payload_aliases={
            "projectCode": ("pjt_number", "code"),
            "projectName": ("pjt_name",),
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
            "opportunity_name", "customer_name", "workflow_summary",
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
        content_fields=(
            "activity_type", "activity_content", "remarks",
            "customer_name", "workflow_summary",
        ),
        payload_aliases={
            "supportCode": ("id",),
            "maintenanceId": ("maintenance_id",),
        },
    ),
    DocumentConfig(
        table="company",
        source_type=SourceType.COMPANY,
        id_fields=("companyCode", "company_code", "code", "id"),
        title_fields=("name", "companyName", "company_name", "id"),
        content_fields=(
            "name", "company_type", "sector", "category",
            "address", "business_registration_number",
        ),
        payload_aliases={
            "companyCode": ("code", "id"),
            "companyName": ("name",),
            "customerType": ("company_type",),
        },
    ),
    DocumentConfig(
        table="license",
        source_type=SourceType.LICENSE,
        id_fields=("licenseCode", "license_code", "id"),
        title_fields=("licenseCode", "license_code", "id"),
        content_fields=(
            "status", "license_status", "license_type",
            "product_class", "product_group", "product_name",
            "start_date", "end_date", "quantity", "total_price",
            "opportunity_name", "customer_name", "workflow_summary",
        ),
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
        title_fields=("display_title", "billingCode", "billing_code", "id"),
        content_fields=(
            "status", "billing_amount", "requested_issue_date", "issued_at",
            "remarks", "opportunity_name", "customer_name",
            "workflow_summary",
        ),
        payload_aliases={
            "billingCode": ("id",),
            "projectId": ("project_id",),
            "requesterName": ("workflow_requester_name",),
            "approverNames": ("workflow_approver_names",),
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
    parser.add_argument("--db-url", required=True, help="PostgreSQL connection URL (AI user)")
    parser.add_argument("--backend-db-url", default=None,
                        help="백엔드 owner 유저 URL. OID large object 권한 부여용. "
                             "미지정 시 POSTGRES_USER/PASSWORD/HOST/PORT/DB env 로 자동 구성.")
    parser.add_argument("--ai-base-url", required=True, help="AI API base URL")
    parser.add_argument("--ai-internal-token", required=True, help="AI internal token")
    parser.add_argument("--batch-size", type=int, default=50, help="index API 배치 크기")
    parser.add_argument("--limit-per-table", type=int, default=0, help="테이블별 로우 제한. 0이면 전체")
    return parser.parse_args()


def _grant_oid_to_ai_user(backend_db_url: str, ai_user: str) -> int:
    """백엔드 owner 유저 connection 으로 모든 large object 에 AI user GRANT.

    OID 컬럼 (description/key_success_factors 등) 은 backend 가 owner 라
    AI 유저 (orbis_ai) 가 기본으로는 lo_get 접근 불가. 매 reindex 시작 시
    GRANT 해줘야 새 OID 도 enrichment 가능.
    """
    try:
        with psycopg.connect(backend_db_url) as conn:
            with conn.cursor() as cur:
                cur.execute(f"""
                    DO $$
                    DECLARE oid_val oid;
                    BEGIN
                      FOR oid_val IN SELECT oid FROM pg_largeobject_metadata LOOP
                        BEGIN
                          EXECUTE format('GRANT SELECT ON LARGE OBJECT %s TO {ai_user}', oid_val);
                        EXCEPTION WHEN OTHERS THEN NULL;
                        END;
                      END LOOP;
                    END $$;
                """)
                cur.execute("SELECT count(*) AS n FROM pg_largeobject_metadata")
                row = cur.fetchone()
                return int(row[0] if isinstance(row, tuple) else row.get("count", row.get("n", 0)))
    except Exception as exc:
        print(f"[reindex] OID GRANT 실패 (large object enrichment 비활성): {exc}", flush=True)
        return -1


def _resolve_backend_db_url(args_url: str | None) -> str | None:
    if args_url:
        return args_url
    import os as _os
    user = _os.environ.get("POSTGRES_USER")
    pw = _os.environ.get("POSTGRES_PASSWORD")
    host = _os.environ.get("POSTGRES_HOST", "orbis_postgres")
    port = _os.environ.get("POSTGRES_PORT", "5432")
    db = _os.environ.get("POSTGRES_DB", "orbis_db")
    if not (user and pw):
        return None
    from urllib.parse import quote_plus
    return f"postgresql://{quote_plus(user)}:{quote_plus(pw)}@{host}:{port}/{db}"


def main() -> int:
    args = parse_args()
    # OID large object enrichment 을 위해 backend owner 권한 GRANT
    backend_url = _resolve_backend_db_url(args.backend_db_url)
    if backend_url:
        from urllib.parse import urlparse
        ai_user = urlparse(args.db_url).username or "orbis_ai"
        granted_count = _grant_oid_to_ai_user(backend_url, ai_user)
        if granted_count >= 0:
            print(f"[reindex] OID GRANT ok (large_objects={granted_count} → {ai_user})", flush=True)
    else:
        print("[reindex] backend-db-url 미설정 — OID enrichment 비활성", flush=True)

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
                documents.extend(build_current_bid_result_documents(row, conn=conn))
            elif config.table == "order_report":
                documents.extend(build_current_order_report_documents(row, conn=conn))
            elif config.table == "contract":
                documents.extend(build_current_contract_documents(row, conn=conn))
            elif config.table == "project":
                documents.extend(build_current_project_documents(row, conn=conn))
            elif config.table == "maintenance":
                documents.extend(build_current_maintenance_documents(row, conn=conn))
            elif config.table == "prb":
                documents.extend(build_current_prb_documents(row, conn=conn))
            elif config.table == "prb_result":
                documents.extend(build_current_prb_result_documents(row, conn=conn))
            elif config.table == "billing":
                documents.extend(build_current_billing_documents(row, conn=conn))
            elif config.table == "proposal":
                documents.extend(build_current_proposal_documents(row, conn=conn))
            elif config.table in _TABLE_TO_WORKFLOW_DOMAIN:
                # workflow_summary 만 enrich 하는 경량 builder
                documents.extend(_build_with_workflow_enrich(config=config, row=row, conn=conn))
            else:
                document = build_document(config=config, row=row)
                if document is not None:
                    documents.append(document)
    return documents


# 테이블별 OID(large object) 컬럼 → 텍스트로 풀어서 색인 enrichment
# to_jsonb 는 OID 컬럼을 숫자(참조)로만 직렬화하므로 chunk content 에
# 실제 텍스트가 누락됨. 실주 사유(project_opportunity.description) 등
# 의미 있는 텍스트가 색인 안 돼 LLM 환각의 root cause 가 됨.
_OID_TEXT_COLUMNS: dict[str, tuple[str, ...]] = {
    "project_opportunity": ("description",),
    "bid_result": ("key_success_factors", "proposal_strategy", "rfp_issues"),
}


def _read_oid_text(conn: psycopg.Connection[Any], oid: int) -> str | None:
    try:
        with conn.cursor() as cur:
            cur.execute("SAVEPOINT read_oid")
            try:
                cur.execute("SELECT convert_from(lo_get(%s), 'UTF8') AS text", (oid,))
                row = cur.fetchone()
                cur.execute("RELEASE SAVEPOINT read_oid")
                if row is None:
                    return None
                text = row.get("text") if isinstance(row, dict) else row[0]
                return text if text else None
            except Exception:
                cur.execute("ROLLBACK TO SAVEPOINT read_oid")
                return None
    except Exception:
        return None


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
        rows = [dict(record["row"]) for record in cur.fetchall()]

    # OID 컬럼 텍스트로 enrichment (large object → readable text)
    # to_jsonb 는 OID 를 string ("18394") 으로 직렬화 — int/str 둘 다 처리.
    oid_cols = _OID_TEXT_COLUMNS.get(table)
    if oid_cols:
        for row in rows:
            for col in oid_cols:
                value = row.get(col)
                oid_int: int | None = None
                if isinstance(value, int) and value > 0:
                    oid_int = value
                elif isinstance(value, str) and value.isdigit():
                    n = int(value)
                    if n > 0:
                        oid_int = n
                if oid_int is not None:
                    text = _read_oid_text(conn, oid_int)
                    if text:
                        row[col] = text
    return rows


def _fetch_user_display(
    conn: psycopg.Connection[Any],
    user_id: Any,
) -> dict[str, Any] | None:
    if user_id is None:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SAVEPOINT enrich_user")
            try:
                cur.execute(
                    """
                    SELECT u.name,
                           u.email,
                           u.phone,
                           u.position,
                           u.employee_number,
                           d.headquarters AS dept_headquarters,
                           d.team         AS dept_team
                    FROM users u
                    LEFT JOIN department d ON d.id = u.department_id
                    WHERE u.id = %s
                    """,
                    (str(user_id),),
                )
                row = cur.fetchone()
                cur.execute("RELEASE SAVEPOINT enrich_user")
                return row
            except Exception:
                cur.execute("ROLLBACK TO SAVEPOINT enrich_user")
                return None
    except Exception:
        return None


def _format_user_label(user: dict[str, Any] | None) -> str | None:
    if not user:
        return None
    name = user.get("name")
    if not name:
        return None
    pieces = [str(name)]
    if user.get("position"):
        pieces.append(str(user.get("position")))
    dept_parts = [p for p in (user.get("dept_headquarters"), user.get("dept_team")) if p]
    if dept_parts:
        pieces.append("/".join(str(p) for p in dept_parts))
    return " · ".join(pieces)


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
                cur.execute("SAVEPOINT enrich_opp")
                try:
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
                    cur.execute("RELEASE SAVEPOINT enrich_opp")
                    if activities:
                        parts: list[str] = []
                        for act in activities:
                            act_parts: list[str] = []
                            if act["activity_content"]:
                                act_parts.append(f"활동내용: {act['activity_content']}")
                            if act["customer_interest"]:
                                act_parts.append(f"고객관심사: {act['customer_interest']}")
                            if act["issue"]:
                                act_parts.append(f"이슈: {act['issue']}")
                            if act["next_activity"]:
                                act_parts.append(f"다음활동: {act['next_activity']}")
                            if act_parts:
                                parts.append(" / ".join(act_parts))
                        if parts:
                            activity_summary = "\n".join(parts)
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT enrich_opp")
        except Exception:
            pass

    enriched_row = dict(row)
    sales_rep_label = _format_user_label(_fetch_user_display(conn, row.get("sales_representative_id")))
    if sales_rep_label:
        enriched_row["sales_representative_name"] = sales_rep_label
    if activity_summary:
        enriched_row["recent_activity_summary"] = activity_summary

    # === 빌링/계약 요약 enrichment — billing query 가 사업기회 chunk 에서 hit 되도록 ===
    if opp_id is not None:
        try:
            with conn.cursor() as cur:
                cur.execute("SAVEPOINT enrich_opp_bill")
                try:
                    cur.execute(
                        """
                        SELECT
                            COUNT(b.*) FILTER (WHERE b.status IN ('ISSUED','COLLECTED')) AS billed_cnt,
                            COALESCE(SUM(b.billing_amount) FILTER (WHERE b.status IN ('ISSUED','COLLECTED')), 0) AS billed_total,
                            COUNT(b.*) FILTER (WHERE b.status = 'COLLECTED') AS collected_cnt,
                            COALESCE(SUM(b.billing_amount) FILTER (WHERE b.status = 'COLLECTED'), 0) AS collected_total,
                            COUNT(b.*) FILTER (WHERE b.status = 'ISSUED') AS uncollected_cnt,
                            COALESCE(SUM(b.billing_amount) FILTER (WHERE b.status = 'ISSUED'), 0) AS uncollected_total,
                            COUNT(b.*) FILTER (WHERE b.status IN ('REQUESTED','APPROVED')) AS pending_cnt,
                            COALESCE(SUM(b.billing_amount) FILTER (WHERE b.status IN ('REQUESTED','APPROVED')), 0) AS pending_total
                        FROM billing b
                        JOIN order_report wr ON wr.id = b.order_report_id
                        WHERE wr.project_opportunity_id = %s AND b.deleted = false
                        """,
                        (opp_id,),
                    )
                    bill_row = cur.fetchone()
                    cur.execute("RELEASE SAVEPOINT enrich_opp_bill")
                    if bill_row and (bill_row.get("billed_cnt") or bill_row.get("pending_cnt")):
                        parts: list[str] = []
                        if bill_row.get("billed_cnt"):
                            parts.append(f"청구·발행 {bill_row['billed_cnt']}건 합계 {int(bill_row['billed_total']):,}원")
                        if bill_row.get("collected_cnt"):
                            parts.append(f"수금 완료 {bill_row['collected_cnt']}건 {int(bill_row['collected_total']):,}원")
                        if bill_row.get("uncollected_cnt"):
                            parts.append(f"미수금 {bill_row['uncollected_cnt']}건 {int(bill_row['uncollected_total']):,}원")
                        if bill_row.get("pending_cnt"):
                            parts.append(f"결재 대기 청구 {bill_row['pending_cnt']}건 {int(bill_row['pending_total']):,}원")
                        if parts:
                            enriched_row["billing_summary"] = "청구·수금: " + " / ".join(parts)
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT enrich_opp_bill")
        except Exception:
            pass

    # PRB 종합의견 enrichment — "본부장 결재 권고" 같은 키워드가 사업기회 chunk 에 들어가도록
    if opp_id is not None:
        try:
            with conn.cursor() as cur:
                cur.execute("SAVEPOINT enrich_opp_prb")
                try:
                    cur.execute(
                        """
                        SELECT pr.comprehensive_opinion, pr.decision_status
                        FROM prb p
                        JOIN prb_result pr ON pr.prb_id = p.id
                        WHERE p.project_opportunity_id = %s
                          AND p.deleted = false
                        ORDER BY pr.id DESC
                        LIMIT 1
                        """,
                        (opp_id,),
                    )
                    prb_row = cur.fetchone()
                    cur.execute("RELEASE SAVEPOINT enrich_opp_prb")
                    if prb_row and prb_row.get("comprehensive_opinion"):
                        decision = prb_row.get("decision_status") or ""
                        enriched_row["prb_comprehensive_opinion"] = (
                            f"PRB 결정: {decision}. 종합의견: {prb_row['comprehensive_opinion']}"
                        )
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT enrich_opp_prb")
        except Exception:
            pass

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
                cur.execute("SAVEPOINT enrich_sa")
                try:
                    cur.execute(
                        """
                        SELECT o.opportunity_name, c.name
                        FROM project_opportunity o
                        LEFT JOIN company c ON c.id = o.customer_company_id
                        WHERE o.id = %s
                        """,
                        (opp_id,),
                    )
                    result = cur.fetchone()
                    cur.execute("RELEASE SAVEPOINT enrich_sa")
                    if result:
                        enriched_row["opportunity_name"] = result["opportunity_name"]
                        enriched_row["customer_name"] = result["name"]
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT enrich_sa")
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

    if conn is not None:
        actor_id = (
            row.get("user_id")
            or row.get("sales_representative_id")
            or row.get("owner_id")
            or row.get("created_by")
        )
        actor_label = _format_user_label(_fetch_user_display(conn, actor_id))
        if actor_label:
            enriched_row["actor_name"] = actor_label

    # 참석자 이름 (자사 유저) 조회 — content_fields 에 포함되어 색인 + 답변에 노출됨
    activity_id = row.get("id")
    if conn is not None and activity_id is not None:
        try:
            with conn.cursor() as cur:
                cur.execute("SAVEPOINT enrich_attendees")
                try:
                    cur.execute(
                        """
                        SELECT array_agg(DISTINCT u.name ORDER BY u.name) AS names
                        FROM sales_activity_attendee a
                        JOIN users u ON u.id = a.user_id
                        WHERE a.sales_activity_id = %s
                          AND COALESCE(a.deleted, false) = false
                        """,
                        (activity_id,),
                    )
                    rs = cur.fetchone()
                    cur.execute("RELEASE SAVEPOINT enrich_attendees")
                    # dict_row / tuple row 모두 대응
                    if isinstance(rs, dict):
                        attendees = rs.get("names")
                    elif rs:
                        attendees = rs[0]
                    else:
                        attendees = None
                    if attendees:
                        enriched_row["attendee_names"] = "참석자: " + ", ".join(attendees)
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT enrich_attendees")
        except Exception:
            pass

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
                cur.execute("SAVEPOINT enrich_rfp_req")
                try:
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
                    cur.execute("RELEASE SAVEPOINT enrich_rfp_req")
                    if parent:
                        enriched.update({
                            "rfp_code":           parent["rfp_code"],
                            "rfp_analysis_code":  parent["rfp_analysis_code"] or parent["rfp_code"] or parent["rfp_id"],
                            "opportunity_code":   parent["opportunity_code"],
                            "opportunity_name":   parent["opportunity_name"],
                            "customer_name":      parent["customer_name"],
                        })
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT enrich_rfp_req")
        except Exception:
            pass

    status_label = {
        "O": "지원(O)", "∆": "부분지원(∆)", "X": "미지원(X)", "?": "검토필요(?)"
    }.get(str(enriched.get("support_status", "")), enriched.get("support_status", ""))
    enriched["support_status_label"] = status_label

    document = build_document(config=config, row=enriched)
    return [document] if document is not None else []


def build_current_bid_result_documents(
    row: dict[str, Any],
    conn: psycopg.Connection[Any] | None = None,
) -> list[dict[str, Any]]:
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "bid_result")
    enriched = dict(row)
    if conn is not None:
        summary = _fetch_opportunity_summary(conn, row.get("project_opportunity_id"))
        if summary:
            enriched["opportunity_code"] = summary.get("opportunity_code")
            enriched["opportunity_name"] = summary.get("opportunity_name")
            enriched["customer_name"] = summary.get("customer_name")
    outcome = (enriched.get("bid_outcome") or "").upper()
    outcome_label = "수주(WIN)" if outcome == "WIN" else ("실주(LOSS)" if outcome == "LOSS" else outcome)
    enriched["bid_outcome_label"] = outcome_label
    nice_title = _build_descriptive_title(
        customer_name=enriched.get("customer_name"),
        opportunity_name=enriched.get("opportunity_name"),
        suffix=f"입찰결과·{outcome_label}" if outcome_label else "입찰결과",
        fallback_code=enriched.get("opportunity_code"),
        raw_id=row.get("id"),
    )
    enriched["display_title"] = nice_title

    documents: list[dict[str, Any]] = []
    bid_doc = build_document(
        config=config,
        row=enriched,
        override_title_fields=("display_title", "id"),
    )
    if bid_doc is not None:
        documents.append(bid_doc)
    if is_lost_row(enriched):
        lost_title = _build_descriptive_title(
            customer_name=enriched.get("customer_name"),
            opportunity_name=enriched.get("opportunity_name"),
            suffix="실주",
            fallback_code=enriched.get("opportunity_code"),
            raw_id=row.get("id"),
        )
        enriched_lost = dict(enriched)
        enriched_lost["display_title"] = lost_title
        lost_doc = build_document(
            config=config,
            row=enriched_lost,
            override_source_type=SourceType.LOST,
            override_id_fields=("lostCode", "bidResultCode", "bid_result_code", "id"),
            override_title_fields=("display_title", "lostCode", "bidResultCode", "id"),
        )
        if lost_doc is not None:
            documents.append(lost_doc)
    return documents


_TABLE_TO_WORKFLOW_DOMAIN: dict[str, str] = {
    "quotation": "QUOTATION",
    "maintenance_quotation": "MAINTENANCE_QUOTATION",
    "license": "LICENSE",
    "customer_support": "CUSTOMER_SUPPORT",
}


def _build_with_workflow_enrich(
    *,
    config: "DocumentConfig",
    row: dict[str, Any],
    conn: psycopg.Connection[Any] | None,
) -> list[dict[str, Any]]:
    """workflow_summary 와 (가능 시) opportunity 컨텍스트만 추가하는 경량 enrichment."""
    enriched = dict(row)
    workflow_domain = _TABLE_TO_WORKFLOW_DOMAIN.get(config.table)
    if conn is not None:
        # opportunity 컨텍스트 — 가능한 FK 후보 순서대로 시도
        opp_id = row.get("project_opportunity_id")
        order_report_id = row.get("order_report_id")
        project_id = row.get("project_id")
        summary = None
        if opp_id is not None:
            summary = _fetch_opportunity_summary(conn, opp_id)
        elif order_report_id is not None:
            summary = _fetch_order_report_opp(conn, order_report_id)
        elif project_id is not None:
            summary = _fetch_project_opp_summary(conn, project_id)
        if summary:
            if summary.get("opportunity_code"):
                enriched["opportunity_code"] = summary["opportunity_code"]
            if summary.get("opportunity_name"):
                enriched["opportunity_name"] = summary["opportunity_name"]
            if summary.get("customer_name"):
                enriched["customer_name"] = summary["customer_name"]
        # 회사 직접 lookup (customer_support 등 opportunity 없는 케이스)
        if not enriched.get("customer_name") and row.get("customer_company_id") is not None:
            customer_name = _fetch_company_name(conn, row.get("customer_company_id"))
            if customer_name:
                enriched["customer_name"] = customer_name
        # workflow_summary
        if workflow_domain:
            wf_summary = _fetch_workflow_summary(
                conn, target_id=row.get("id"), workflow_domain=workflow_domain
            )
            if wf_summary:
                enriched["workflow_summary"] = wf_summary
    document = build_document(config=config, row=enriched)
    return [document] if document is not None else []


def _fetch_project_opp_summary(
    conn: psycopg.Connection[Any],
    project_id: Any,
) -> dict[str, Any] | None:
    """project → order_report → opportunity 역추적."""
    if project_id is None:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SAVEPOINT enrich_proj_opp")
            try:
                cur.execute(
                    """
                    SELECT
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name
                    FROM project p
                    LEFT JOIN order_report orr ON orr.id = p.order_report_id
                    LEFT JOIN project_opportunity o ON o.id = orr.project_opportunity_id
                    LEFT JOIN company c ON c.id = o.customer_company_id
                    WHERE p.id = %s
                    """,
                    (project_id,),
                )
                row = cur.fetchone()
                cur.execute("RELEASE SAVEPOINT enrich_proj_opp")
                return row
            except Exception:
                cur.execute("ROLLBACK TO SAVEPOINT enrich_proj_opp")
                return None
    except Exception:
        return None


def _fetch_company_name(
    conn: psycopg.Connection[Any],
    company_id: Any,
) -> str | None:
    if company_id is None:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SAVEPOINT enrich_company")
            try:
                cur.execute("SELECT name FROM company WHERE id = %s", (company_id,))
                row = cur.fetchone()
                cur.execute("RELEASE SAVEPOINT enrich_company")
                return row.get("name") if row else None
            except Exception:
                cur.execute("ROLLBACK TO SAVEPOINT enrich_company")
                return None
    except Exception:
        return None


def _fetch_workflow_summary(
    conn: psycopg.Connection[Any],
    *,
    target_id: Any,
    workflow_domain: str,
) -> str | None:
    """workflow + workflow_line + users 를 join 해 "상신자/결재선/결재 상태" 요약 텍스트를 만든다."""
    if target_id is None:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SAVEPOINT enrich_wf_summary")
            try:
                cur.execute(
                    """
                    SELECT
                        wf.id              AS workflow_id,
                        wf.status          AS workflow_status,
                        ur.name            AS requester_name,
                        ur.position        AS requester_position,
                        dept.headquarters  AS requester_hq,
                        dept.team          AS requester_team
                    FROM workflow wf
                    LEFT JOIN users ur ON ur.id = wf.requester_id
                    LEFT JOIN department dept ON dept.id = ur.department_id
                    WHERE wf.target_id = %s
                      AND wf.workflow_domain = %s
                      AND COALESCE(wf.deleted, false) = false
                    ORDER BY wf.id DESC
                    LIMIT 1
                    """,
                    (target_id, workflow_domain),
                )
                wf_row = cur.fetchone()
                cur.execute("RELEASE SAVEPOINT enrich_wf_summary")
            except Exception:
                cur.execute("ROLLBACK TO SAVEPOINT enrich_wf_summary")
                return None
    except Exception:
        return None

    if not wf_row or not wf_row.get("workflow_id"):
        return None

    try:
        with conn.cursor() as cur:
            cur.execute("SAVEPOINT enrich_wf_lines")
            try:
                cur.execute(
                    """
                    SELECT
                        wl.step_order,
                        wl.status,
                        ua.name     AS approver_name,
                        ua.position AS approver_position
                    FROM workflow_line wl
                    LEFT JOIN users ua ON ua.id = wl.approver_id
                    WHERE wl.workflow_id = %s
                      AND COALESCE(wl.deleted, false) = false
                    ORDER BY wl.step_order
                    """,
                    (wf_row["workflow_id"],),
                )
                lines = cur.fetchall() or []
                cur.execute("RELEASE SAVEPOINT enrich_wf_lines")
            except Exception:
                cur.execute("ROLLBACK TO SAVEPOINT enrich_wf_lines")
                lines = []
    except Exception:
        lines = []

    requester_label = wf_row.get("requester_name") or "미기재"
    if wf_row.get("requester_position"):
        requester_label = f"{requester_label}({wf_row['requester_position']})"
    dept_parts = [p for p in (wf_row.get("requester_hq"), wf_row.get("requester_team")) if p]
    if dept_parts:
        requester_label = f"{requester_label} · {'/'.join(dept_parts)}"

    approver_summary: list[str] = []
    for line in lines:
        name = line.get("approver_name") or "미기재"
        pos = line.get("approver_position") or ""
        status = line.get("status") or ""
        status_label = {
            "APPROVED": "승인", "REJECTED": "반려", "PENDING": "대기",
            "WAITING": "대기", "SKIPPED": "스킵",
        }.get(str(status).upper(), status)
        step = line.get("step_order")
        piece = f"{step}단계 {name}({pos}) → {status_label}" if pos else f"{step}단계 {name} → {status_label}"
        approver_summary.append(piece)

    wf_status = wf_row.get("workflow_status") or ""
    wf_status_label = {
        "IN_PROGRESS": "결재 진행 중", "APPROVED": "결재 완료",
        "REJECTED": "반려", "CANCELED": "취소",
    }.get(str(wf_status).upper(), wf_status)

    summary_lines = [f"상신자: {requester_label}", f"결재 상태: {wf_status_label}"]
    if approver_summary:
        summary_lines.append("결재선: " + " / ".join(approver_summary))
    return "\n".join(summary_lines)


def build_current_proposal_documents(
    row: dict[str, Any],
    conn: psycopg.Connection[Any] | None = None,
) -> list[dict[str, Any]]:
    """PROPOSAL 도메인 인덱싱 — opportunity 컨텍스트 + descriptive title."""
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "proposal")
    enriched = dict(row)
    if conn is not None:
        opp_id = row.get("project_opportunity_id")
        if opp_id is not None:
            summary = _fetch_opportunity_summary(conn, opp_id)
            if summary:
                if summary.get("opportunity_code"):
                    enriched["opportunity_code"] = summary["opportunity_code"]
                if summary.get("opportunity_name"):
                    enriched["opportunity_name"] = summary["opportunity_name"]
                if summary.get("customer_name"):
                    enriched["customer_name"] = summary["customer_name"]

    status_label = {
        "IN_PROGRESS": "작성 중", "COMPLETED": "완료",
    }.get(str(row.get("status") or "").upper(), row.get("status") or "")
    enriched["display_title"] = _build_descriptive_title(
        customer_name=enriched.get("customer_name"),
        opportunity_name=enriched.get("opportunity_name"),
        suffix=f"제안서·{status_label}" if status_label else "제안서",
        fallback_code=enriched.get("opportunity_code"),
        raw_id=row.get("id"),
    )
    document = build_document(config=config, row=enriched)
    return [document] if document is not None else []


def build_current_billing_documents(
    row: dict[str, Any],
    conn: psycopg.Connection[Any] | None = None,
) -> list[dict[str, Any]]:
    """BILLING 도메인 인덱싱 — workflow 상신자/결재선 + opportunity 컨텍스트 enrichment."""
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "billing")
    enriched = dict(row)
    billing_id = row.get("id")
    order_report_id = row.get("order_report_id")

    # order_report → project_opportunity → company
    if conn is not None and order_report_id is not None:
        opp_summary = _fetch_order_report_opp(conn, order_report_id)
        if opp_summary:
            if opp_summary.get("opportunity_code"):
                enriched["opportunity_code"] = opp_summary["opportunity_code"]
            if opp_summary.get("opportunity_name"):
                enriched["opportunity_name"] = opp_summary["opportunity_name"]
            if opp_summary.get("customer_name"):
                enriched["customer_name"] = opp_summary["customer_name"]

    # workflow summary
    if conn is not None and billing_id is not None:
        wf_summary = _fetch_workflow_summary(conn, target_id=billing_id, workflow_domain="BILLING")
        if wf_summary:
            enriched["workflow_summary"] = wf_summary

    # title
    amount = row.get("billing_amount")
    amount_label = f"{int(amount):,}원" if amount else None
    status_label = {
        "REQUESTED": "결재요청", "APPROVED": "결재완료", "ISSUED": "발행",
        "COLLECTED": "수금완료", "CANCELED": "취소",
    }.get(str(row.get("status") or "").upper(), row.get("status") or "")
    suffix_pieces = ["청구"]
    if status_label:
        suffix_pieces.append(status_label)
    if amount_label:
        suffix_pieces.append(amount_label)
    enriched["display_title"] = _build_descriptive_title(
        customer_name=enriched.get("customer_name"),
        opportunity_name=enriched.get("opportunity_name"),
        suffix="·".join(suffix_pieces),
        fallback_code=enriched.get("opportunity_code"),
        raw_id=row.get("id"),
    )

    document = build_document(config=config, row=enriched)
    return [document] if document is not None else []


def build_current_prb_documents(
    row: dict[str, Any],
    conn: psycopg.Connection[Any] | None = None,
) -> list[dict[str, Any]]:
    """PRB 도메인 인덱싱 — prb_result 위험요인/종합의견을 join 해서 PRB chunk 안에 노출."""
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "prb")
    enriched = dict(row)

    if conn is not None:
        opp_id = row.get("project_opportunity_id")
        if opp_id is not None:
            summary = _fetch_opportunity_summary(conn, opp_id)
            if summary:
                enriched.setdefault("opportunity_code", summary.get("opportunity_code"))
                enriched.setdefault("opportunity_name", summary.get("opportunity_name"))
                enriched.setdefault("customer_name", summary.get("customer_name"))

        prb_id = row.get("id")
        if prb_id is not None:
            try:
                with conn.cursor() as cur:
                    cur.execute("SAVEPOINT enrich_prb_result_join")
                    try:
                        cur.execute(
                            """
                            SELECT pr.risk_factors,
                                   pr.comprehensive_opinion,
                                   pr.status AS decision_status
                            FROM prb_result pr
                            WHERE pr.prb_id = %s
                              AND COALESCE(pr.deleted, false) = false
                            ORDER BY pr.prb_result_id DESC
                            LIMIT 1
                            """,
                            (prb_id,),
                        )
                        pr_row = cur.fetchone()
                        cur.execute("RELEASE SAVEPOINT enrich_prb_result_join")
                        if pr_row:
                            risks = pr_row.get("risk_factors")
                            if risks:
                                enriched["risk_factors_text"] = f"위험요인: {risks}"
                            opinion = pr_row.get("comprehensive_opinion")
                            decision = pr_row.get("decision_status") or ""
                            if opinion:
                                decision_label = {
                                    "APPROVED": "승인", "REJECTED": "부결", "CONDITIONAL": "조건부",
                                    "PENDING": "대기", "HOLD": "보류", "DRAFT": "초안", "CANCELED": "취소",
                                }.get(str(decision).upper(), decision)
                                prefix = f"PRB 결과 ({decision_label})" if decision_label else "PRB 결과"
                                enriched["prb_result_opinion_text"] = f"{prefix}: {opinion}"
                    except Exception:
                        cur.execute("ROLLBACK TO SAVEPOINT enrich_prb_result_join")
            except Exception:
                pass

    nice_title = _build_descriptive_title(
        customer_name=enriched.get("customer_name"),
        opportunity_name=enriched.get("opportunity_name"),
        suffix="PRB",
        fallback_code=enriched.get("opportunity_code"),
        raw_id=row.get("prb_code") or row.get("id"),
    )
    enriched["display_title"] = nice_title

    document = build_document(config=config, row=enriched)
    return [document] if document is not None else []


def build_current_prb_result_documents(
    row: dict[str, Any],
    conn: psycopg.Connection[Any] | None = None,
) -> list[dict[str, Any]]:
    """PRB Result 도메인 인덱싱 (회의록·종합의견·참석자 의견)."""
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "prb_result")
    enriched = dict(row)
    if conn is not None:
        # PRB → opportunity 역추적
        prb_id = row.get("prb_id")
        if prb_id is not None:
            try:
                with conn.cursor() as cur:
                    cur.execute("SAVEPOINT enrich_prb_result_opp")
                    try:
                        cur.execute(
                            """
                            SELECT po.opportunity_code, po.opportunity_name, c.name AS customer_name
                            FROM prb p
                            JOIN project_opportunity po ON po.id = p.project_opportunity_id
                            LEFT JOIN company c ON c.id = po.customer_company_id
                            WHERE p.id = %s
                            """,
                            (prb_id,),
                        )
                        opp_row = cur.fetchone()
                        cur.execute("RELEASE SAVEPOINT enrich_prb_result_opp")
                        if opp_row:
                            enriched["opportunity_code"] = opp_row.get("opportunity_code")
                            enriched["opportunity_name"] = opp_row.get("opportunity_name")
                            enriched["customer_name"] = opp_row.get("customer_name")
                    except Exception:
                        cur.execute("ROLLBACK TO SAVEPOINT enrich_prb_result_opp")
            except Exception:
                pass
        # 참석자 의견 join
        prb_result_id = row.get("prb_result_id") or row.get("id")
        if prb_result_id is not None:
            try:
                with conn.cursor() as cur:
                    cur.execute("SAVEPOINT enrich_prb_result_attendees")
                    try:
                        cur.execute(
                            """
                            SELECT u.name AS attendee_name, ao.opinion, ao.approval_status
                            FROM prb_result_attendee_opinion ao
                            LEFT JOIN users u ON u.id = ao.attendee_user_id
                            WHERE ao.prb_result_id = %s
                            ORDER BY ao.id
                            """,
                            (prb_result_id,),
                        )
                        attendee_rows = cur.fetchall() or []
                        cur.execute("RELEASE SAVEPOINT enrich_prb_result_attendees")
                        if attendee_rows:
                            names = [r.get("attendee_name") for r in attendee_rows if r.get("attendee_name")]
                            enriched["attendee_names"] = ", ".join(names)
                            lines = []
                            for r in attendee_rows:
                                line = f"- {r.get('attendee_name') or '익명'}({r.get('approval_status') or ''}): {r.get('opinion') or ''}"
                                lines.append(line)
                            enriched["attendee_opinions_text"] = "참석자 의견:\n" + "\n".join(lines)
                    except Exception:
                        cur.execute("ROLLBACK TO SAVEPOINT enrich_prb_result_attendees")
            except Exception:
                pass

    decision = (enriched.get("decision_status") or "").upper()
    decision_label = {
        "APPROVED": "승인", "REJECTED": "부결", "CONDITIONAL": "조건부",
        "PENDING": "대기", "HOLD": "보류",
    }.get(decision, decision)
    enriched["decision_label"] = decision_label

    nice_title = _build_descriptive_title(
        customer_name=enriched.get("customer_name"),
        opportunity_name=enriched.get("opportunity_name"),
        suffix=f"PRB결과·{decision_label}" if decision_label else "PRB결과",
        fallback_code=enriched.get("opportunity_code"),
        raw_id=row.get("prb_result_id") or row.get("id"),
    )
    enriched["display_title"] = nice_title

    document = build_document(
        config=config,
        row=enriched,
        override_title_fields=("display_title", "prb_result_id", "id"),
    )
    return [document] if document is not None else []


def _fetch_opportunity_summary(
    conn: psycopg.Connection[Any],
    opp_id: Any,
) -> dict[str, Any] | None:
    """사업기회 id로 사업기회명/고객사명/코드 묶음을 조회한다."""
    if opp_id is None:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SAVEPOINT enrich_opp_summary")
            try:
                cur.execute(
                    """
                    SELECT
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name
                    FROM project_opportunity o
                    LEFT JOIN company c ON c.id = o.customer_company_id
                    WHERE o.id = %s
                    """,
                    (opp_id,),
                )
                row = cur.fetchone()
                cur.execute("RELEASE SAVEPOINT enrich_opp_summary")
                return row
            except Exception:
                cur.execute("ROLLBACK TO SAVEPOINT enrich_opp_summary")
                return None
    except Exception:
        return None


def _fetch_order_report_opp(
    conn: psycopg.Connection[Any],
    order_report_id: Any,
) -> dict[str, Any] | None:
    if order_report_id is None:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SAVEPOINT enrich_or_opp")
            try:
                cur.execute(
                    """
                    SELECT
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        orr.contract_date,
                        orr.total_amount AS contract_amount
                    FROM order_report orr
                    LEFT JOIN project_opportunity o ON o.id = orr.project_opportunity_id
                    LEFT JOIN company c ON c.id = o.customer_company_id
                    WHERE orr.id = %s
                    """,
                    (order_report_id,),
                )
                row = cur.fetchone()
                cur.execute("RELEASE SAVEPOINT enrich_or_opp")
                return row
            except Exception:
                cur.execute("ROLLBACK TO SAVEPOINT enrich_or_opp")
                return None
    except Exception:
        return None


def _build_descriptive_title(
    *,
    customer_name: str | None,
    opportunity_name: str | None,
    suffix: str,
    fallback_code: str | None,
    raw_id: Any,
) -> str:
    """`고객사 - 사업기회명 [suffix]` 형식의 가독성 좋은 제목을 만든다."""
    parts: list[str] = []
    if customer_name:
        parts.append(str(customer_name))
    if opportunity_name and opportunity_name != customer_name:
        parts.append(str(opportunity_name))
    if parts:
        title = " - ".join(parts)
        return f"{title} [{suffix}]" if suffix else title
    if fallback_code:
        return f"{fallback_code} [{suffix}]" if suffix else str(fallback_code)
    if raw_id is not None:
        return f"{suffix} #{raw_id}" if suffix else str(raw_id)
    return suffix or "(제목 없음)"


def build_current_order_report_documents(
    row: dict[str, Any],
    conn: psycopg.Connection[Any] | None = None,
) -> list[dict[str, Any]]:
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "order_report")
    enriched = dict(row)
    if conn is not None:
        summary = _fetch_opportunity_summary(conn, row.get("project_opportunity_id"))
        if summary:
            enriched["opportunity_code"] = summary.get("opportunity_code")
            enriched["opportunity_name"] = summary.get("opportunity_name")
            enriched["customer_name"] = summary.get("customer_name")
        pm_label = _format_user_label(_fetch_user_display(conn, row.get("pm_user_id")))
        if pm_label:
            enriched["pm_name"] = pm_label
        wf_summary = _fetch_workflow_summary(conn, target_id=row.get("id"), workflow_domain="ORDER_REPORT")
        if wf_summary:
            enriched["workflow_summary"] = wf_summary
    nice_title = _build_descriptive_title(
        customer_name=enriched.get("customer_name"),
        opportunity_name=enriched.get("opportunity_name"),
        suffix="수주보고서",
        fallback_code=enriched.get("won_report_code") or enriched.get("opportunity_code"),
        raw_id=row.get("id"),
    )
    enriched["display_title"] = nice_title
    order_doc = build_document(
        config=config,
        row=enriched,
        override_title_fields=("display_title", "wonReportCode", "won_report_code", "id"),
    )
    won_title = _build_descriptive_title(
        customer_name=enriched.get("customer_name"),
        opportunity_name=enriched.get("opportunity_name"),
        suffix="수주",
        fallback_code=enriched.get("won_report_code") or enriched.get("opportunity_code"),
        raw_id=row.get("id"),
    )
    enriched_won = dict(enriched)
    enriched_won["display_title"] = won_title
    won_doc = build_document(
        config=config,
        row=enriched_won,
        override_source_type=SourceType.WON,
        override_id_fields=("wonCode", "wonReportCode", "won_report_code", "id"),
        override_title_fields=("display_title", "wonCode", "wonReportCode", "id"),
    )
    return [doc for doc in (order_doc, won_doc) if doc is not None]


def build_current_contract_documents(
    row: dict[str, Any],
    conn: psycopg.Connection[Any] | None = None,
) -> list[dict[str, Any]]:
    """계약 문서를 고객사/사업기회 정보로 enrich 해 인덱싱한다."""
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "contract")
    enriched = dict(row)
    if conn is not None:
        summary = _fetch_order_report_opp(conn, row.get("order_report_id"))
        if summary:
            enriched["opportunity_code"] = summary.get("opportunity_code")
            enriched["opportunity_name"] = summary.get("opportunity_name")
            enriched["customer_name"] = summary.get("customer_name")
            if summary.get("contract_amount") and not enriched.get("contract_amount"):
                enriched["contract_amount"] = summary.get("contract_amount")
        sales_rep_label = _format_user_label(_fetch_user_display(conn, row.get("sales_representative_id")))
        if sales_rep_label:
            enriched["sales_representative_name"] = sales_rep_label
        wf_summary = _fetch_workflow_summary(conn, target_id=row.get("id"), workflow_domain="CONTRACT")
        if wf_summary:
            enriched["workflow_summary"] = wf_summary
    nice_title = _build_descriptive_title(
        customer_name=enriched.get("customer_name"),
        opportunity_name=enriched.get("opportunity_name"),
        suffix="계약",
        fallback_code=enriched.get("contract_code") or enriched.get("opportunity_code"),
        raw_id=row.get("id"),
    )
    enriched["display_title"] = nice_title
    doc = build_document(
        config=config,
        row=enriched,
        override_title_fields=("display_title", "contractCode", "contract_code", "id"),
    )
    return [doc] if doc is not None else []


def build_current_project_documents(
    row: dict[str, Any],
    conn: psycopg.Connection[Any] | None = None,
) -> list[dict[str, Any]]:
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "project")
    enriched = dict(row)
    if conn is not None:
        summary = _fetch_order_report_opp(conn, row.get("order_report_id"))
        if summary:
            enriched["opportunity_code"] = summary.get("opportunity_code")
            enriched["opportunity_name"] = summary.get("opportunity_name")
            enriched["customer_name"] = summary.get("customer_name")
    nice_title = _build_descriptive_title(
        customer_name=enriched.get("customer_name"),
        opportunity_name=enriched.get("opportunity_name"),
        suffix="프로젝트",
        fallback_code=enriched.get("code") or enriched.get("pjt_number") or enriched.get("opportunity_code"),
        raw_id=row.get("id"),
    )
    enriched["display_title"] = nice_title
    doc = build_document(
        config=config,
        row=enriched,
        override_title_fields=("display_title", "code", "pjt_number", "id"),
    )
    return [doc] if doc is not None else []


def build_current_maintenance_documents(
    row: dict[str, Any],
    conn: psycopg.Connection[Any] | None = None,
) -> list[dict[str, Any]]:
    config = next(cfg for cfg in CURRENT_PUBLIC_CONFIGS if cfg.table == "maintenance")
    enriched = dict(row)
    if conn is not None and row.get("project_id") is not None:
        try:
            with conn.cursor() as cur:
                cur.execute("SAVEPOINT enrich_maint")
                try:
                    cur.execute(
                        """
                        SELECT
                            o.opportunity_code,
                            o.opportunity_name,
                            c.name AS customer_name
                        FROM project p
                        LEFT JOIN order_report orr ON orr.id = p.order_report_id
                        LEFT JOIN project_opportunity o ON o.id = orr.project_opportunity_id
                        LEFT JOIN company c ON c.id = o.customer_company_id
                        WHERE p.id = %s
                        """,
                        (row.get("project_id"),),
                    )
                    summary = cur.fetchone()
                    cur.execute("RELEASE SAVEPOINT enrich_maint")
                    if summary:
                        enriched["opportunity_code"] = summary.get("opportunity_code")
                        enriched["opportunity_name"] = summary.get("opportunity_name")
                        enriched["customer_name"] = summary.get("customer_name")
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT enrich_maint")
        except Exception:
            pass
    # 유지보수 유형/상태를 자연어 라벨로 변환 (FREE/PAID/DRAFT 등)
    raw_type = (enriched.get("type") or "").upper()
    type_label = "무상 유지보수" if raw_type == "FREE" else ("유상 유지보수" if raw_type == "PAID" else raw_type)
    enriched["maintenance_type_label"] = type_label
    raw_status = (enriched.get("status") or "").upper()
    # DRAFT 는 등록 직후 상태이지만 실제 유지보수 기간이 진행 중이면 운영 중으로 본다
    today = date.today()
    start_d = enriched.get("start_date")
    end_d = enriched.get("end_date")
    if isinstance(start_d, str):
        try:
            start_d = date.fromisoformat(start_d[:10])
        except Exception:
            start_d = None
    if isinstance(end_d, str):
        try:
            end_d = date.fromisoformat(end_d[:10])
        except Exception:
            end_d = None
    if start_d and end_d and start_d <= today <= end_d:
        progress_label = "기간 내 유지보수 진행 중"
    elif start_d and start_d > today:
        progress_label = "유지보수 시작 전 (등록 완료)"
    elif end_d and end_d < today:
        progress_label = "유지보수 종료"
    else:
        progress_label = "유지보수 등록 (DRAFT)"
    enriched["maintenance_progress_label"] = progress_label

    nice_title = _build_descriptive_title(
        customer_name=enriched.get("customer_name"),
        opportunity_name=enriched.get("opportunity_name"),
        suffix=f"{type_label}·{progress_label}" if type_label else progress_label,
        fallback_code=enriched.get("opportunity_code"),
        raw_id=row.get("id"),
    )
    enriched["display_title"] = nice_title
    doc = build_document(
        config=config,
        row=enriched,
        override_title_fields=("display_title", "id"),
    )
    return [doc] if doc is not None else []


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

    import time as _time
    return {
        "sourceType": source_type,
        "sourceId": source_id,
        "operation": "UPSERT",
        "title": title,
        "sourcePath": source_path,
        "content": content,
        "payload": payload,
        "metadata": build_metadata(payload=payload, source_type=source_type, source_table=config.table),
        # eventId 에 timestamp 를 포함해 SKIPPED_DUPLICATE 우회. 매 reindex 마다 새 이벤트로 인식되어
        # 본문이 실제로 변경됐을 경우만 chunks 재생성. 본문이 같으면 그래도 SKIPPED_UNCHANGED.
        "eventId": f"reindex:{config.table}:{source_type}:{source_id}:{int(_time.time())}",
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
    for key in ("current_status", "order_status", "bid_result", "result_status", "status", "bid_outcome"):
        value = row.get(key)
        if value is None:
            continue
        normalized = str(value).strip().lower()
        if any(token in normalized for token in ("lost", "loss", "실주", "탈락", "패")):
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
