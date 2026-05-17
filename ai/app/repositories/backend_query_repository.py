import logging
import re
from functools import lru_cache
from typing import Any

import psycopg
from psycopg.rows import dict_row

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.models.constants import TABLE as _TABLE

# ---------------------------------------------------------------------------
# 테이블명 로컬 별칭 - 테이블명 변경 시 constants.py 의 TABLE 만 수정
# ---------------------------------------------------------------------------
_OPP  = _TABLE["opportunities"]
_CO   = _TABLE["companies"]
_QT   = _TABLE["quotes"]
_QI   = _TABLE["quote_items"]
_QL   = _TABLE["quote_labor_items"]
_PRB  = _TABLE["prbs"]
_PRBR = _TABLE["prb_results"]
_RFP  = _TABLE["rfp_analyses"]
_WR   = _TABLE["won_reports"]
_CT   = _TABLE["contracts"]
_PROJ = _TABLE["projects"]
_PR   = _TABLE["project_reports"]
_MC   = _TABLE["maintenance_contracts"]
_CS   = _TABLE["customer_supports"]
_MQ   = _TABLE["maintenance_quotes"]
_MQI  = _TABLE["maintenance_quote_items"]
_BID  = _TABLE["bid_results"]
_PROP = _TABLE["proposals"]
_ATT  = _TABLE["attachments"]
_ACT  = _TABLE["activities"]
_PS   = _TABLE["post_sales"]
_SAR  = _TABLE["activity_requests"]
_BL   = _TABLE["billings"]


def build_backend_database_url() -> str:
    if settings.postgres_host and settings.postgres_user and settings.postgres_password and settings.postgres_db:
        return (
            f"postgresql://{settings.postgres_user}:{settings.postgres_password}"
            f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
        )

    postgres_url = require_env("POSTGRES_URL")
    postgres_user = require_env("POSTGRES_USER")
    postgres_password = require_env("POSTGRES_PASSWORD")
    match = re.match(r"^jdbc:postgresql://(?P<host>[^:/]+):(?P<port>\d+)/(?P<db>[^?]+)", postgres_url)
    if not match:
        raise ValueError(f"Unsupported POSTGRES_URL format: {postgres_url}")

    host = match.group("host")
    port = match.group("port")
    database = match.group("db")
    return f"postgresql://{postgres_user}:{postgres_password}@{host}:{port}/{database}"


def require_env(name: str) -> str:
    value = settings.model_dump().get(name.lower())
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return str(value)


@lru_cache(maxsize=64)
def fetch_public_table_columns(table_name: str) -> frozenset[str]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = %(table_name)s
                """,
                {"table_name": table_name},
            )
            return frozenset(str(row["column_name"]) for row in cur.fetchall())


def optional_column_expr(
    *,
    table_name: str,
    table_alias: str,
    output_name: str,
    candidates: tuple[str, ...],
    cast_type: str = "text",
) -> str:
    columns = fetch_public_table_columns(table_name)
    for candidate in candidates:
        if candidate in columns:
            return f"{table_alias}.{candidate} AS {output_name}"
    return f"NULL::{cast_type} AS {output_name}"


def _first_existing_column_expr(
    *,
    table_name: str,
    table_alias: str,
    candidates: tuple[str, ...],
    cast_type: str = "text",
) -> str:
    columns = fetch_public_table_columns(table_name)
    for candidate in candidates:
        if candidate in columns:
            return f"{table_alias}.{candidate}"
    return f"NULL::{cast_type}"


def company_name_value_expr(*, table_alias: str = "c") -> str:
    return _first_existing_column_expr(
        table_name="company",
        table_alias=table_alias,
        candidates=("company_name", "name"),
    )


def company_name_select_expr(*, table_alias: str = "c", output_name: str = "customer_name") -> str:
    return f"{company_name_value_expr(table_alias=table_alias)} AS {output_name}"


def customer_type_value_expr(*, table_alias: str = "c") -> str:
    return _first_existing_column_expr(
        table_name="company",
        table_alias=table_alias,
        candidates=("customer_type", "company_type"),
    )


def customer_type_select_expr(*, table_alias: str = "c", output_name: str = "customer_type") -> str:
    return f"{customer_type_value_expr(table_alias=table_alias)} AS {output_name}"


def customer_group_value_expr(*, table_alias: str = "c") -> str:
    columns = fetch_public_table_columns("company")
    if "customer_group" in columns:
        return f"{table_alias}.customer_group"
    if "sector" in columns:
        return (
            f"CASE "
            f"WHEN upper({table_alias}.sector) = 'PUBLIC' THEN '공공' "
            f"WHEN upper({table_alias}.sector) = 'PRIVATE' THEN '민간' "
            f"ELSE {table_alias}.sector END"
        )
    return "NULL::text"


def customer_group_select_expr(*, table_alias: str = "c", output_name: str = "customer_group") -> str:
    return f"{customer_group_value_expr(table_alias=table_alias)} AS {output_name}"


def order_report_code_value_expr(*, table_alias: str = "w") -> str:
    return _first_existing_column_expr(
        table_name="order_report",
        table_alias=table_alias,
        candidates=("won_report_code", "order_report_code"),
    )


def order_report_amount_value_expr(*, table_alias: str = "w") -> str:
    return _first_existing_column_expr(
        table_name="order_report",
        table_alias=table_alias,
        candidates=("contract_amount", "total_amount", "item_total_amount"),
        cast_type="numeric",
    )


def order_report_revenue_category_value_expr(*, table_alias: str = "w") -> str:
    return _first_existing_column_expr(
        table_name="order_report",
        table_alias=table_alias,
        candidates=("revenue_category", "type", "code_type"),
    )


def order_report_payment_terms_value_expr(*, table_alias: str = "w") -> str:
    return _first_existing_column_expr(
        table_name="order_report",
        table_alias=table_alias,
        candidates=("payment_terms", "payment_condition"),
    )


def order_report_business_scope_value_expr(*, table_alias: str = "w") -> str:
    return _first_existing_column_expr(
        table_name="order_report",
        table_alias=table_alias,
        candidates=("business_scope", "scope_of_work"),
    )


def order_report_special_notes_value_expr(*, table_alias: str = "w") -> str:
    return _first_existing_column_expr(
        table_name="order_report",
        table_alias=table_alias,
        candidates=("special_notes", "remarks"),
    )


def opportunity_status_value_expr(*, table_alias: str = "o") -> str:
    return _first_existing_column_expr(
        table_name="project_opportunity",
        table_alias=table_alias,
        candidates=("current_status", "stage"),
    )


def opportunity_status_select_expr(*, table_alias: str = "o", output_name: str = "current_status") -> str:
    return f"{opportunity_status_value_expr(table_alias=table_alias)} AS {output_name}"


def opportunity_business_type_value_expr(*, table_alias: str = "o") -> str:
    return _first_existing_column_expr(
        table_name="project_opportunity",
        table_alias=table_alias,
        candidates=("business_type", "project_type"),
    )


def opportunity_business_type_select_expr(*, table_alias: str = "o", output_name: str = "business_type") -> str:
    return f"{opportunity_business_type_value_expr(table_alias=table_alias)} AS {output_name}"


def opportunity_expected_amount_value_expr(*, table_alias: str = "o") -> str:
    return _first_existing_column_expr(
        table_name="project_opportunity",
        table_alias=table_alias,
        candidates=("expected_amount", "expected_budget"),
        cast_type="numeric",
    )


def opportunity_expected_amount_select_expr(*, table_alias: str = "o", output_name: str = "expected_amount") -> str:
    return f"{opportunity_expected_amount_value_expr(table_alias=table_alias)} AS {output_name}"


def opportunity_bid_date_value_expr(*, table_alias: str = "o") -> str:
    return _first_existing_column_expr(
        table_name="project_opportunity",
        table_alias=table_alias,
        candidates=("expected_bid_date", "bid_date"),
        cast_type="date",
    )


def opportunity_bid_date_select_expr(*, table_alias: str = "o", output_name: str = "bid_date") -> str:
    return f"{opportunity_bid_date_value_expr(table_alias=table_alias)} AS {output_name}"


def opportunity_contract_date_select_expr(*, table_alias: str = "o", output_name: str = "contract_date") -> str:
    return optional_column_expr(
        table_name="project_opportunity",
        table_alias=table_alias,
        output_name=output_name,
        candidates=("contract_date", "expected_date"),
        cast_type="date",
    )


def opportunity_competition_status_value_expr(*, table_alias: str = "o") -> str:
    return _first_existing_column_expr(
        table_name="project_opportunity",
        table_alias=table_alias,
        candidates=("competitor_status", "competition_status"),
    )


def opportunity_competition_status_select_expr(
    *,
    table_alias: str = "o",
    output_name: str = "competitor_status",
) -> str:
    return f"{opportunity_competition_status_value_expr(table_alias=table_alias)} AS {output_name}"


def opportunity_competitors_select_expr(*, table_alias: str = "o", output_name: str = "competitors") -> str:
    columns = fetch_public_table_columns("project_opportunity")
    if "competitors" in columns:
        return f"array_to_string({table_alias}.competitors, ', ') AS {output_name}"
    return f"NULL::text AS {output_name}"


def opportunity_main_content_select_expr(*, table_alias: str = "o", output_name: str = "main_content") -> str:
    columns = fetch_public_table_columns("project_opportunity")
    if "main_content" in columns:
        return f"{table_alias}.main_content AS {output_name}"
    if "description" in columns:
        return (
            f"CASE WHEN {table_alias}.description IS NULL THEN NULL::text "
            f"ELSE convert_from(lo_get({table_alias}.description), 'UTF8') END AS {output_name}"
        )
    return f"NULL::text AS {output_name}"


def project_opportunity_fk_value_expr(*, table_name: str, table_alias: str) -> str:
    return _first_existing_column_expr(
        table_name=table_name,
        table_alias=table_alias,
        candidates=("opportunity_id", "project_opportunity_id"),
        cast_type="bigint",
    )


def order_report_fk_value_expr(*, table_name: str, table_alias: str) -> str:
    return _first_existing_column_expr(
        table_name=table_name,
        table_alias=table_alias,
        candidates=("won_report_id", "order_report_id"),
        cast_type="bigint",
    )


def fetch_ranked_metric_rows(
    *,
    metric_key: str,
    sort_direction: str,
    status_filters: list[str],
    filters: dict[str, list[str]] | None = None,
    limit: int = 2,
) -> list[dict[str, Any]]:
    filters = filters or {}
    if metric_key == "activity_recency_gap_days":
        return fetch_activity_recency_gap_rows(
            sort_direction=sort_direction,
            status_filters=status_filters,
            filters=filters,
            limit=limit,
        )
    if metric_key == "pipeline_data_completeness_index":
        return fetch_pipeline_completeness_rows(
            sort_direction=sort_direction,
            status_filters=status_filters,
            filters=filters,
            limit=limit,
        )
    if metric_key == "proposal_lift_probability":
        return fetch_proposal_lift_probability_rows(
            sort_direction=sort_direction,
            status_filters=status_filters,
            filters=filters,
            limit=limit,
        )
    if metric_key == "free_to_paid_conversion_propensity":
        return fetch_free_to_paid_conversion_rows(
            sort_direction=sort_direction,
            status_filters=status_filters,
            filters=filters,
            limit=limit,
        )

    sql, metric_column = build_metric_query(
        metric_key=metric_key,
        sort_direction=sort_direction,
        status_filters=status_filters,
        filters=filters,
    )
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, build_query_params(status_filters=status_filters, filters=filters, limit=limit))
            rows = list(cur.fetchall())

    for row in rows:
        row["metric_value"] = row[metric_column]
    return rows


def fetch_metric_rows_for_opportunity_codes(
    *,
    metric_key: str,
    opportunity_codes: list[str],
) -> list[dict[str, Any]]:
    if not opportunity_codes:
        return []
    metric_column = metric_key
    customer_name_expr = company_name_select_expr()
    customer_group_expr = customer_group_select_expr()
    customer_type_expr = customer_type_select_expr()
    opportunity_status_expr = opportunity_status_select_expr()
    opportunity_expected_amount_expr = opportunity_expected_amount_select_expr()
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            if metric_key in {"estimated_profit", "estimated_profit_rate", "expected_win_rate", "estimated_revenue"}:
                cur.execute(
                    f"""
                    SELECT
                        p.prb_code AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        {customer_name_expr},
                        {opportunity_status_expr},
                        p.estimated_profit,
                        p.estimated_profit_rate,
                        p.expected_win_rate,
                        p.estimated_revenue,
                        p.total_cost,
                        p.risk_factors,
                        p.sales_opinion
                    FROM {_PRB} p
                    JOIN {_OPP} o ON o.id = p.opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    WHERE o.opportunity_code = ANY(%(opportunity_codes)s::varchar[])
                      AND p.{metric_key} IS NOT NULL
                    ORDER BY p.{metric_key} DESC, p.id
                    """,
                    {"opportunity_codes": opportunity_codes},
                )
            elif metric_key == "expected_amount":
                cur.execute(
                    f"""
                    SELECT
                        o.opportunity_code AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        {customer_name_expr},
                        {opportunity_status_expr},
                        {opportunity_expected_amount_expr}
                    FROM {_OPP} o
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    WHERE o.opportunity_code = ANY(%(opportunity_codes)s::varchar[])
                      AND {opportunity_expected_amount_value_expr()} IS NOT NULL
                    ORDER BY {opportunity_expected_amount_value_expr()} DESC, o.id
                    """,
                    {"opportunity_codes": opportunity_codes},
                )
            elif metric_key == "contract_amount":
                contract_amount_expr = _first_existing_column_expr(
                    table_name="contract",
                    table_alias="ct",
                    candidates=("contract_amount", "total_amount"),
                    cast_type="numeric",
                )
                cur.execute(
                    f"""
                    SELECT
                        CONCAT('CTR-', ct.id)::text AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        {customer_name_expr},
                        {opportunity_status_expr},
                        {contract_amount_expr} AS contract_amount,
                        {order_report_revenue_category_value_expr()} AS revenue_category,
                        {order_report_payment_terms_value_expr()} AS payment_terms,
                        {order_report_business_scope_value_expr()} AS business_scope,
                        {order_report_special_notes_value_expr()} AS special_notes
                    FROM {_CT} ct
                    JOIN {_WR} w ON w.id = ct.order_report_id
                    JOIN {_OPP} o ON o.id = w.project_opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    WHERE o.opportunity_code = ANY(%(opportunity_codes)s::varchar[])
                      AND {contract_amount_expr} IS NOT NULL
                      AND ct.deleted = false
                    ORDER BY {contract_amount_expr} DESC, ct.id
                    """,
                    {"opportunity_codes": opportunity_codes},
                )
            else:
                return []
            rows = list(cur.fetchall())
    for row in rows:
        row["metric_value"] = row.get(metric_column)
    return rows


def fetch_status_rows(
    *,
    status_filters: list[str],
    filters: dict[str, list[str]] | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    filters = filters or {}
    filter_sql = build_opportunity_filter_sql(filters)
    customer_name_expr = company_name_select_expr()
    opportunity_status_expr = opportunity_status_select_expr()
    opportunity_expected_amount_expr = opportunity_expected_amount_select_expr()
    opportunity_business_type_expr = opportunity_business_type_select_expr()
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    {customer_name_expr},
                    {opportunity_status_expr},
                    {opportunity_expected_amount_expr},
                    {opportunity_business_type_expr}
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                WHERE (%(status_filters)s::varchar[] IS NULL OR {opportunity_status_value_expr()} = ANY(%(status_filters)s::varchar[]))
                  {filter_sql}
                ORDER BY {opportunity_expected_amount_value_expr()} DESC NULLS LAST, o.id
                LIMIT %(limit)s
                """,
                build_query_params(status_filters=status_filters or None, filters=filters, limit=limit),
            )
            return list(cur.fetchall())


def fetch_difficult_win_candidates(
    *,
    status_filters: list[str],
    filters: dict[str, list[str]] | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    filters = filters or {}
    filter_sql = build_opportunity_filter_sql(filters)
    customer_name_expr = company_name_select_expr()
    opportunity_status_expr = opportunity_status_select_expr()
    competition_status_expr = opportunity_competition_status_select_expr()
    competitors_expr = opportunity_competitors_select_expr()
    issue_content_expr = optional_column_expr(
        table_name="project_opportunity",
        table_alias="o",
        output_name="issue_content",
        candidates=("issue_content",),
    )
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    {customer_name_expr},
                    {opportunity_status_expr},
                    {issue_content_expr},
                    {competition_status_expr},
                    {competitors_expr},
                    p.prb_code AS reference_code,
                    p.expected_win_rate,
                    p.estimated_profit,
                    p.estimated_profit_rate,
                    p.risk_factors,
                    pr.prb_result_code,
                    pr.risk_review,
                    pr.final_opinion,
                    b.bid_result_code,
                    b.competitor_summary,
                    b.win_loss_reason,
                    r.rfp_analysis_code,
                    r.risk_factors AS rfp_risk_factors,
                    r.security_requirements
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                JOIN {_PRB} p ON p.opportunity_id = o.id
                LEFT JOIN {_PRBR} pr ON pr.prb_id = p.id
                LEFT JOIN {_BID} b ON b.opportunity_id = o.id
                LEFT JOIN {_RFP} r ON r.opportunity_id = o.id
                WHERE {opportunity_status_value_expr()} = ANY(%(status_filters)s::varchar[])
                  {filter_sql}
                ORDER BY p.expected_win_rate ASC NULLS LAST, p.id
                LIMIT %(limit)s
                """,
                build_query_params(status_filters=status_filters or ["수주"], filters=filters, limit=limit),
            )
            return list(cur.fetchall())


def resolve_primary_opportunity(
    *,
    query_terms: list[str],
    exact_codes: list[str] | None = None,
) -> dict[str, Any] | None:
    exact_codes = [code.strip().upper() for code in (exact_codes or []) if code.strip()]
    terms = normalize_resolution_terms(query_terms)
    company_name_expr = company_name_value_expr()
    customer_name_select_expr = f"{company_name_expr} AS customer_name"
    opportunity_status_expr = opportunity_status_select_expr()
    opportunity_business_type_expr = opportunity_business_type_select_expr()
    opportunity_expected_amount_expr = opportunity_expected_amount_select_expr()
    maintenance_fk_expr = project_opportunity_fk_value_expr(table_name="maintenance", table_alias="mc")
    order_report_fk_expr = project_opportunity_fk_value_expr(table_name="order_report", table_alias="wr")
    contract_fk_expr = order_report_fk_value_expr(table_name="contract", table_alias="ct")
    project_fk_expr = order_report_fk_value_expr(table_name="project", table_alias="p")
    maintenance_code_expr = _first_existing_column_expr(
        table_name="maintenance",
        table_alias="mc",
        candidates=("maintenance_code",),
    )
    order_report_code_expr = _first_existing_column_expr(
        table_name="order_report",
        table_alias="wr",
        candidates=("won_report_code", "order_report_code"),
    )
    contract_code_expr = _first_existing_column_expr(
        table_name="contract",
        table_alias="ct",
        candidates=("contract_code",),
    )
    project_code_expr = _first_existing_column_expr(
        table_name="project",
        table_alias="p",
        candidates=("project_code", "code", "pjt_number"),
    )
    try:
        with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                if exact_codes:
                    cur.execute(
                        f"""
                        SELECT
                            o.id,
                            o.opportunity_code,
                            o.opportunity_name,
                            {customer_name_select_expr},
                            {opportunity_status_expr},
                            {opportunity_business_type_expr},
                            {opportunity_expected_amount_expr}
                        FROM {_OPP} o
                        JOIN {_CO} c ON c.id = o.customer_company_id
                        LEFT JOIN {_MC} mc ON {maintenance_fk_expr} = o.id
                        LEFT JOIN {_WR} wr ON {order_report_fk_expr} = o.id
                        LEFT JOIN {_CT} ct ON {contract_fk_expr} = wr.id
                        LEFT JOIN {_PROJ} p ON {project_fk_expr} = wr.id
                        WHERE upper(o.opportunity_code) = ANY(%(exact_codes)s::varchar[])
                           OR upper(COALESCE({maintenance_code_expr}, '')) = ANY(%(exact_codes)s::varchar[])
                           OR upper(COALESCE({order_report_code_expr}, '')) = ANY(%(exact_codes)s::varchar[])
                           OR upper(COALESCE({contract_code_expr}, '')) = ANY(%(exact_codes)s::varchar[])
                           OR upper(COALESCE({project_code_expr}, '')) = ANY(%(exact_codes)s::varchar[])
                        ORDER BY {opportunity_expected_amount_value_expr()} DESC NULLS LAST, o.id
                        LIMIT 2
                        """,
                        {"exact_codes": exact_codes},
                    )
                    exact_rows = list(cur.fetchall())
                    if len(exact_rows) == 1:
                        return exact_rows[0]

                if not terms:
                    return None

                cur.execute(
                    f"""
                    WITH terms AS (
                        SELECT DISTINCT trim(term) AS term
                        FROM unnest(%(terms)s::varchar[]) AS raw(term)
                        WHERE char_length(trim(term)) >= 2
                    ),
                    matched AS (
                        SELECT
                            o.id,
                            o.opportunity_code,
                            o.opportunity_name,
                            {customer_name_select_expr},
                            {opportunity_status_expr},
                            {opportunity_business_type_expr},
                            {opportunity_expected_amount_expr},
                            COUNT(*) AS term_hits,
                            SUM(
                                CASE
                                    WHEN upper(o.opportunity_name) = upper(t.term) THEN 12
                                    WHEN upper(o.opportunity_name) LIKE '%%' || upper(t.term) || '%%' THEN 7
                                    ELSE 0
                                END
                                + CASE
                                    WHEN upper({company_name_expr}) = upper(t.term) THEN 10
                                    WHEN upper({company_name_expr}) LIKE '%%' || upper(t.term) || '%%' THEN 5
                                    ELSE 0
                                END
                            ) AS match_score
                        FROM {_OPP} o
                        JOIN {_CO} c ON c.id = o.customer_company_id
                        JOIN terms t
                          ON upper(o.opportunity_name) LIKE '%%' || upper(t.term) || '%%'
                          OR upper({company_name_expr}) LIKE '%%' || upper(t.term) || '%%'
                        GROUP BY o.id, o.opportunity_code, o.opportunity_name, {company_name_expr}, {opportunity_status_value_expr()}, {opportunity_business_type_value_expr()}, {opportunity_expected_amount_value_expr()}
                        ORDER BY term_hits DESC, match_score DESC, {opportunity_expected_amount_value_expr()} DESC NULLS LAST, o.id
                        LIMIT 3
                    )
                    SELECT * FROM matched
                    """,
                    {"terms": terms},
                )
                rows = list(cur.fetchall())
    except psycopg.Error:
        return None

    if not rows:
        return None
    if len(rows) == 1:
        return rows[0]

    best = rows[0]
    second = rows[1]
    if int(best["term_hits"]) > int(second["term_hits"]):
        return best
    if int(best["match_score"]) >= int(second["match_score"]) + 4:
        return best
    return None


def fetch_opportunity_resolution_candidates(*, limit: int = 600) -> list[dict[str, Any]]:
    customer_name_expr = company_name_select_expr()
    opportunity_status_expr = opportunity_status_select_expr()
    opportunity_business_type_expr = opportunity_business_type_select_expr()
    opportunity_expected_amount_expr = opportunity_expected_amount_select_expr()
    bid_date_expr = opportunity_bid_date_select_expr()
    contract_date_expr = opportunity_contract_date_select_expr()
    contact_line_expr = optional_column_expr(
        table_name="project_opportunity",
        table_alias="o",
        output_name="contact_line",
        candidates=("contact_line",),
    )
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.id,
                    o.opportunity_code,
                    o.opportunity_name,
                    {customer_name_expr},
                    {opportunity_status_expr},
                    {opportunity_business_type_expr},
                    {opportunity_expected_amount_expr},
                    {bid_date_expr},
                    {contract_date_expr},
                    {contact_line_expr}
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                ORDER BY o.id DESC
                LIMIT %(limit)s
                """,
                {"limit": limit},
            )
            return list(cur.fetchall())


def fetch_session_attachment_rows(*, session_id: str, limit: int = 3) -> list[dict[str, Any]]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    s.source_id,
                    s.title,
                    c.content,
                    c.chunk_index,
                    c.metadata AS chunk_metadata
                FROM ai.ai_knowledge_chunks c
                JOIN ai.ai_knowledge_sources s ON s.id = c.source_pk
                WHERE s.source_type = 'ATTACHMENT'
                  AND s.metadata->>'origin' = 'chat_session'
                  AND s.metadata->>'sessionId' = %(session_id)s
                ORDER BY c.chunk_index ASC
                LIMIT %(limit)s
                """,
                {
                    "session_id": session_id,
                    "limit": limit,
                },
            )
            return list(cur.fetchall())


def fetch_opportunity_snapshot(*, opportunity_code: str) -> dict[str, Any] | None:
    customer_name_expr = company_name_select_expr()
    customer_group_expr = customer_group_select_expr()
    customer_type_expr = customer_type_select_expr()
    opportunity_status_expr = opportunity_status_select_expr()
    opportunity_business_type_expr = opportunity_business_type_select_expr()
    opportunity_expected_amount_expr = opportunity_expected_amount_select_expr()
    main_content_expr = opportunity_main_content_select_expr()
    issue_content_expr = optional_column_expr(
        table_name="project_opportunity",
        table_alias="o",
        output_name="issue_content",
        candidates=("issue_content",),
    )
    competition_status_expr = opportunity_competition_status_select_expr()
    decision_structure_expr = optional_column_expr(
        table_name="project_opportunity",
        table_alias="o",
        output_name="decision_structure",
        candidates=("decision_structure",),
    )
    contact_line_expr = optional_column_expr(
        table_name="project_opportunity",
        table_alias="o",
        output_name="contact_line",
        candidates=("contact_line",),
    )
    prb_fk_expr = project_opportunity_fk_value_expr(table_name="prb", table_alias="p")
    rfp_fk_expr = project_opportunity_fk_value_expr(table_name="rfp_analyze_result", table_alias="r")
    order_report_fk_expr = project_opportunity_fk_value_expr(table_name="order_report", table_alias="wr")
    contract_fk_expr = order_report_fk_value_expr(table_name="contract", table_alias="ct")
    project_fk_expr = order_report_fk_value_expr(table_name="project", table_alias="p")
    rfp_analysis_code_expr = _first_existing_column_expr(
        table_name="rfp_analyze_result",
        table_alias="r",
        candidates=("rfp_analysis_code", "rfp_code"),
    )
    rfp_sort_date_expr = _first_existing_column_expr(
        table_name="rfp_analyze_result",
        table_alias="r",
        candidates=("received_date", "proposal_deadline"),
        cast_type="timestamp",
    )
    order_report_code_expr = _first_existing_column_expr(
        table_name="order_report",
        table_alias="wr",
        candidates=("won_report_code", "order_report_code"),
    )
    contract_code_expr = _first_existing_column_expr(
        table_name="contract",
        table_alias="ct",
        candidates=("contract_code",),
    )
    project_code_expr = _first_existing_column_expr(
        table_name="project",
        table_alias="p",
        candidates=("project_code", "code", "pjt_number"),
    )
    maintenance_code_expr = _first_existing_column_expr(
        table_name="maintenance",
        table_alias="mc",
        candidates=("maintenance_code",),
    )
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    {customer_name_expr},
                    {customer_group_expr},
                    {customer_type_expr},
                    {opportunity_status_expr},
                    {opportunity_business_type_expr},
                    {opportunity_expected_amount_expr},
                    {main_content_expr},
                    {issue_content_expr},
                    {competition_status_expr},
                    {decision_structure_expr},
                    {contact_line_expr},
                    (
                        SELECT p.prb_code
                        FROM {_PRB} p
                        WHERE {prb_fk_expr} = o.id
                        ORDER BY p.prb_date DESC NULLS LAST, p.id DESC
                        LIMIT 1
                    ) AS prb_code,
                    (
                        SELECT COALESCE(NULLIF({rfp_analysis_code_expr}, ''), 'RFP-ANALYSIS-' || r.id::text)
                        FROM {_RFP} r
                        WHERE {rfp_fk_expr} = o.id
                        ORDER BY COALESCE({rfp_sort_date_expr}, r.created_at) DESC NULLS LAST, r.id DESC
                        LIMIT 1
                    ) AS rfp_analysis_code,
                    (
                        SELECT COALESCE(NULLIF({order_report_code_expr}, ''), 'ORDER-REPORT-' || wr.id::text)
                        FROM {_WR} wr
                        WHERE {order_report_fk_expr} = o.id
                        ORDER BY wr.contract_date DESC NULLS LAST, wr.id DESC
                        LIMIT 1
                    ) AS won_report_code,
                    (
                        SELECT COALESCE(NULLIF({contract_code_expr}, ''), 'CONTRACT-' || ct.id::text)
                        FROM {_CT} ct
                        JOIN {_WR} wr ON wr.id = {contract_fk_expr}
                        WHERE {order_report_fk_expr} = o.id
                        ORDER BY ct.id DESC
                        LIMIT 1
                    ) AS contract_code,
                    (
                        SELECT COALESCE(NULLIF({project_code_expr}, ''), 'PROJECT-' || p.id::text)
                        FROM {_PROJ} p
                        JOIN {_WR} wr ON wr.id = {project_fk_expr}
                        WHERE {order_report_fk_expr} = o.id
                        ORDER BY p.id DESC
                        LIMIT 1
                    ) AS project_code,
                    (
                        SELECT COALESCE(NULLIF({maintenance_code_expr}, ''), 'MAINT-' || mc.id::text)
                        FROM {_MC} mc
                        JOIN {_PROJ} p ON p.id = mc.project_id
                        JOIN {_WR} wr ON wr.id = {project_fk_expr}
                        WHERE {order_report_fk_expr} = o.id
                        ORDER BY mc.start_date DESC NULLS LAST, mc.id DESC
                        LIMIT 1
                    ) AS maintenance_code
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                WHERE o.opportunity_code = %(opportunity_code)s
                """,
                {"opportunity_code": opportunity_code},
            )
            return cur.fetchone()


def fetch_prb_snapshot(*, opportunity_code: str) -> dict[str, Any] | None:
    customer_name_expr = company_name_select_expr()
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    {customer_name_expr},
                    p.prb_code,
                    p.prb_date,
                    p.bid_type,
                    p.expected_win_rate,
                    p.estimated_revenue,
                    p.estimated_operating_profit       AS estimated_profit,
                    p.estimated_profit_margin          AS estimated_profit_rate,
                    p.sales_representative_opinion     AS sales_opinion,
                    pr.comprehensive_opinion           AS risk_factors,
                    pr.risk_factors                    AS prb_result_risk_factors,
                    pr.prb_result_id::text             AS prb_result_code,
                    pr.meeting_date_time::date         AS result_date,
                    pr.comprehensive_opinion           AS risk_review,
                    pr.comprehensive_opinion           AS final_opinion,
                    pr.status                          AS decision_status,
                    b.id::text                         AS bid_result_code,
                    (b.bid_outcome = 'WIN')            AS won,
                    NULL::text                         AS competitor_summary,
                    NULL::text                         AS win_loss_reason
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                JOIN {_PRB} p ON p.project_opportunity_id = o.id
                LEFT JOIN {_PRBR} pr ON pr.prb_id = p.id
                LEFT JOIN {_BID} b ON b.project_opportunity_id = o.id
                WHERE o.opportunity_code = %(opportunity_code)s
                  AND COALESCE(p.deleted, false) = false
                ORDER BY p.prb_date DESC NULLS LAST, p.id DESC
                LIMIT 1
                """,
                {"opportunity_code": opportunity_code},
            )
            row = cur.fetchone()
            if row:
                # risk_factors 우선순위: prb_result.risk_factors → prb_result.comprehensive_opinion
                if row.get("prb_result_risk_factors"):
                    row["risk_factors"] = row["prb_result_risk_factors"]
            return row


def fetch_rfp_snapshot(*, opportunity_code: str) -> dict[str, Any] | None:
    customer_name_expr = company_name_value_expr()
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    {customer_name_expr} AS customer_name,
                    COALESCE(NULLIF(r.rfp_analysis_code, ''), NULLIF(r.rfp_code, ''), 'RFP-ANALYSIS-' || r.id::text) AS rfp_analysis_code,
                    r.announcement_no,
                    COALESCE(NULLIF(r.issuer, ''), {customer_name_expr}) AS issuer,
                    COALESCE(r.received_date, r.created_at::date) AS received_date,
                    COALESCE(r.submission_deadline, r.proposal_deadline) AS submission_deadline,
                    COALESCE(NULLIF(r.project_period, ''), r.expected_duration) AS project_period,
                    COALESCE(NULLIF(r.project_scope, ''), r.project_description) AS project_scope,
                    COALESCE(
                        NULLIF(r.requirements, ''),
                        legacy_req.requirement_summary,
                        current_req.requirement_summary
                    ) AS requirements,
                    r.security_requirements,
                    COALESCE(
                        NULLIF(r.risk_factors, ''),
                        legacy_req.review_summary,
                        current_req.review_summary
                    ) AS risk_factors,
                    r.special_notes,
                    COALESCE(NULLIF(r.evidence_summary, ''), r.project_description) AS evidence_summary,
                    COALESCE(
                        NULLIF(r.analysis_status, ''),
                        CASE r.status
                            WHEN 'RECEIVED' THEN '접수'
                            WHEN 'IN_PROGRESS' THEN '분석중'
                            WHEN 'COMPLETED' THEN '완료'
                            ELSE r.status::text
                        END
                    ) AS analysis_status,
                    COALESCE(legacy_req.requirement_rows, '[]'::jsonb)
                        || COALESCE(current_req.requirement_rows, '[]'::jsonb) AS requirement_rows,
                    CASE
                        WHEN r.received_date IS NOT NULL THEN 'RFP'
                        ELSE NULL
                    END AS rfp_origin
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                JOIN {_RFP} r ON COALESCE(r.opportunity_id, r.project_opportunity_id) = o.id
                LEFT JOIN LATERAL (
                    SELECT
                        jsonb_agg(
                            jsonb_build_object(
                                'category', rr.category,
                                'requirementCode', rr.requirement_code,
                                'requirementTitle', rr.requirement_title,
                                'requirementContent', rr.requirement_content,
                                'supportStatus', rr.support_status,
                                'reviewNote', rr.review_note,
                                'effort', rr.effort
                            )
                            ORDER BY rr.id
                        ) FILTER (WHERE rr.id IS NOT NULL) AS requirement_rows,
                        string_agg(
                            COALESCE(NULLIF(rr.requirement_title, ''), NULLIF(rr.category, '')),
                            ', ' ORDER BY rr.id
                        ) FILTER (WHERE COALESCE(NULLIF(rr.requirement_title, ''), NULLIF(rr.category, '')) IS NOT NULL) AS requirement_summary,
                        string_agg(NULLIF(rr.review_note, ''), ' / ' ORDER BY rr.id)
                            FILTER (WHERE NULLIF(rr.review_note, '') IS NOT NULL) AS review_summary
                    FROM public.rfp_analyze_requirement rr
                    WHERE rr.rfp_analyze_result_id = r.id
                ) legacy_req ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        jsonb_agg(
                            jsonb_build_object(
                                'category', rr.category,
                                'requirementCode', rr.requirement_code,
                                'requirementTitle', rr.name,
                                'requirementContent', rr.description,
                                'supportStatus',
                                    CASE rr.support_type
                                        WHEN 'PROVIDED' THEN 'O'
                                        WHEN 'PARTIAL_CUSTOMIZATION' THEN '∆'
                                        WHEN 'NOT_PROVIDED' THEN 'X'
                                        WHEN 'NEEDS_REVIEW' THEN '?'
                                        ELSE rr.support_type
                                    END,
                                'reviewNote', rr.review_comment,
                                'effort', rr.effort
                            )
                            ORDER BY rr.id
                        ) FILTER (WHERE rr.id IS NOT NULL) AS requirement_rows,
                        string_agg(
                            COALESCE(NULLIF(rr.name, ''), NULLIF(rr.category, '')),
                            ', ' ORDER BY rr.id
                        ) FILTER (WHERE COALESCE(NULLIF(rr.name, ''), NULLIF(rr.category, '')) IS NOT NULL) AS requirement_summary,
                        string_agg(NULLIF(rr.review_comment, ''), ' / ' ORDER BY rr.id)
                            FILTER (WHERE NULLIF(rr.review_comment, '') IS NOT NULL) AS review_summary
                    FROM public.rfp_requirement rr
                    WHERE rr.rfp_analyze_result_id = r.id
                      AND COALESCE(rr.deleted, false) = false
                ) current_req ON TRUE
                WHERE o.opportunity_code = %(opportunity_code)s
                ORDER BY COALESCE(r.received_date::timestamptz, r.proposal_deadline, r.created_at, r.updated_at) DESC NULLS LAST, r.id DESC
                LIMIT 1
                """,
                {"opportunity_code": opportunity_code},
            )
            return cur.fetchone()


def fetch_recent_document_rows(
    *,
    document_scope: str,
    recency_basis: str = "document_date",
    limit: int = 5,
) -> list[dict[str, Any]]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            if document_scope == "RFP":
                order_expr = (
                    "COALESCE(r.created_at, r.updated_at)"
                    if recency_basis == "uploaded"
                    else "COALESCE(r.received_date::timestamptz, r.created_at, r.updated_at)"
                )
                cur.execute(
                    f"""
                    SELECT
                        'RFP' AS source_type,
                        r.rfp_analysis_code AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        r.announcement_no,
                        r.issuer,
                        r.received_date,
                        r.submission_deadline,
                        r.project_scope,
                        r.requirements,
                        r.created_at,
                        r.updated_at,
                        {order_expr} AS metric_value
                    FROM {_RFP} r
                    JOIN {_OPP} o ON o.id = r.opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    ORDER BY metric_value DESC NULLS LAST, r.id DESC
                    LIMIT %(limit)s
                    """,
                    {"limit": limit},
                )
                return list(cur.fetchall())

            if document_scope == "RFP_ANALYSIS":
                order_expr = (
                    "COALESCE(r.created_at, r.updated_at)"
                    if recency_basis == "uploaded"
                    else "COALESCE(r.received_date::timestamptz, r.created_at, r.updated_at)"
                )
                cur.execute(
                    f"""
                    SELECT
                        'RFP_ANALYSIS' AS source_type,
                        r.rfp_analysis_code AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        r.received_date,
                        r.submission_deadline,
                        r.analysis_status,
                        r.project_scope,
                        r.requirements,
                        r.created_at,
                        r.updated_at,
                        {order_expr} AS metric_value
                    FROM {_RFP} r
                    JOIN {_OPP} o ON o.id = r.opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    ORDER BY metric_value DESC NULLS LAST, r.id DESC
                    LIMIT %(limit)s
                    """,
                    {"limit": limit},
                )
                return list(cur.fetchall())

            if document_scope == "WON":
                order_expr = (
                    "COALESCE(w.created_at, w.updated_at)"
                    if recency_basis == "uploaded"
                    else "COALESCE(w.contract_date::timestamptz, w.created_at, w.updated_at)"
                )
                cur.execute(
                    f"""
                    SELECT
                        'WON' AS source_type,
                        o.opportunity_code AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        w.won_report_code,
                        w.contract_date,
                        w.contract_amount,
                        w.business_scope,
                        w.created_at,
                        w.updated_at,
                        {order_expr} AS metric_value
                    FROM {_WR} w
                    JOIN {_OPP} o ON o.id = w.opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    ORDER BY metric_value DESC NULLS LAST, w.id DESC
                    LIMIT %(limit)s
                    """,
                    {"limit": limit},
                )
                return list(cur.fetchall())

            if document_scope == "LOST":
                order_expr = (
                    "COALESCE(b.updated_at, o.updated_at)"
                    if recency_basis == "uploaded"
                    else "COALESCE(o.bid_date::timestamptz, b.updated_at, o.updated_at)"
                )
                cur.execute(
                    f"""
                    SELECT
                        'LOST' AS source_type,
                        o.opportunity_code AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        b.bid_result_code,
                        o.bid_date,
                        o.current_status,
                        b.win_loss_reason,
                        b.competitor_summary,
                        COALESCE(b.created_at, o.created_at) AS created_at,
                        COALESCE(b.updated_at, o.updated_at) AS updated_at,
                        {order_expr} AS metric_value
                    FROM {_OPP} o
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    LEFT JOIN LATERAL (
                        SELECT
                            br.bid_result_code,
                            br.win_loss_reason,
                            br.competitor_summary,
                            br.created_at,
                            br.updated_at
                        FROM {_BID} br
                        WHERE br.opportunity_id = o.id
                          AND br.won IS FALSE
                        ORDER BY COALESCE(br.updated_at, br.created_at) DESC NULLS LAST, br.id DESC
                        LIMIT 1
                    ) b ON TRUE
                    WHERE o.current_status = '실주'
                       OR b.bid_result_code IS NOT NULL
                    ORDER BY metric_value DESC NULLS LAST, o.id DESC
                    LIMIT %(limit)s
                    """,
                    {"limit": limit},
                )
                return list(cur.fetchall())

            if document_scope == "ORDER_REPORT":
                order_expr = (
                    "COALESCE(w.created_at, w.updated_at)"
                    if recency_basis == "uploaded"
                    else "COALESCE(w.contract_date::timestamptz, w.created_at, w.updated_at)"
                )
                cur.execute(
                    f"""
                    SELECT
                        'ORDER_REPORT' AS source_type,
                        w.won_report_code AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        w.contract_date,
                        w.contract_amount,
                        w.approval_status,
                        w.business_scope,
                        w.created_at,
                        w.updated_at,
                        {order_expr} AS metric_value
                    FROM {_WR} w
                    JOIN {_OPP} o ON o.id = w.opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    ORDER BY metric_value DESC NULLS LAST, w.id DESC
                    LIMIT %(limit)s
                    """,
                    {"limit": limit},
                )
                return list(cur.fetchall())

            if document_scope == "PRB":
                order_expr = (
                    "COALESCE(p.created_at, p.updated_at)"
                    if recency_basis == "uploaded"
                    else "COALESCE(p.prb_date::timestamptz, p.created_at, p.updated_at)"
                )
                cur.execute(
                    f"""
                    SELECT
                        'PRB' AS source_type,
                        p.prb_code AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        p.prb_date,
                        p.sales_owner,
                        p.department_owner,
                        p.expected_win_rate,
                        p.created_at,
                        p.updated_at,
                        {order_expr} AS metric_value
                    FROM {_PRB} p
                    JOIN {_OPP} o ON o.id = p.opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    ORDER BY metric_value DESC NULLS LAST, p.id DESC
                    LIMIT %(limit)s
                    """,
                    {"limit": limit},
                )
                return list(cur.fetchall())

            if document_scope == "PRB_RESULT":
                order_expr = (
                    "COALESCE(pr.created_at, pr.updated_at)"
                    if recency_basis == "uploaded"
                    else "COALESCE(pr.result_date::timestamptz, pr.created_at, pr.updated_at)"
                )
                cur.execute(
                    f"""
                    SELECT
                        'PRB_RESULT' AS source_type,
                        pr.prb_result_code AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        pr.result_date,
                        pr.decision_status,
                        pr.final_opinion,
                        pr.created_at,
                        pr.updated_at,
                        {order_expr} AS metric_value
                    FROM {_PRBR} pr
                    JOIN {_PRB} p ON p.id = pr.prb_id
                    JOIN {_OPP} o ON o.id = p.opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    ORDER BY metric_value DESC NULLS LAST, pr.id DESC
                    LIMIT %(limit)s
                    """,
                    {"limit": limit},
                )
                return list(cur.fetchall())

    return []


def fetch_maintenance_history(
    *,
    opportunity_code: str,
    start_at: str | None = None,
    end_at: str | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    mc.maintenance_code,
                    ('CS-' || cs.id::text) AS support_code,
                    u1.name AS primary_owner,
                    u2.name AS secondary_owner,
                    cs.activity_type,
                    cs.activity_start_time AS activity_date,
                    EXTRACT(EPOCH FROM (COALESCE(cs.activity_end_time, cs.activity_start_time) - cs.activity_start_time)) / 3600.0 AS activity_hours,
                    cs.activity_content,
                    cs.remarks AS performance
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                JOIN {_MC} mc ON mc.opportunity_id = o.id
                JOIN {_CS} cs ON cs.maintenance_id = mc.id
                LEFT JOIN users u1 ON u1.id = cs.primary_manager_id
                LEFT JOIN users u2 ON u2.id = cs.secondary_manager_id
                WHERE o.opportunity_code = %(opportunity_code)s
                  AND (%(start_at)s::timestamptz IS NULL OR cs.activity_start_time::timestamptz >= %(start_at)s::timestamptz)
                  AND (%(end_at)s::timestamptz IS NULL OR cs.activity_start_time::timestamptz <= %(end_at)s::timestamptz)
                ORDER BY cs.activity_start_time ASC, cs.id ASC
                LIMIT %(limit)s
                """,
                {
                    "opportunity_code": opportunity_code,
                    "start_at": start_at,
                    "end_at": end_at,
                    "limit": limit,
                },
            )
            return list(cur.fetchall())


def fetch_sales_activity_timeline(
    *,
    opportunity_code: str,
    limit: int = 10,
) -> list[dict[str, Any]]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    a.activity_type,
                    a.activity_purpose,
                    a.activity_date_time AS activity_at,
                    NULL::text AS activity_channel,
                    a.location AS place,
                    a.activity_content AS content,
                    a.customer_interest,
                    a.issue,
                    a.next_activity AS next_action,
                    a.status AS progress_status
                FROM {_ACT} a
                JOIN {_OPP} o ON o.id = COALESCE(a.project_opportunity_id, a.opportunity_id)
                JOIN {_CO} c ON c.id = o.customer_company_id
                WHERE o.opportunity_code = %(opportunity_code)s
                ORDER BY a.activity_date_time DESC NULLS LAST, a.id DESC
                LIMIT %(limit)s
                """,
                {
                    "opportunity_code": opportunity_code,
                    "limit": limit,
                },
            )
            return list(cur.fetchall())


def fetch_maintenance_quote_snapshot(*, opportunity_code: str) -> dict[str, Any] | None:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    mc.maintenance_code,
                    mq.ref_no AS maintenance_quote_code,
                    mq.quotation_date AS quote_date,
                    mq.total_amount,
                    mq.start_date AS maintenance_start_date,
                    mq.end_date AS maintenance_end_date,
                    mq.monthly_supply_price AS monthly_supply_amount,
                    COALESCE(mq.total_quotation_amount, mq.total_amount) AS quote_amount_total,
                    mq.special_notes,
                    json_agg(
                        json_build_object(
                            'product_name', pm.product_name,
                            'service_category', mqi.category,
                            'service_item', mqi.item,
                            'service_content', mqi.content,
                            'module_name', pm.product_name,
                            'maintenance_amount', mar.amount,
                            'months', mar.months,
                            'note', mar.remarks
                        )
                        ORDER BY mqi.id
                    ) AS items
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                JOIN {_MC} mc ON mc.opportunity_id = o.id
                JOIN {_MQ} mq ON mq.project_id = mc.project_id
                LEFT JOIN {_MQI} mqi ON mqi.quotation_id = mq.id
                LEFT JOIN product_module pm ON pm.id = mqi.product_module_id
                LEFT JOIN maintenance_amount_reason mar
                  ON mar.quotation_id = mq.id
                 AND mar.product_module_id = mqi.product_module_id
                WHERE o.opportunity_code = %(opportunity_code)s
                GROUP BY
                    o.opportunity_code, o.opportunity_name, c.name,
                    mc.maintenance_code, mq.ref_no, mq.quotation_date,
                    mq.total_amount, mq.start_date, mq.end_date,
                    mq.monthly_supply_price, mq.total_quotation_amount, mq.special_notes
                ORDER BY mq.quotation_date DESC NULLS LAST, mq.ref_no DESC
                LIMIT 1
                """,
                {"opportunity_code": opportunity_code},
            )
            return cur.fetchone()


def fetch_opportunity_delivery_snapshot(*, opportunity_code: str) -> dict[str, Any] | None:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    o.current_status,
                    wr.won_report_code,
                    wr.contract_date,
                    wr.contract_amount,
                    wr.payment_terms,
                    wr.business_scope,
                    wr.special_notes,
                    ct.contract_code,
                    ct.contract_status,
                    ct.start_date AS contract_start_date,
                    ct.end_date AS contract_end_date,
                    ct.memo AS contract_memo,
                    COALESCE(p.project_code, p.pjt_number, p.code) AS project_code,
                    COALESCE(p.project_status, p.type::text) AS project_status,
                    p.project_owner,
                    p.team_name,
                    p.project_overview,
                    ('PRR-' || pr.id::text) AS project_report_code,
                    CASE WHEN pr.result_report_file_id IS NOT NULL THEN 'UPLOADED' ELSE NULL END AS project_result_status,
                    m.maintenance_code,
                    m.type AS maintenance_type,
                    m.rate AS maintenance_rate,
                    m.contract_amount AS maintenance_contract_amount,
                    m.start_date AS maintenance_start_date,
                    m.end_date AS maintenance_end_date,
                    m.remarks AS maintenance_remarks,
                    ('CS-' || cs.id::text) AS support_code,
                    cs.activity_type AS support_activity_type,
                    cs.activity_start_time AS support_started_at,
                    cs.activity_end_time AS support_ended_at,
                    cs.activity_content AS support_content,
                    cs.remarks AS support_result
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN LATERAL (
                    SELECT *
                    FROM {_WR} wr
                    WHERE wr.opportunity_id = o.id
                    ORDER BY wr.contract_date DESC NULLS LAST, wr.id DESC
                    LIMIT 1
                ) wr ON TRUE
                LEFT JOIN LATERAL (
                    SELECT *
                    FROM {_CT} ct
                    WHERE ct.order_report_id = wr.id OR ct.won_report_id = wr.id
                    ORDER BY ct.contract_date DESC NULLS LAST, ct.id DESC
                    LIMIT 1
                ) ct ON TRUE
                LEFT JOIN LATERAL (
                    SELECT *
                    FROM {_PROJ} p
                    WHERE p.order_report_id = wr.id OR p.won_report_id = wr.id
                    ORDER BY p.end_date DESC NULLS LAST, p.id DESC
                    LIMIT 1
                ) p ON TRUE
                LEFT JOIN LATERAL (
                    SELECT *
                    FROM {_PR} pr
                    WHERE pr.project_id = p.id
                    ORDER BY pr.updated_at DESC NULLS LAST, pr.id DESC
                    LIMIT 1
                ) pr ON TRUE
                LEFT JOIN LATERAL (
                    SELECT *
                    FROM {_MC} m
                    WHERE m.opportunity_id = o.id
                    ORDER BY m.start_date DESC NULLS LAST, m.id DESC
                    LIMIT 1
                ) m ON TRUE
                LEFT JOIN LATERAL (
                    SELECT *
                    FROM {_CS} cs
                    WHERE cs.maintenance_id = m.id
                    ORDER BY cs.activity_start_time DESC NULLS LAST, cs.id DESC
                    LIMIT 1
                ) cs ON TRUE
                WHERE o.opportunity_code = %(opportunity_code)s
                LIMIT 1
                """,
                {"opportunity_code": opportunity_code},
            )
            return cur.fetchone()


def fetch_bid_result_snapshot(*, opportunity_code: str) -> dict[str, Any] | None:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    o.current_status,
                    b.bid_result_code,
                    b.won,
                    b.competitor_summary,
                    b.win_loss_reason,
                    p.prb_code,
                    p.expected_win_rate,
                    p.risk_factors,
                    pr.prb_result_code,
                    pr.final_opinion,
                    pr.risk_review
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN {_BID} b ON b.opportunity_id = o.id
                LEFT JOIN {_PRB} p ON p.opportunity_id = o.id
                LEFT JOIN {_PRBR} pr ON pr.prb_id = p.id
                WHERE o.opportunity_code = %(opportunity_code)s
                ORDER BY b.id DESC NULLS LAST, p.prb_date DESC NULLS LAST, p.id DESC
                LIMIT 1
                """,
                {"opportunity_code": opportunity_code},
            )
            return cur.fetchone()


def fetch_quotation_snapshot(*, quotation_code: str) -> dict[str, Any] | None:
    document_series_expr = optional_column_expr(
        table_name=_QT,
        table_alias="q",
        output_name="document_series_code",
        candidates=("document_series_code", "quotation_root_code", "quote_root_code", "root_document_code"),
    )
    document_version_expr = optional_column_expr(
        table_name=_QT,
        table_alias="q",
        output_name="document_version",
        candidates=("document_version", "quotation_version", "quote_version", "version_no", "revision_no", "revision"),
    )
    latest_version_expr = optional_column_expr(
        table_name=_QT,
        table_alias="q",
        output_name="is_latest_version",
        candidates=("is_latest_version", "latest_version", "is_current_version"),
        cast_type="boolean",
    )
    previous_version_expr = optional_column_expr(
        table_name=_QT,
        table_alias="q",
        output_name="previous_version_id",
        candidates=("previous_version_id", "prev_version_id"),
    )

    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    q.quotation_code,
                    q.quotation_date,
                    q.payment_condition,
                    q.consumer_total_price,
                    q.supply_total_price,
                    q.labor_total_price,
                    q.total_price,
                    q.note,
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    {document_series_expr},
                    {document_version_expr},
                    {latest_version_expr},
                    {previous_version_expr},
                    COALESCE(si.items, '[]'::json) AS solution_items,
                    COALESCE(li.items, '[]'::json) AS labor_items
                FROM {_QT} q
                LEFT JOIN {_OPP} o ON o.id = q.project_opportunity_id
                LEFT JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN LATERAL (
                    SELECT json_agg(
                        json_build_object(
                            'module_id', pm.id,
                            'product_class', pm.product_class,
                            'product_group', pm.product_group,
                            'product_name', pm.product_name,
                            'quantity', qi.quantity,
                            'consumer_price', qi.consumer_price,
                            'supply_price', qi.supply_price,
                            'consumer_total_price', qi.consumer_total_price,
                            'supply_total_price', qi.supply_total_price,
                            'free_supply', qi.free_supply
                        )
                        ORDER BY qi.id
                    ) AS items
                    FROM {_QI} qi
                    LEFT JOIN public.product_module pm ON pm.id = qi.product_module_id
                    WHERE qi.quotation_id = q.id
                      AND qi.deleted = false
                ) si ON TRUE
                LEFT JOIN LATERAL (
                    SELECT json_agg(
                        json_build_object(
                            'labor_type', ql.labor_type,
                            'unit_price', ql.unit_price,
                            'man_month', ql.man_month,
                            'supply_price', ql.supply_price
                        )
                        ORDER BY ql.id
                    ) AS items
                    FROM {_QL} ql
                    WHERE ql.quotation_id = q.id
                      AND ql.deleted = false
                ) li ON TRUE
                WHERE upper(q.quotation_code) = %(quotation_code)s
                  AND q.deleted = false
                LIMIT 1
                """,
                {"quotation_code": quotation_code.upper()},
            )
            return cur.fetchone()


def fetch_quotation_snapshot_by_opportunity(*, opportunity_code: str) -> dict[str, Any] | None:
    document_series_expr = optional_column_expr(
        table_name=_QT,
        table_alias="q",
        output_name="document_series_code",
        candidates=("document_series_code", "quotation_root_code", "quote_root_code", "root_document_code"),
    )
    document_version_expr = optional_column_expr(
        table_name=_QT,
        table_alias="q",
        output_name="document_version",
        candidates=("document_version", "quotation_version", "quote_version", "version_no", "revision_no", "revision"),
    )
    latest_version_expr = optional_column_expr(
        table_name=_QT,
        table_alias="q",
        output_name="is_latest_version",
        candidates=("is_latest_version", "latest_version", "is_current_version"),
        cast_type="boolean",
    )
    previous_version_expr = optional_column_expr(
        table_name=_QT,
        table_alias="q",
        output_name="previous_version_id",
        candidates=("previous_version_id", "prev_version_id"),
    )

    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    q.quotation_code,
                    q.quotation_date,
                    q.payment_condition,
                    q.consumer_total_price,
                    q.supply_total_price,
                    q.labor_total_price,
                    q.total_price,
                    q.note,
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    {document_series_expr},
                    {document_version_expr},
                    {latest_version_expr},
                    {previous_version_expr},
                    COALESCE(si.items, '[]'::json) AS solution_items,
                    COALESCE(li.items, '[]'::json) AS labor_items
                FROM {_QT} q
                JOIN {_OPP} o ON o.id = q.project_opportunity_id
                LEFT JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN LATERAL (
                    SELECT json_agg(
                        json_build_object(
                            'module_id', pm.id,
                            'product_class', pm.product_class,
                            'product_group', pm.product_group,
                            'product_name', pm.product_name,
                            'quantity', qi.quantity,
                            'consumer_price', qi.consumer_price,
                            'supply_price', qi.supply_price,
                            'consumer_total_price', qi.consumer_total_price,
                            'supply_total_price', qi.supply_total_price,
                            'free_supply', qi.free_supply
                        )
                        ORDER BY qi.id
                    ) AS items
                    FROM {_QI} qi
                    LEFT JOIN public.product_module pm ON pm.id = qi.product_module_id
                    WHERE qi.quotation_id = q.id
                      AND qi.deleted = false
                ) si ON TRUE
                LEFT JOIN LATERAL (
                    SELECT json_agg(
                        json_build_object(
                            'labor_type', ql.labor_type,
                            'unit_price', ql.unit_price,
                            'man_month', ql.man_month,
                            'supply_price', ql.supply_price
                        )
                        ORDER BY ql.id
                    ) AS items
                    FROM {_QL} ql
                    WHERE ql.quotation_id = q.id
                      AND ql.deleted = false
                ) li ON TRUE
                WHERE upper(o.opportunity_code) = %(opportunity_code)s
                  AND q.deleted = false
                ORDER BY q.quotation_date DESC NULLS LAST, q.id DESC
                LIMIT 1
                """,
                {"opportunity_code": opportunity_code.upper()},
            )
            return cur.fetchone()


def fetch_project_result_highlight(*, limit: int = 1) -> list[dict[str, Any]]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    COALESCE(p.project_code, p.pjt_number, p.code) AS project_code,
                    COALESCE(p.project_status, p.type::text) AS project_status,
                    ('PRR-' || pr.id::text) AS project_report_code,
                    pr.updated_at::date AS report_date,
                    CASE WHEN pr.result_report_file_id IS NOT NULL THEN 'UPLOADED' ELSE 'REGISTERED' END AS result_status,
                    COALESCE(pr.content, p.project_overview) AS detail_content
                FROM {_PR} pr
                JOIN {_PROJ} p ON p.id = pr.project_id
                JOIN {_WR} wr ON wr.id = COALESCE(p.won_report_id, p.order_report_id)
                JOIN {_OPP} o ON o.id = wr.opportunity_id
                JOIN {_CO} c ON c.id = o.customer_company_id
                WHERE p.deleted = false
                  AND pr.deleted = false
                ORDER BY pr.updated_at DESC NULLS LAST, pr.id DESC
                LIMIT %(limit)s
                """,
                {"limit": limit},
            )
            return list(cur.fetchall())


def fetch_project_result_highlight_in_range(
    *,
    start_at: str | None,
    end_at: str | None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    try:
        with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        COALESCE(p.project_code, p.pjt_number, p.code) AS project_code,
                        COALESCE(p.project_status, p.type::text) AS project_status,
                        ('PRR-' || pr.id::text) AS project_report_code,
                        pr.updated_at::date AS report_date,
                        CASE WHEN pr.result_report_file_id IS NOT NULL THEN 'UPLOADED' ELSE 'REGISTERED' END AS result_status,
                        COALESCE(pr.content, p.project_overview) AS detail_content
                    FROM {_PR} pr
                    JOIN {_PROJ} p ON p.id = pr.project_id
                    JOIN {_WR} wr ON wr.id = COALESCE(p.won_report_id, p.order_report_id)
                    JOIN {_OPP} o ON o.id = wr.opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    WHERE (%(start_at)s::timestamptz IS NULL OR pr.updated_at >= %(start_at)s::timestamptz)
                      AND (%(end_at)s::timestamptz IS NULL OR pr.updated_at <= %(end_at)s::timestamptz)
                      AND p.deleted = false
                      AND pr.deleted = false
                    ORDER BY pr.updated_at DESC NULLS LAST, pr.id DESC
                    LIMIT %(limit)s
                    """,
                    {"start_at": start_at, "end_at": end_at, "limit": limit},
                )
                return list(cur.fetchall())
    except psycopg.Error as exc:
        logger.warning("fetch_project_result_highlight_in_range DB error: %s", exc)
        return []


def fetch_prb_risk_rows(
    *,
    start_at: str | None,
    end_at: str | None,
    limit: int = 60,
) -> list[dict[str, Any]]:
    db_url = build_backend_database_url()
    try:
        with psycopg.connect(db_url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        p.prb_code,
                        p.prb_date,
                        p.risk_factors,
                        p.expected_win_rate,
                        pr.prb_result_code,
                        pr.decision_status,
                        pr.result_date,
                        pr.risk_review,
                        pr.final_opinion
                    FROM {_PRB} p
                    JOIN {_OPP} o ON o.id = p.opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    LEFT JOIN {_PRBR} pr ON pr.prb_id = p.id
                    WHERE (
                            (%(start_at)s::timestamptz IS NULL AND %(end_at)s::timestamptz IS NULL)
                         OR (
                                (%(start_at)s::timestamptz IS NULL OR COALESCE(pr.result_date, p.prb_date) >= %(start_at)s::timestamptz)
                            AND (%(end_at)s::timestamptz IS NULL OR COALESCE(pr.result_date, p.prb_date) <= %(end_at)s::timestamptz)
                         )
                      )
                    ORDER BY COALESCE(pr.result_date, p.prb_date) DESC NULLS LAST, p.id DESC
                    LIMIT %(limit)s
                    """,
                    {"start_at": start_at, "end_at": end_at, "limit": limit},
                )
                return list(cur.fetchall())
    except psycopg.Error as exc:
        logger.warning("fetch_prb_risk_rows DB error: %s", exc)
        return []


def fetch_project_progress_rows(
    *,
    opportunity_code: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    COALESCE(p.project_code, p.pjt_number, p.code) AS project_code,
                    COALESCE(p.project_status, p.type::text) AS project_status,
                    p.project_owner,
                    ('PRR-' || pr.id::text) AS project_report_code,
                    pr.updated_at::date AS report_date,
                    CASE WHEN pr.result_report_file_id IS NOT NULL THEN 'UPLOADED' ELSE 'REGISTERED' END AS result_status,
                    COALESCE(pr.content, p.project_overview) AS detail_content
                FROM {_PR} pr
                JOIN {_PROJ} p ON p.id = pr.project_id
                JOIN {_WR} wr ON wr.id = COALESCE(p.won_report_id, p.order_report_id)
                JOIN {_OPP} o ON o.id = wr.opportunity_id
                JOIN {_CO} c ON c.id = o.customer_company_id
                WHERE o.opportunity_code = %(opportunity_code)s
                ORDER BY pr.updated_at DESC NULLS LAST, pr.id DESC
                LIMIT %(limit)s
                """,
                {"opportunity_code": opportunity_code, "limit": limit},
            )
            return list(cur.fetchall())


def fetch_opportunity_evidence_inventory(*, opportunity_code: str) -> list[dict[str, Any]]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                WITH target AS (
                    SELECT id, opportunity_code, opportunity_name
                    FROM {_OPP}
                    WHERE opportunity_code = %(opportunity_code)s
                ),
                inventory AS (
                    SELECT 'PROJECT_OPPORTUNITY'::varchar AS source_type, t.opportunity_code AS source_id, t.opportunity_name AS title, 1 AS item_count
                    FROM target t
                    UNION ALL
                    SELECT 'SALES_ACTIVITY', COALESCE(a.activity_type, t.opportunity_code), t.opportunity_name, COUNT(*)
                    FROM target t
                    JOIN {_ACT} a ON a.opportunity_id = t.id
                    GROUP BY t.opportunity_code, t.opportunity_name, a.activity_type
                    UNION ALL
                    SELECT 'RFP', r.rfp_analysis_code, t.opportunity_name, 1
                    FROM target t
                    JOIN {_RFP} r ON r.opportunity_id = t.id
                    UNION ALL
                    SELECT 'RFP_ANALYSIS', r.rfp_analysis_code, t.opportunity_name, 1
                    FROM target t
                    JOIN {_RFP} r ON r.opportunity_id = t.id
                    UNION ALL
                    SELECT 'PRB', p.prb_code, t.opportunity_name, 1
                    FROM target t
                    JOIN {_PRB} p ON p.opportunity_id = t.id
                    UNION ALL
                    SELECT 'PRB_RESULT', ('PRBR-' || pr.id::text), t.opportunity_name, 1
                    FROM target t
                    JOIN {_PRB} p ON p.opportunity_id = t.id
                    JOIN {_PRBR} pr ON pr.prb_id = p.id
                    UNION ALL
                    SELECT 'PROPOSAL', COALESCE(pp.proposal_code, 'PROPOSAL-' || pp.id::text), t.opportunity_name, 1
                    FROM target t
                    JOIN {_PROP} pp ON pp.opportunity_id = t.id
                    UNION ALL
                    SELECT 'BID_RESULT', COALESCE(b.bid_result_code, 'BID-' || b.id::text), t.opportunity_name, 1
                    FROM target t
                    JOIN {_BID} b ON b.opportunity_id = t.id
                    UNION ALL
                    SELECT 'LOST', t.opportunity_code, t.opportunity_name, 1
                    FROM target t
                    LEFT JOIN LATERAL (
                        SELECT br.bid_result_code
                        FROM {_BID} br
                        WHERE br.opportunity_id = t.id
                          AND br.won IS FALSE
                        ORDER BY COALESCE(br.updated_at, br.created_at) DESC NULLS LAST, br.id DESC
                        LIMIT 1
                    ) lost_bid ON TRUE
                    WHERE EXISTS (
                        SELECT 1
                        FROM {_OPP} o2
                        WHERE o2.id = t.id
                          AND o2.current_status = '실주'
                    )
                       OR lost_bid.bid_result_code IS NOT NULL
                    UNION ALL
                    SELECT 'WON', t.opportunity_code, t.opportunity_name, 1
                    FROM target t
                    JOIN {_WR} wr ON wr.opportunity_id = t.id
                    UNION ALL
                    SELECT 'ORDER_REPORT', wr.won_report_code, t.opportunity_name, 1
                    FROM target t
                    JOIN {_WR} wr ON wr.opportunity_id = t.id
                    UNION ALL
                    SELECT 'CONTRACT', ct.contract_code, t.opportunity_name, 1
                    FROM target t
                    JOIN {_WR} wr ON wr.opportunity_id = t.id
                    JOIN {_CT} ct ON ct.won_report_id = wr.id OR ct.order_report_id = wr.id
                    UNION ALL
                    SELECT 'PROJECT', COALESCE(p.project_code, p.pjt_number, p.code), t.opportunity_name, 1
                    FROM target t
                    JOIN {_WR} wr ON wr.opportunity_id = t.id
                    JOIN {_PROJ} p ON p.won_report_id = wr.id OR p.order_report_id = wr.id
                    UNION ALL
                    SELECT 'PROJECT_RESULT_REPORT', ('PRR-' || pr.id::text), t.opportunity_name, 1
                    FROM target t
                    JOIN {_WR} wr ON wr.opportunity_id = t.id
                    JOIN {_PROJ} p ON p.won_report_id = wr.id OR p.order_report_id = wr.id
                    JOIN {_PR} pr ON pr.project_id = p.id
                    UNION ALL
                    SELECT 'MAINTENANCE', mc.maintenance_code, t.opportunity_name, 1
                    FROM target t
                    JOIN {_MC} mc ON mc.opportunity_id = t.id
                    UNION ALL
                    SELECT 'MAINTENANCE_QUOTE', mq.ref_no, t.opportunity_name, 1
                    FROM target t
                    JOIN {_MC} mc ON mc.opportunity_id = t.id
                    JOIN {_MQ} mq ON mq.project_id = mc.project_id
                    UNION ALL
                    SELECT 'CUSTOMER_SUPPORT', ('CS-' || cs.id::text), t.opportunity_name, 1
                    FROM target t
                    JOIN {_MC} mc ON mc.opportunity_id = t.id
                    JOIN {_CS} cs ON cs.maintenance_id = mc.id
                )
                SELECT source_type, MIN(source_id) AS source_id, MIN(title) AS title, SUM(item_count) AS item_count
                FROM inventory
                GROUP BY source_type
                ORDER BY source_type
                """,
                {"opportunity_code": opportunity_code},
            )
            return list(cur.fetchall())


def fetch_maintenance_activity_rank(*, limit: int = 3) -> list[dict[str, Any]]:
    return fetch_maintenance_activity_rank_filtered(limit=limit, contract_type=None)


def fetch_maintenance_quote_highlights(*, limit: int = 3) -> list[dict[str, Any]]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    mc.maintenance_code,
                    mq.ref_no AS maintenance_quote_code,
                    mq.quotation_date AS quote_date,
                    mq.monthly_supply_price AS monthly_supply_amount,
                    COALESCE(mq.total_quotation_amount, mq.total_amount) AS quote_amount_total,
                    mq.special_notes,
                    json_agg(
                        json_build_object(
                            'product_name', pm.product_name,
                            'service_category', mqi.category,
                            'service_item', mqi.item,
                            'service_content', mqi.content,
                            'maintenance_amount', mar.amount,
                            'note', mar.remarks
                        )
                        ORDER BY mqi.id
                    ) FILTER (WHERE mqi.id IS NOT NULL) AS items
                FROM {_MQ} mq
                JOIN {_MC} mc ON mc.project_id = mq.project_id
                JOIN {_OPP} o ON o.id = mc.opportunity_id
                JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN {_MQI} mqi ON mqi.quotation_id = mq.id
                LEFT JOIN product_module pm ON pm.id = mqi.product_module_id
                LEFT JOIN maintenance_amount_reason mar
                  ON mar.quotation_id = mq.id
                 AND mar.product_module_id = mqi.product_module_id
                GROUP BY
                    o.opportunity_code, o.opportunity_name, c.name,
                    mc.maintenance_code, mq.ref_no, mq.quotation_date,
                    mq.monthly_supply_price, mq.total_quotation_amount, mq.total_amount, mq.special_notes
                ORDER BY mq.quotation_date DESC NULLS LAST, mq.ref_no DESC
                LIMIT %(limit)s
                """,
                {"limit": limit},
            )
            return list(cur.fetchall())


def fetch_maintenance_activity_rank_filtered(*, contract_type: str | None, limit: int = 3) -> list[dict[str, Any]]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    mc.maintenance_code,
                    COUNT(cs.id) AS activity_count,
                    COALESCE(SUM(cs.activity_hours), 0) AS activity_hours,
                    MAX(cs.activity_date) AS latest_activity_date
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                JOIN {_MC} mc ON mc.opportunity_id = o.id
                LEFT JOIN {_CS} cs ON cs.maintenance_contract_id = mc.id
                WHERE (%(contract_type)s::varchar IS NULL OR mc.contract_type = %(contract_type)s::varchar)
                GROUP BY o.opportunity_code, o.opportunity_name, c.name, mc.maintenance_code
                ORDER BY COUNT(cs.id) DESC, COALESCE(SUM(cs.activity_hours), 0) DESC, MAX(cs.activity_date) DESC NULLS LAST
                LIMIT %(limit)s
                """,
                {"limit": limit, "contract_type": contract_type},
            )
            return list(cur.fetchall())


def fetch_won_summary(*, start_at: str | None, end_at: str | None, limit: int = 3) -> dict[str, Any]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    COUNT(*) AS won_count,
                    COALESCE(SUM(w.contract_amount), 0) AS total_contract_amount
                FROM {_WR} w
                WHERE (%(start_at)s::timestamptz IS NULL OR w.contract_date >= %(start_at)s::timestamptz)
                  AND (%(end_at)s::timestamptz IS NULL OR w.contract_date <= %(end_at)s::timestamptz)
                """,
                {"start_at": start_at, "end_at": end_at},
            )
            summary_row = cur.fetchone() or {"won_count": 0, "total_contract_amount": 0}

            cur.execute(
                f"""
                SELECT
                    w.won_report_code,
                    w.contract_date,
                    w.contract_amount,
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    o.business_type
                FROM {_WR} w
                JOIN {_OPP} o ON o.id = w.opportunity_id
                JOIN {_CO} c ON c.id = o.customer_company_id
                WHERE (%(start_at)s::timestamptz IS NULL OR w.contract_date >= %(start_at)s::timestamptz)
                  AND (%(end_at)s::timestamptz IS NULL OR w.contract_date <= %(end_at)s::timestamptz)
                ORDER BY w.contract_amount DESC NULLS LAST, w.contract_date DESC NULLS LAST, w.id DESC
                LIMIT %(limit)s
                """,
                {"start_at": start_at, "end_at": end_at, "limit": limit},
            )
            top_rows = list(cur.fetchall())

    return {
        "won_count": int(summary_row["won_count"] or 0),
        "total_contract_amount": summary_row["total_contract_amount"] or 0,
        "top_rows": top_rows,
    }


def fetch_total_metric_summary(
    *,
    metric_key: str,
    status_filters: list[str] | None = None,
    filters: dict[str, list[str]] | None = None,
) -> dict[str, Any]:
    filters = filters or {}
    if metric_key == "contract_amount":
        with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT
                        COUNT(*) AS row_count,
                        COALESCE(SUM(w.contract_amount), 0) AS total_value,
                        MAX(w.contract_amount) AS max_value
                    FROM {_WR} w
                    JOIN {_OPP} o ON o.id = w.opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    WHERE (%(status_filters)s::varchar[] IS NULL OR o.current_status = ANY(%(status_filters)s::varchar[]))
                      {build_opportunity_filter_sql(filters)}
                    """,
                    build_query_params(status_filters=status_filters or None, filters=filters, limit=1),
                )
                summary = cur.fetchone() or {"row_count": 0, "total_value": 0, "max_value": 0}
                cur.execute(
                    f"""
                    SELECT
                        w.won_report_code AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        o.current_status,
                        w.contract_amount AS metric_value
                    FROM {_WR} w
                    JOIN {_OPP} o ON o.id = w.opportunity_id
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    WHERE (%(status_filters)s::varchar[] IS NULL OR o.current_status = ANY(%(status_filters)s::varchar[]))
                      {build_opportunity_filter_sql(filters)}
                    ORDER BY w.contract_amount DESC NULLS LAST, w.id DESC
                    LIMIT 3
                    """,
                    build_query_params(status_filters=status_filters or None, filters=filters, limit=3),
                )
                top_rows = list(cur.fetchall())
        return {
            "row_count": int(summary["row_count"] or 0),
            "total_value": summary["total_value"] or 0,
            "max_value": summary["max_value"] or 0,
            "top_rows": top_rows,
        }

    if metric_key == "expected_amount":
        with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT
                        COUNT(*) AS row_count,
                        COALESCE(SUM(o.expected_amount), 0) AS total_value,
                        MAX(o.expected_amount) AS max_value
                    FROM {_OPP} o
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    WHERE o.expected_amount IS NOT NULL
                      AND (%(status_filters)s::varchar[] IS NULL OR o.current_status = ANY(%(status_filters)s::varchar[]))
                      {build_opportunity_filter_sql(filters)}
                    """,
                    build_query_params(status_filters=status_filters or None, filters=filters, limit=1),
                )
                summary = cur.fetchone() or {"row_count": 0, "total_value": 0, "max_value": 0}
                cur.execute(
                    f"""
                    SELECT
                        o.opportunity_code AS reference_code,
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        o.current_status,
                        o.expected_amount AS metric_value
                    FROM {_OPP} o
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    WHERE o.expected_amount IS NOT NULL
                      AND (%(status_filters)s::varchar[] IS NULL OR o.current_status = ANY(%(status_filters)s::varchar[]))
                      {build_opportunity_filter_sql(filters)}
                    ORDER BY o.expected_amount DESC NULLS LAST, o.id DESC
                    LIMIT 3
                    """,
                    build_query_params(status_filters=status_filters or None, filters=filters, limit=3),
                )
                top_rows = list(cur.fetchall())
        return {
            "row_count": int(summary["row_count"] or 0),
            "total_value": summary["total_value"] or 0,
            "max_value": summary["max_value"] or 0,
            "top_rows": top_rows,
        }

    raise ValueError(f"Unsupported aggregate metric key: {metric_key}")


def fetch_contract_snapshot(*, contract_code: str) -> dict[str, Any] | None:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    ct.contract_code,
                    ct.contract_status,
                    ct.memo,
                    wr.won_report_code,
                    wr.contract_amount,
                    wr.payment_terms,
                    wr.revenue_category,
                    wr.contract_date,
                    ct.start_date AS contract_start_date,
                    ct.end_date AS contract_end_date,
                    wr.business_scope,
                    wr.special_notes
                FROM {_CT} ct
                JOIN {_WR} wr ON wr.id = COALESCE(ct.won_report_id, ct.order_report_id)
                JOIN {_OPP} o ON o.id = wr.opportunity_id
                JOIN {_CO} c ON c.id = o.customer_company_id
                WHERE ct.contract_code = %(contract_code)s
                LIMIT 1
                """,
                {"contract_code": contract_code},
            )
            return cur.fetchone()


def fetch_project_snapshot(*, project_code: str) -> dict[str, Any] | None:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    COALESCE(p.project_code, p.pjt_number, p.code) AS project_code,
                    p.pjt_number AS pjt_no,
                    p.end_date AS delivery_date,
                    p.project_owner,
                    COALESCE(p.project_status, p.type::text) AS project_status,
                    p.team_name,
                    COALESCE(p.project_status, p.type::text) AS project_type,
                    latest.project_report_code,
                    latest.report_date,
                    latest.result_status,
                    COALESCE(latest.detail_content, p.project_overview) AS detail_content
                FROM {_PROJ} p
                JOIN {_WR} wr ON wr.id = COALESCE(p.won_report_id, p.order_report_id)
                JOIN {_OPP} o ON o.id = wr.opportunity_id
                JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN LATERAL (
                    SELECT
                        ('PRR-' || pr.id::text) AS project_report_code,
                        pr.updated_at::date AS report_date,
                        CASE WHEN pr.result_report_file_id IS NOT NULL THEN 'UPLOADED' ELSE 'REGISTERED' END AS result_status,
                        NULL::text AS detail_content
                    FROM {_PR} pr
                    WHERE pr.project_id = p.id
                    ORDER BY pr.updated_at DESC NULLS LAST, pr.id DESC
                    LIMIT 1
                ) latest ON TRUE
                WHERE COALESCE(p.project_code, p.pjt_number, p.code) = %(project_code)s
                LIMIT 1
                """,
                {"project_code": project_code},
            )
            return cur.fetchone()


def fetch_workflow_snapshot(*, opportunity_code: str) -> dict[str, Any] | None:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    o.current_status,
                    req.request_code,
                    req.request_type,
                    req.status AS activity_request_status,
                    req.request_date AS activity_request_date,
                    req.approved_at AS activity_request_approved_at,
                    req.receiver_name,
                    req.request_content,
                    p.prb_code,
                    pr.prb_result_code,
                    pr.decision_status,
                    pr.result_date AS prb_result_date,
                    pr.final_opinion,
                    wr.won_report_code,
                    wr.approval_status,
                    wr.contract_date,
                    wr.business_scope,
                    wr.special_notes,
                    ct.contract_code,
                    ct.contract_status,
                    wr.contract_start_date AS contract_signed_at,
                    ct.memo AS contract_memo
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN LATERAL (
                    SELECT
                        sar.request_code,
                        sar.request_type,
                        sar.status,
                        sar.request_date,
                        sar.approved_at,
                        sar.receiver_name,
                        sar.request_content
                    FROM {_SAR} sar
                    WHERE sar.opportunity_code = o.opportunity_code
                    ORDER BY sar.request_date DESC NULLS LAST, sar.id DESC
                    LIMIT 1
                ) req ON TRUE
                LEFT JOIN LATERAL (
                    SELECT p.id, p.prb_code
                    FROM {_PRB} p
                    WHERE p.opportunity_id = o.id
                    ORDER BY p.prb_date DESC NULLS LAST, p.id DESC
                    LIMIT 1
                ) p ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        pr.prb_result_code,
                        pr.decision_status,
                        pr.result_date,
                        pr.final_opinion
                    FROM {_PRBR} pr
                    WHERE pr.prb_id = p.id
                    ORDER BY pr.result_date DESC NULLS LAST, pr.id DESC
                    LIMIT 1
                ) pr ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        wr.id,
                        wr.won_report_code,
                        wr.approval_status,
                        wr.contract_date,
                        wr.contract_start_date,
                        wr.business_scope,
                        wr.special_notes
                    FROM {_WR} wr
                    WHERE wr.opportunity_id = o.id
                    ORDER BY wr.contract_date DESC NULLS LAST, wr.id DESC
                    LIMIT 1
                ) wr ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        ct.contract_code,
                        ct.contract_status,
                        ct.memo
                    FROM {_CT} ct
                    WHERE ct.won_report_id = wr.id
                    ORDER BY ct.id DESC
                    LIMIT 1
                ) ct ON TRUE
                WHERE o.opportunity_code = %(opportunity_code)s
                LIMIT 1
                """,
                {"opportunity_code": opportunity_code},
            )
            return cur.fetchone()


def fetch_maintenance_snapshot(*, maintenance_code: str) -> dict[str, Any] | None:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    mc.maintenance_code,
                    mc.type AS contract_type,
                    mc.maintenance_start_date,
                    mc.maintenance_end_date,
                    CASE
                        WHEN mc.start_date IS NOT NULL AND mc.end_date IS NOT NULL
                             AND CURRENT_DATE BETWEEN mc.start_date AND mc.end_date THEN '진행중'
                        WHEN mc.end_date IS NOT NULL AND mc.end_date < CURRENT_DATE THEN '종료'
                        ELSE NULL
                    END AS status,
                    mc.remarks AS detail_content,
                    latest.support_code,
                    latest.activity_date,
                    latest.activity_type,
                    latest.activity_content,
                    latest.performance,
                    mq.maintenance_quote_code,
                    mq.quote_amount_total,
                    mq.monthly_supply_amount
                FROM {_MC} mc
                JOIN {_OPP} o ON o.id = mc.opportunity_id
                JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN LATERAL (
                    SELECT
                        ('CS-' || cs.id::text) AS support_code,
                        cs.activity_start_time AS activity_date,
                        cs.activity_type,
                        cs.activity_content,
                        cs.remarks AS performance
                    FROM {_CS} cs
                    WHERE cs.maintenance_id = mc.id
                    ORDER BY cs.activity_start_time DESC NULLS LAST, cs.id DESC
                    LIMIT 1
                ) latest ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        q.ref_no AS maintenance_quote_code,
                        COALESCE(q.total_quotation_amount, q.total_amount) AS quote_amount_total,
                        q.monthly_supply_price AS monthly_supply_amount
                    FROM {_MQ} q
                    WHERE q.project_id = mc.project_id
                    ORDER BY q.quotation_date DESC NULLS LAST, q.id DESC
                    LIMIT 1
                ) mq ON TRUE
                WHERE mc.maintenance_code = %(maintenance_code)s
                LIMIT 1
                """,
                {"maintenance_code": maintenance_code},
            )
            return cur.fetchone()


def fetch_maintenance_snapshot_by_opportunity(*, opportunity_code: str) -> dict[str, Any] | None:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    mc.maintenance_code,
                    mc.type AS contract_type,
                    mc.maintenance_start_date,
                    mc.maintenance_end_date,
                    CASE
                        WHEN mc.start_date IS NOT NULL AND mc.end_date IS NOT NULL
                             AND CURRENT_DATE BETWEEN mc.start_date AND mc.end_date THEN '진행중'
                        WHEN mc.end_date IS NOT NULL AND mc.end_date < CURRENT_DATE THEN '종료'
                        ELSE NULL
                    END AS status,
                    mc.remarks AS detail_content,
                    latest.support_code,
                    latest.activity_date,
                    latest.activity_type,
                    latest.activity_content,
                    latest.performance,
                    mq.maintenance_quote_code,
                    mq.quote_amount_total,
                    mq.monthly_supply_amount
                FROM {_MC} mc
                JOIN {_OPP} o ON o.id = mc.opportunity_id
                JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN LATERAL (
                    SELECT
                        ('CS-' || cs.id::text) AS support_code,
                        cs.activity_start_time AS activity_date,
                        cs.activity_type,
                        cs.activity_content,
                        cs.remarks AS performance
                    FROM {_CS} cs
                    WHERE cs.maintenance_id = mc.id
                    ORDER BY cs.activity_start_time DESC NULLS LAST, cs.id DESC
                    LIMIT 1
                ) latest ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        q.ref_no AS maintenance_quote_code,
                        COALESCE(q.total_quotation_amount, q.total_amount) AS quote_amount_total,
                        q.monthly_supply_price AS monthly_supply_amount
                    FROM {_MQ} q
                    WHERE q.project_id = mc.project_id
                    ORDER BY q.quotation_date DESC NULLS LAST, q.id DESC
                    LIMIT 1
                ) mq ON TRUE
                WHERE o.opportunity_code = %(opportunity_code)s
                ORDER BY mc.maintenance_start_date DESC NULLS LAST, mc.id DESC
                LIMIT 1
                """,
                {"opportunity_code": opportunity_code},
            )
            return cur.fetchone()


def fetch_maintenance_status_rows(
    *,
    contract_type: str | None = None,
    status: str | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    mc.maintenance_code,
                    mc.contract_type,
                    mc.maintenance_start_date,
                    mc.maintenance_end_date,
                    mc.status,
                    mc.detail_content
                FROM {_MC} mc
                JOIN {_OPP} o ON o.id = mc.opportunity_id
                JOIN {_CO} c ON c.id = o.customer_company_id
                WHERE (%(contract_type)s::varchar IS NULL OR mc.contract_type = %(contract_type)s::varchar)
                  AND (%(status)s::varchar IS NULL OR mc.status = %(status)s::varchar)
                ORDER BY mc.maintenance_start_date DESC NULLS LAST, mc.id DESC
                LIMIT %(limit)s
                """,
                {
                    "contract_type": contract_type,
                    "status": status,
                    "limit": limit,
                },
            )
            return list(cur.fetchall())


def fetch_paid_maintenance_transition_rows(*, limit: int = 5) -> list[dict[str, Any]]:
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT DISTINCT
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    o.updated_at,
                    o.id AS opportunity_id,
                    mc.maintenance_code,
                    mc.contract_type,
                    mc.status,
                    mq.maintenance_quote_code,
                    mq.quote_amount_total,
                    ps.post_sales_code,
                    ps.next_opportunity_hint
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN {_MC} mc ON mc.opportunity_id = o.id
                LEFT JOIN {_MQ} mq ON mq.maintenance_contract_id = mc.id
                LEFT JOIN {_MQI} mqi ON mqi.maintenance_quote_id = mq.id
                LEFT JOIN {_WR} wr ON wr.opportunity_id = o.id
                LEFT JOIN {_PROJ} p ON p.won_report_id = wr.id
                LEFT JOIN {_PS} ps ON ps.project_id = p.id
                WHERE COALESCE(mc.contract_type, '') = '유상'
                   OR COALESCE(mqi.service_category, '') LIKE '%%유상%%'
                   OR COALESCE(mq.special_notes, '') LIKE '%%유상%%'
                   OR COALESCE(ps.next_opportunity_hint, '') LIKE '%%유상%%'
                ORDER BY o.updated_at DESC NULLS LAST, o.id DESC
                LIMIT %(limit)s
                """,
                {"limit": limit},
            )
            return list(cur.fetchall())


def fetch_activity_recency_gap_rows(
    *,
    sort_direction: str,
    status_filters: list[str],
    filters: dict[str, list[str]] | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    filters = filters or {}
    direction = "DESC" if sort_direction == "desc" else "ASC"
    status_filter_sql = "AND o.current_status = ANY(%(status_filters)s::varchar[])" if status_filters else ""
    opportunity_filter_sql = build_opportunity_filter_sql(filters)
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code AS reference_code,
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    o.current_status,
                    MAX(a.activity_at) AS latest_activity_at,
                    COUNT(a.id) AS activity_count,
                    GREATEST(0, CURRENT_DATE - COALESCE(MAX(a.activity_at)::date, o.updated_at::date))::int AS activity_recency_gap_days
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN {_ACT} a ON a.opportunity_id = o.id
                WHERE 1=1
                  {status_filter_sql}
                  {opportunity_filter_sql}
                GROUP BY o.id, o.opportunity_code, o.opportunity_name, c.name, o.current_status, o.updated_at
                ORDER BY activity_recency_gap_days {direction}, o.id
                LIMIT %(limit)s
                """,
                build_query_params(status_filters=status_filters or None, filters=filters, limit=limit),
            )
            rows = list(cur.fetchall())
    for row in rows:
        row["metric_value"] = row.get("activity_recency_gap_days")
    return rows


def fetch_pipeline_completeness_rows(
    *,
    sort_direction: str,
    status_filters: list[str],
    filters: dict[str, list[str]] | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    filters = filters or {}
    direction = "DESC" if sort_direction == "desc" else "ASC"
    status_filter_sql = "AND o.current_status = ANY(%(status_filters)s::varchar[])" if status_filters else ""
    opportunity_filter_sql = build_opportunity_filter_sql(filters)
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    o.opportunity_code AS reference_code,
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    o.current_status,
                    ROUND(
                        (
                            (CASE WHEN o.expected_amount IS NOT NULL THEN 1 ELSE 0 END) +
                            (CASE WHEN o.bid_date IS NOT NULL OR o.contract_date IS NOT NULL THEN 1 ELSE 0 END) +
                            (CASE WHEN COALESCE(trim(o.business_type), '') <> '' THEN 1 ELSE 0 END) +
                            (CASE WHEN char_length(COALESCE(trim(o.main_content), '')) >= 10 THEN 1 ELSE 0 END) +
                            (CASE WHEN char_length(COALESCE(trim(o.issue_content), '')) >= 10 THEN 1 ELSE 0 END) +
                            (CASE WHEN char_length(COALESCE(trim(o.decision_structure), '')) >= 10 THEN 1 ELSE 0 END) +
                            (CASE WHEN char_length(COALESCE(trim(o.contact_line), '')) >= 10 THEN 1 ELSE 0 END)
                        ) * 100.0 / 7.0
                    , 1) AS pipeline_data_completeness_index,
                    concat_ws(
                        ', ',
                        CASE WHEN o.expected_amount IS NULL THEN '예산' END,
                        CASE WHEN o.bid_date IS NULL AND o.contract_date IS NULL THEN '예정시점' END,
                        CASE WHEN COALESCE(trim(o.business_type), '') = '' THEN '사업유형' END,
                        CASE WHEN char_length(COALESCE(trim(o.main_content), '')) < 10 THEN '사업개요' END,
                        CASE WHEN char_length(COALESCE(trim(o.issue_content), '')) < 10 THEN '이슈' END,
                        CASE WHEN char_length(COALESCE(trim(o.decision_structure), '')) < 10 THEN '의사결정구조' END,
                        CASE WHEN char_length(COALESCE(trim(o.contact_line), '')) < 10 THEN '접촉라인' END
                    ) AS missing_fields
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                WHERE 1=1
                  {status_filter_sql}
                  {opportunity_filter_sql}
                ORDER BY pipeline_data_completeness_index {direction}, o.id
                LIMIT %(limit)s
                """,
                build_query_params(status_filters=status_filters or None, filters=filters, limit=limit),
            )
            rows = list(cur.fetchall())
    for row in rows:
        row["metric_value"] = row.get("pipeline_data_completeness_index")
    return rows


def fetch_proposal_lift_probability_rows(
    *,
    sort_direction: str,
    status_filters: list[str],
    filters: dict[str, list[str]] | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    filters = filters or {}
    direction = "DESC" if sort_direction == "desc" else "ASC"
    opportunity_filter_sql = build_opportunity_filter_sql(filters)
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                WITH recent_activity AS (
                    SELECT
                        a.opportunity_id,
                        COUNT(*) FILTER (WHERE a.activity_at >= NOW() - INTERVAL '90 days') AS recent_activity_count,
                        MAX(a.activity_at) AS latest_activity_at
                    FROM {_ACT} a
                    GROUP BY a.opportunity_id
                ),
                rfp_presence AS (
                    SELECT opportunity_id, COUNT(*) AS rfp_count
                    FROM {_RFP}
                    GROUP BY opportunity_id
                ),
                prb_presence AS (
                    SELECT opportunity_id, COUNT(*) AS prb_count
                    FROM {_PRB}
                    GROUP BY opportunity_id
                )
                SELECT
                    o.opportunity_code AS reference_code,
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    o.current_status,
                    COALESCE(ra.recent_activity_count, 0) AS recent_activity_count,
                    ra.latest_activity_at,
                    COALESCE(rp.rfp_count, 0) AS rfp_count,
                    COALESCE(pp.prb_count, 0) AS prb_count,
                    o.bid_date,
                    ROUND(
                        LEAST(100.0,
                            LEAST(COALESCE(ra.recent_activity_count, 0), 3) * 10.0 +
                            CASE WHEN COALESCE(rp.rfp_count, 0) > 0 THEN 25.0 ELSE 0.0 END +
                            CASE WHEN char_length(COALESCE(trim(o.decision_structure), '')) >= 10 THEN 10.0 ELSE 0.0 END +
                            CASE WHEN char_length(COALESCE(trim(o.contact_line), '')) >= 10 THEN 10.0 ELSE 0.0 END +
                            CASE
                                WHEN o.bid_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '180 days' THEN 15.0
                                WHEN o.bid_date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE + INTERVAL '365 days' THEN 7.5
                                ELSE 0.0
                            END +
                            CASE WHEN COALESCE(pp.prb_count, 0) > 0 THEN 10.0 ELSE 0.0 END +
                            CASE WHEN o.expected_amount IS NOT NULL THEN 5.0 ELSE 0.0 END +
                            CASE WHEN char_length(COALESCE(trim(o.issue_content), '')) >= 10 THEN 5.0 ELSE 0.0 END
                        )
                    , 1) AS proposal_lift_probability
                FROM {_OPP} o
                JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN recent_activity ra ON ra.opportunity_id = o.id
                LEFT JOIN rfp_presence rp ON rp.opportunity_id = o.id
                LEFT JOIN prb_presence pp ON pp.opportunity_id = o.id
                WHERE o.current_status = ANY(
                    CASE
                        WHEN %(status_filters)s::varchar[] IS NULL OR cardinality(%(status_filters)s::varchar[]) = 0
                        THEN ARRAY['발굴','입찰','경쟁중','제안']::varchar[]
                        ELSE %(status_filters)s::varchar[]
                    END
                )
                  {opportunity_filter_sql}
                ORDER BY proposal_lift_probability {direction}, o.id
                LIMIT %(limit)s
                """,
                build_query_params(status_filters=status_filters or None, filters=filters, limit=limit),
            )
            rows = list(cur.fetchall())
    for row in rows:
        row["metric_value"] = row.get("proposal_lift_probability")
    return rows


def fetch_free_to_paid_conversion_rows(
    *,
    sort_direction: str,
    status_filters: list[str],
    filters: dict[str, list[str]] | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    filters = filters or {}
    direction = "DESC" if sort_direction == "desc" else "ASC"
    status_filter_sql = "AND o.current_status = ANY(%(status_filters)s::varchar[])" if status_filters else ""
    opportunity_filter_sql = build_opportunity_filter_sql(filters)
    with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                WITH support_stats AS (
                    SELECT
                        cs.maintenance_contract_id,
                        COUNT(*) AS support_count,
                        MAX(cs.activity_date) AS latest_support_date
                    FROM {_CS} cs
                    GROUP BY cs.maintenance_contract_id
                ),
                quote_stats AS (
                    SELECT
                        mq.maintenance_contract_id,
                        COUNT(*) AS quote_count,
                        MAX(mq.quote_date) AS latest_quote_date,
                        MAX(mq.maintenance_quote_code) AS maintenance_quote_code,
                        MAX(mq.quote_amount_total) AS quote_amount_total
                    FROM {_MQ} mq
                    GROUP BY mq.maintenance_contract_id
                ),
                project_post_sales AS (
                    SELECT
                        wr.opportunity_id,
                        MAX(ps.post_sales_code) AS post_sales_code,
                        MAX(ps.activity_date) AS latest_post_sales_date,
                        string_agg(ps.next_opportunity_hint, ' / ') AS next_opportunity_hint
                    FROM {_WR} wr
                    JOIN {_PROJ} p ON p.won_report_id = wr.id
                    JOIN {_PS} ps ON ps.project_id = p.id
                    GROUP BY wr.opportunity_id
                )
                SELECT
                    COALESCE(qs.maintenance_quote_code, mc.maintenance_code, o.opportunity_code) AS reference_code,
                    o.opportunity_code,
                    o.opportunity_name,
                    c.name AS customer_name,
                    o.current_status,
                    mc.maintenance_code,
                    mc.status AS maintenance_status,
                    mc.maintenance_start_date,
                    mc.maintenance_end_date,
                    GREATEST(0, mc.maintenance_end_date - CURRENT_DATE)::int AS days_to_end,
                    COALESCE(ss.support_count, 0) AS support_count,
                    ss.latest_support_date,
                    COALESCE(qs.quote_count, 0) AS quote_count,
                    qs.latest_quote_date,
                    qs.maintenance_quote_code,
                    qs.quote_amount_total,
                    pps.post_sales_code,
                    pps.next_opportunity_hint,
                    ROUND(
                        LEAST(100.0,
                            CASE
                                WHEN mc.maintenance_end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 35.0
                                WHEN mc.maintenance_end_date <= CURRENT_DATE + INTERVAL '60 days' THEN 28.0
                                WHEN mc.maintenance_end_date <= CURRENT_DATE + INTERVAL '90 days' THEN 20.0
                                WHEN mc.maintenance_end_date <= CURRENT_DATE + INTERVAL '180 days' THEN 10.0
                                ELSE 0.0
                            END +
                            CASE WHEN COALESCE(qs.quote_count, 0) > 0 THEN 25.0 ELSE 0.0 END +
                            CASE
                                WHEN COALESCE(pps.next_opportunity_hint, '') ~ '(유상|확장|추가|모듈|갱신)' THEN 20.0
                                ELSE 0.0
                            END +
                            LEAST(COALESCE(ss.support_count, 0), 5) * 2.0 +
                            CASE
                                WHEN ss.latest_support_date >= CURRENT_DATE - INTERVAL '60 days' THEN 10.0
                                WHEN ss.latest_support_date >= CURRENT_DATE - INTERVAL '120 days' THEN 5.0
                                ELSE 0.0
                            END
                        )
                    , 1) AS free_to_paid_conversion_propensity
                FROM {_MC} mc
                JOIN {_OPP} o ON o.id = mc.opportunity_id
                JOIN {_CO} c ON c.id = o.customer_company_id
                LEFT JOIN support_stats ss ON ss.maintenance_contract_id = mc.id
                LEFT JOIN quote_stats qs ON qs.maintenance_contract_id = mc.id
                LEFT JOIN project_post_sales pps ON pps.opportunity_id = o.id
                WHERE mc.contract_type = '무상'
                  {status_filter_sql}
                  {opportunity_filter_sql}
                ORDER BY free_to_paid_conversion_propensity {direction}, mc.id
                LIMIT %(limit)s
                """,
                build_query_params(status_filters=status_filters or None, filters=filters, limit=limit),
            )
            rows = list(cur.fetchall())
    for row in rows:
        row["metric_value"] = row.get("free_to_paid_conversion_propensity")
    return rows


def build_metric_query(
    *,
    metric_key: str,
    sort_direction: str,
    status_filters: list[str],
    filters: dict[str, list[str]],
) -> tuple[str, str]:
    direction = "DESC" if sort_direction == "desc" else "ASC"
    status_expr = opportunity_status_value_expr()
    status_select = opportunity_status_select_expr()
    expected_amount_expr = opportunity_expected_amount_value_expr()
    expected_amount_select = opportunity_expected_amount_select_expr()
    business_type_expr = opportunity_business_type_value_expr()
    business_type_select = opportunity_business_type_select_expr()
    status_filter_sql = f"AND {status_expr} = ANY(%(status_filters)s::varchar[])" if status_filters else ""
    opportunity_filter_sql = build_opportunity_filter_sql(filters)

    if metric_key in {"estimated_profit", "estimated_profit_rate", "expected_win_rate", "estimated_revenue"}:
        prb_profit_expr = _first_existing_column_expr(
            table_name="prb",
            table_alias="p",
            candidates=("estimated_profit", "estimated_operating_profit"),
            cast_type="numeric",
        )
        prb_profit_rate_expr = _first_existing_column_expr(
            table_name="prb",
            table_alias="p",
            candidates=("estimated_profit_rate", "estimated_profit_margin"),
            cast_type="numeric",
        )
        prb_total_cost_expr = _first_existing_column_expr(
            table_name="prb",
            table_alias="p",
            candidates=("total_cost", "prb_total_cost"),
            cast_type="numeric",
        )
        metric_column_map = {
            "estimated_profit": prb_profit_expr,
            "estimated_profit_rate": prb_profit_rate_expr,
            "expected_win_rate": "p.expected_win_rate",
            "estimated_revenue": "p.estimated_revenue",
        }
        metric_column_sql = metric_column_map[metric_key]
        return (
            f"""
            SELECT
                p.prb_code AS reference_code,
                o.opportunity_code,
                o.opportunity_name,
                c.name AS customer_name,
                {status_select},
                {prb_profit_expr} AS estimated_profit,
                {prb_profit_rate_expr} AS estimated_profit_rate,
                p.expected_win_rate,
                p.estimated_revenue,
                {prb_total_cost_expr} AS total_cost,
                NULL::text AS risk_factors,
                NULL::text AS sales_opinion
            FROM {_PRB} p
            JOIN {_OPP} o ON o.id = p.project_opportunity_id
            JOIN {_CO} c ON c.id = o.customer_company_id
            WHERE {metric_column_sql} IS NOT NULL
              {status_filter_sql}
              {opportunity_filter_sql}
            ORDER BY {metric_column_sql} {direction}, p.id
            LIMIT %(limit)s
            """,
            metric_key,
        )

    if metric_key == "expected_amount":
        return (
            f"""
            SELECT
                o.opportunity_code AS reference_code,
                o.opportunity_code,
                o.opportunity_name,
                c.name AS customer_name,
                {status_select},
                {expected_amount_select},
                {business_type_select}
            FROM {_OPP} o
            JOIN {_CO} c ON c.id = o.customer_company_id
            WHERE {expected_amount_expr} IS NOT NULL
              {status_filter_sql}
              {opportunity_filter_sql}
            ORDER BY {expected_amount_expr} {direction}, o.id
            LIMIT %(limit)s
            """,
            "expected_amount",
        )

    if metric_key == "contract_amount":
        contract_amount_expr = _first_existing_column_expr(
            table_name="contract",
            table_alias="ct",
            candidates=("contract_amount", "total_amount"),
            cast_type="numeric",
        )
        return (
            f"""
            SELECT
                CONCAT('CTR-', ct.id)::text AS reference_code,
                o.opportunity_code,
                o.opportunity_name,
                c.name AS customer_name,
                {status_select},
                {contract_amount_expr} AS contract_amount,
                {order_report_revenue_category_value_expr()} AS revenue_category,
                {order_report_payment_terms_value_expr()} AS payment_terms,
                {order_report_business_scope_value_expr()} AS business_scope,
                {order_report_special_notes_value_expr()} AS special_notes
            FROM {_CT} ct
            JOIN {_WR} w ON w.id = ct.order_report_id
            JOIN {_OPP} o ON o.id = w.project_opportunity_id
            JOIN {_CO} c ON c.id = o.customer_company_id
            WHERE {contract_amount_expr} IS NOT NULL
              AND ct.deleted = false
              {status_filter_sql}
              {opportunity_filter_sql}
            ORDER BY {contract_amount_expr} {direction}, ct.id
            LIMIT %(limit)s
            """,
            metric_key,
        )

    raise ValueError(f"Unsupported metric key: {metric_key}")


def normalize_resolution_terms(query_terms: list[str]) -> list[str]:
    filtered: list[str] = []
    ignored = {
        "사업",
        "사업들",
        "영업기회",
        "현황",
        "상태",
        "결과",
        "유지보수",
        "구축",
        "고도화",
        "전환",
        "정기점검",
        "긴급",
        "장애",
        "조치",
        "지원",
        "견적",
        "견적서",
        "제안",
        "제안서",
        "요구사항",
        "리스크",
        "근거",
        "활동",
        "업무",
        "누가",
        "언제",
        "뭐",
        "무엇",
        # 워크플로/도메인 noise — 사람 이름 + 도메인 단어 패턴이 잘못된 사업기회로 매칭되지 않도록
        "청구", "청구서", "수금", "미수금", "세금계산서",
        "결재", "결재자", "결재선", "결재라인", "상신", "상신자", "승인", "승인자", "반려",
        "라이선스", "라이센스", "계약", "계약서", "수주", "수주보고서", "보고서",
        "고객지원", "고객 지원",
        # 회사 카테고리 일반 명사 — opportunity_name 부분 토큰 매칭 회피 (예: "베스핀글로벌 파트너" → KB파트너스 잘못 매칭 방지)
        "파트너", "파트너스", "파트너사", "협력사", "벤더", "회사", "기업", "고객사", "솔루션",
        "관련", "관련된", "포함된",
        "ITSM",
        "EMS",
        "AIOPS",
        "DASHBOARD",
        "SECURITY",
        "CLOUDOPS",
        "ITO",
        "SLA",
    }
    # 한국어 조사 제거 후 비교 (예: "안지수가" → "안지수")
    josa_suffixes = ("이가", "께서", "에서", "에게", "에서는", "에게는", "한테", "라고", "이라고",
                     "이", "가", "은", "는", "을", "를", "와", "과", "의", "에", "도", "만",
                     "이라", "라", "이며", "며", "이고", "고", "야", "랑", "이랑")

    def _strip_josa(text: str) -> str:
        for suffix in sorted(josa_suffixes, key=len, reverse=True):
            if len(text) > len(suffix) + 1 and text.endswith(suffix):
                return text[: -len(suffix)]
        return text

    for term in query_terms:
        candidate = term.strip()
        if len(candidate) < 2:
            continue
        candidate_stripped = _strip_josa(candidate)
        if candidate_stripped in ignored or candidate in ignored:
            continue
        if candidate_stripped and candidate_stripped not in filtered:
            filtered.append(candidate_stripped)
    return filtered[:8]


def build_opportunity_filter_sql(filters: dict[str, list[str]]) -> str:
    clauses = []
    if filters.get("customer_group"):
        customer_group_expr = customer_group_value_expr()
        if customer_group_expr != "NULL::text":
            clauses.append(f"AND {customer_group_expr} = ANY(%(customer_group)s::varchar[])")
    if filters.get("customer_type"):
        customer_type_expr = customer_type_value_expr()
        if customer_type_expr != "NULL::text":
            clauses.append(f"AND {customer_type_expr} = ANY(%(customer_type)s::varchar[])")
    if filters.get("business_type"):
        clauses.append(f"AND {opportunity_business_type_value_expr()} = ANY(%(business_type)s::varchar[])")
    return "\n                  ".join(clauses)


def build_query_params(
    *,
    status_filters: list[str] | None,
    filters: dict[str, list[str]],
    limit: int,
) -> dict[str, Any]:
    customer_group_filters = expand_customer_group_filters(filters.get("customer_group") or [])
    return {
        "status_filters": status_filters,
        "customer_group": customer_group_filters,
        "customer_type": filters.get("customer_type") or [],
        "business_type": filters.get("business_type") or [],
        "limit": limit,
    }


def expand_customer_group_filters(values: list[str]) -> list[str]:
    expanded: list[str] = []
    mapping = {
        "PUBLIC": "공공",
        "PRIVATE": "민간",
        "공공": "공공",
        "민간": "민간",
    }
    for value in values:
        normalized = str(value or "").strip()
        if not normalized:
            continue
        mapped = mapping.get(normalized.upper(), mapping.get(normalized, normalized))
        if mapped not in expanded:
            expanded.append(mapped)
    return expanded


_ENTITY_COUNT_TABLE_MAP: dict[str, str] = {
    "opportunity": "public.project_opportunity",
    "activity":    "public.sales_activity",
    "rfp":         "public.rfp_analyze_result",
    "quotation":   "public.quotation",
    "project":     "public.project",
    "contract":    "public.contract",
    "maintenance": "public.maintenance",
    "prb":         "public.prb",
    "bid":         "public.bid_result",
    "proposal":    "public.proposal",
    "license":     "public.license",
    "order_report": "public.order_report",
    "billing":     "public.billing",
    "user":        "public.users",
}

# entity_type → (SQL WHERE 추가절). 특정 segment 만 count 할 때 사용.
_ENTITY_COUNT_EXTRA_WHERE: dict[str, str] = {
    "company_customer": "AND company_type = 'CUSTOMER'",
    "company_partner": "AND company_type = 'PARTNER'",
}


def fetch_entity_count(entity_type: str) -> int | None:
    db_url = build_backend_database_url()
    # company_customer/company_partner 는 company 테이블 + extra where
    if entity_type in {"company_customer", "company_partner"}:
        table = "public.company"
        extra_where = _ENTITY_COUNT_EXTRA_WHERE.get(entity_type, "")
    else:
        table = _ENTITY_COUNT_TABLE_MAP.get(entity_type)
        extra_where = ""
    if not table:
        return None
    try:
        with psycopg.connect(db_url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                # users 테이블은 deleted 필드가 없을 수 있음 → 우선 시도 후 fallback
                if entity_type == "user":
                    cur.execute(f"SELECT COUNT(*) AS cnt FROM {table}")
                else:
                    cur.execute(f"SELECT COUNT(*) AS cnt FROM {table} WHERE deleted = false {extra_where}")
                row = cur.fetchone()
                return int(row["cnt"]) if row else None
    except psycopg.errors.UndefinedTable:
        return None
    except psycopg.Error as exc:
        logger.warning("fetch_entity_count(%s) DB error: %s", entity_type, exc)
        return None


def fetch_opportunity_list_rows(*, limit: int = 50) -> list[dict[str, Any]]:
    db_url = build_backend_database_url()
    customer_name_expr = company_name_select_expr()
    customer_group_expr = customer_group_select_expr()
    customer_type_expr = customer_type_select_expr()
    opportunity_status_expr = opportunity_status_select_expr()
    opportunity_expected_amount_expr = opportunity_expected_amount_select_expr()
    opportunity_business_type_expr = opportunity_business_type_select_expr()
    try:
        with psycopg.connect(db_url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT
                        o.opportunity_code,
                        o.opportunity_name,
                        {customer_name_expr},
                        {customer_group_expr},
                        {customer_type_expr},
                        {opportunity_status_expr},
                        {opportunity_expected_amount_expr},
                        {opportunity_business_type_expr}
                    FROM {_OPP} o
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    WHERE o.deleted = false
                    ORDER BY {opportunity_expected_amount_value_expr()} DESC NULLS LAST, o.id
                    LIMIT %(limit)s
                    """,
                    {"limit": limit},
                )
                return list(cur.fetchall())
    except psycopg.errors.UndefinedTable:
        return []
    except psycopg.Error as exc:
        logger.warning("fetch_opportunity_list_rows DB error: %s", exc)
        return []


def fetch_product_catalog_rows(
    *,
    product_class: str | None = None,
    name_term: str | None = None,
    limit: int = 200,
) -> list[dict[str, Any]]:
    db_url = build_backend_database_url()
    document_series_expr = optional_column_expr(
        table_name="product_module",
        table_alias="pm",
        output_name="document_series_code",
        candidates=("document_series_code", "module_root_code", "product_root_code", "root_document_code"),
    )
    document_version_expr = optional_column_expr(
        table_name="product_module",
        table_alias="pm",
        output_name="document_version",
        candidates=("document_version", "module_version", "product_version", "version_no", "revision_no", "revision"),
    )
    latest_version_expr = optional_column_expr(
        table_name="product_module",
        table_alias="pm",
        output_name="is_latest_version",
        candidates=("is_latest_version", "latest_version", "is_current_version"),
        cast_type="boolean",
    )
    try:
        with psycopg.connect(db_url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                if name_term:
                    cur.execute(
                        """
                        SELECT pm.id, pm.product_class, pm.product_group, pm.product_name,
                               pm.license_standard, pm.license_unit, pm.unit_price,
                               """
                        + document_series_expr
                        + ", "
                        + document_version_expr
                        + ", "
                        + latest_version_expr
                        + """
                        FROM public.product_module
                        AS pm
                        WHERE pm.deleted = false
                          AND (pm.product_name ILIKE %(term)s OR pm.product_group ILIKE %(term)s)
                        ORDER BY pm.product_class, pm.product_group, pm.product_name
                        LIMIT %(limit)s
                        """,
                        {"term": f"%{name_term}%", "limit": limit},
                    )
                elif product_class:
                    cur.execute(
                        """
                        SELECT pm.id, pm.product_class, pm.product_group, pm.product_name,
                               pm.license_standard, pm.license_unit, pm.unit_price,
                               """
                        + document_series_expr
                        + ", "
                        + document_version_expr
                        + ", "
                        + latest_version_expr
                        + """
                        FROM public.product_module
                        AS pm
                        WHERE pm.deleted = false AND pm.product_class = %(product_class)s
                        ORDER BY pm.product_class, pm.product_group, pm.product_name
                        LIMIT %(limit)s
                        """,
                        {"product_class": product_class, "limit": limit},
                    )
                else:
                    cur.execute(
                        """
                        SELECT pm.id, pm.product_class, pm.product_group, pm.product_name,
                               pm.license_standard, pm.license_unit, pm.unit_price,
                               """
                        + document_series_expr
                        + ", "
                        + document_version_expr
                        + ", "
                        + latest_version_expr
                        + """
                        FROM public.product_module
                        AS pm
                        WHERE pm.deleted = false
                        ORDER BY pm.product_class, pm.product_group, pm.product_name
                        LIMIT %(limit)s
                        """,
                        {"limit": limit},
                    )
                return list(cur.fetchall())
    except psycopg.Error as exc:
        logger.warning("fetch_product_catalog_rows DB error: %s", exc)
        return []


def fetch_module_quotation_revenue_rows(
    *,
    product_class: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    db_url = build_backend_database_url()
    try:
        with psycopg.connect(db_url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                if product_class:
                    cur.execute(
                        """
                        SELECT
                            pm.product_class,
                            pm.product_group,
                            pm.product_name,
                            SUM(qi.quantity) AS total_quantity,
                            SUM(qi.supply_total_price) AS total_supply_price,
                            COUNT(DISTINCT qi.quotation_id) AS quotation_count
                        FROM public.quotation_solution_item qi
                        JOIN public.product_module pm ON pm.id = qi.product_module_id
                        WHERE qi.deleted = false AND pm.deleted = false
                          AND pm.product_class = %(product_class)s
                        GROUP BY pm.product_class, pm.product_group, pm.product_name
                        ORDER BY total_supply_price DESC NULLS LAST
                        LIMIT %(limit)s
                        """,
                        {"product_class": product_class, "limit": limit},
                    )
                else:
                    cur.execute(
                        """
                        SELECT
                            pm.product_class,
                            pm.product_group,
                            pm.product_name,
                            SUM(qi.quantity) AS total_quantity,
                            SUM(qi.supply_total_price) AS total_supply_price,
                            COUNT(DISTINCT qi.quotation_id) AS quotation_count
                        FROM public.quotation_solution_item qi
                        JOIN public.product_module pm ON pm.id = qi.product_module_id
                        WHERE qi.deleted = false AND pm.deleted = false
                        GROUP BY pm.product_class, pm.product_group, pm.product_name
                        ORDER BY total_supply_price DESC NULLS LAST
                        LIMIT %(limit)s
                        """,
                        {"limit": limit},
                    )
                return list(cur.fetchall())
    except psycopg.Error as exc:
        logger.warning("fetch_module_quotation_revenue_rows DB error: %s", exc)
        return []


def fetch_rfp_to_won_conversion() -> dict[str, Any] | None:
    """RFP 분석 완료한 사업기회 중 수주된 사업의 비율."""
    db_url = build_backend_database_url()
    try:
        with psycopg.connect(db_url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        COUNT(DISTINCT r.project_opportunity_id) AS rfp_count,
                        COUNT(DISTINCT CASE WHEN o.stage IN ('CONTRACT','PROJECT','MAINTENANCE','POST_SALES') THEN o.id END) AS won_count
                    FROM public.rfp_analyze_result r
                    JOIN public.project_opportunity o ON o.id = r.project_opportunity_id
                    WHERE COALESCE(r.deleted, false) = false
                      AND COALESCE(o.deleted, false) = false
                    """
                )
                return cur.fetchone()
    except psycopg.Error as exc:
        logger.warning("fetch_rfp_to_won_conversion DB error: %s", exc)
        return None


def fetch_quarterly_won_trend(years_back: int = 2) -> list[dict[str, Any]]:
    """최근 N년간 분기별 수주(WIN) 사업기회 + 계약 합계 집계."""
    db_url = build_backend_database_url()
    try:
        with psycopg.connect(db_url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        EXTRACT(YEAR FROM wr.contract_date)::int AS year,
                        EXTRACT(QUARTER FROM wr.contract_date)::int AS quarter,
                        COUNT(DISTINCT o.id) AS won_count,
                        COALESCE(SUM(wr.total_amount), 0) AS contract_total
                    FROM public.project_opportunity o
                    JOIN public.order_report wr ON wr.project_opportunity_id = o.id
                    WHERE COALESCE(o.deleted, false) = false
                      AND COALESCE(wr.deleted, false) = false
                      AND wr.contract_date IS NOT NULL
                      AND wr.contract_date >= (CURRENT_DATE - INTERVAL '%(years)s years')
                    GROUP BY EXTRACT(YEAR FROM wr.contract_date),
                             EXTRACT(QUARTER FROM wr.contract_date)
                    ORDER BY year, quarter
                    """,
                    {"years": years_back},
                )
                return list(cur.fetchall())
    except psycopg.Error as exc:
        logger.warning("fetch_quarterly_won_trend DB error: %s", exc)
        return []


def fetch_segment_aggregate(segment: str = "sector") -> dict[str, Any] | None:
    """공공/민간 등 고객사 segment 별 사업기회 + 수주 집계.

    segment: 'sector' (PUBLIC/PRIVATE) — company.sector 기준
    """
    if segment != "sector":
        return None
    db_url = build_backend_database_url()
    try:
        with psycopg.connect(db_url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        c.sector AS sector,
                        COUNT(DISTINCT o.id) AS opportunity_count,
                        COUNT(DISTINCT wr.id) AS order_count,
                        COALESCE(SUM(wr.total_amount), 0) AS contract_total,
                        COUNT(DISTINCT CASE WHEN o.stage IN ('CONTRACT','PROJECT','MAINTENANCE','POST_SALES') THEN o.id END) AS won_count
                    FROM public.project_opportunity o
                    JOIN public.company c ON c.id = o.customer_company_id
                    LEFT JOIN public.order_report wr ON wr.project_opportunity_id = o.id AND COALESCE(wr.deleted, false) = false
                    WHERE COALESCE(o.deleted, false) = false
                    GROUP BY c.sector
                    ORDER BY c.sector
                    """
                )
                return {"by_sector": list(cur.fetchall())}
    except psycopg.Error as exc:
        logger.warning("fetch_segment_aggregate DB error: %s", exc)
        return None


def fetch_won_with_outstanding_billing(limit: int = 50) -> list[dict[str, Any]]:
    """수주 완료된 사업기회 중 미수금(ISSUED)이 있는 건 — cross-domain join.

    각 사업기회별 미수금 합계 + 청구 건수 + 수주 일자 반환.
    """
    db_url = build_backend_database_url()
    try:
        with psycopg.connect(db_url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        o.opportunity_code,
                        o.opportunity_name,
                        c.name AS customer_name,
                        wr.contract_date,
                        wr.total_amount AS contract_amount,
                        COUNT(b.*) FILTER (WHERE b.status = 'ISSUED') AS outstanding_count,
                        COALESCE(SUM(b.billing_amount) FILTER (WHERE b.status = 'ISSUED'), 0) AS outstanding_total,
                        COALESCE(SUM(b.billing_amount) FILTER (WHERE b.status = 'COLLECTED'), 0) AS collected_total,
                        COUNT(b.*) AS billing_total_count
                    FROM public.project_opportunity o
                    JOIN public.company c ON c.id = o.customer_company_id
                    JOIN public.order_report wr ON wr.project_opportunity_id = o.id
                    JOIN public.billing b ON b.order_report_id = wr.id
                    WHERE COALESCE(o.deleted, false) = false
                      AND COALESCE(wr.deleted, false) = false
                      AND COALESCE(b.deleted, false) = false
                    GROUP BY o.opportunity_code, o.opportunity_name, c.name,
                             wr.contract_date, wr.total_amount
                    HAVING COUNT(b.*) FILTER (WHERE b.status = 'ISSUED') > 0
                    ORDER BY outstanding_total DESC NULLS LAST
                    LIMIT %(limit)s
                    """,
                    {"limit": limit},
                )
                return list(cur.fetchall())
    except psycopg.errors.UndefinedTable:
        return []
    except psycopg.Error as exc:
        logger.warning("fetch_won_with_outstanding_billing DB error: %s", exc)
        return []


def fetch_billing_rows(
    *,
    opportunity_code: str | None = None,
    customer_name_term: str | None = None,
    start_at: str | None = None,
    end_at: str | None = None,
    statuses: list[str] | None = None,
    min_amount: int | None = None,
    max_amount: int | None = None,
    limit: int = 200,
) -> list[dict[str, Any]]:
    """청구(세금계산서) 목록 조회. opportunity_code 또는 고객사명 부분 일치로 필터링.

    start_at/end_at: requested_issue_date 기준 시간 범위 (ISO 문자열).
    statuses: ["REQUESTED","APPROVED","ISSUED","COLLECTED"] subset.
    min_amount/max_amount: billing_amount 범위 필터 (원 단위).
    """
    opp_fk_expr = project_opportunity_fk_value_expr(table_name="order_report", table_alias="wr")
    customer_fk_expr = _first_existing_column_expr(
        table_name="order_report",
        table_alias="wr",
        candidates=("final_customer_company_id", "customer_company_id"),
    )
    customer_name_expr = company_name_select_expr(table_alias="c")

    where_clauses = ["b.deleted = false"]
    params: dict[str, Any] = {"limit": limit}

    if opportunity_code:
        where_clauses.append("o.opportunity_code = %(opportunity_code)s")
        params["opportunity_code"] = opportunity_code

    if customer_name_term:
        cn_col = _first_existing_column_expr(
            table_name="company", table_alias="c", candidates=("company_name", "name")
        )
        where_clauses.append(f"{cn_col} ILIKE %(customer_name_term)s")
        params["customer_name_term"] = f"%{customer_name_term}%"

    if start_at:
        where_clauses.append("b.requested_issue_date >= %(start_at)s")
        params["start_at"] = start_at
    if end_at:
        where_clauses.append("b.requested_issue_date <= %(end_at)s")
        params["end_at"] = end_at

    if statuses:
        placeholders = ", ".join(f"%(status_{i})s" for i, _ in enumerate(statuses))
        where_clauses.append(f"b.status IN ({placeholders})")
        for i, s in enumerate(statuses):
            params[f"status_{i}"] = s

    if min_amount is not None:
        where_clauses.append("b.billing_amount >= %(min_amount)s")
        params["min_amount"] = min_amount
    if max_amount is not None:
        where_clauses.append("b.billing_amount <= %(max_amount)s")
        params["max_amount"] = max_amount

    where_sql = " AND ".join(where_clauses)

    try:
        with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT
                        b.id AS billing_id,
                        b.billing_amount,
                        b.status AS billing_status,
                        b.requested_issue_date,
                        b.issued_at,
                        b.collected_at,
                        b.remarks AS billing_remarks,
                        o.opportunity_code,
                        o.opportunity_name,
                        {customer_name_expr}
                    FROM {_BL} b
                    JOIN {_WR} wr ON wr.id = b.order_report_id
                    JOIN {_OPP} o ON o.id = {opp_fk_expr}
                    JOIN {_CO} c ON c.id = {customer_fk_expr}
                    WHERE {where_sql}
                    ORDER BY b.id DESC
                    LIMIT %(limit)s
                    """,
                    params,
                )
                return list(cur.fetchall())
    except psycopg.errors.UndefinedTable:
        return []
    except psycopg.Error as exc:
        logger.warning("fetch_billing_rows DB error: %s", exc)
        return []


# ──────────────────────────────────────────────────────────────────
# 사람 메타 조회 — "X 담당자/영업대표 누구?" / "활동 참석자" 등 사람-중심 질문용
# ──────────────────────────────────────────────────────────────────

def fetch_people_for_customer(*, customer_name_term: str, limit: int = 50) -> list[dict[str, Any]]:
    """고객사명 부분일치로 사업기회들 + 각 사업기회의 영업담당자(이름/이메일/부서) 조회.

    답변 빌더가 이걸로 "X 담당자/영업대표 누구?" 류 질문에 답변 가능.
    """
    customer_name_expr = company_name_select_expr()
    try:
        with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT
                        o.opportunity_code,
                        o.opportunity_name,
                        {customer_name_expr},
                        {opportunity_status_value_expr()} AS current_status,
                        u.id::text AS sales_rep_id,
                        u.name AS sales_rep_name,
                        u.email AS sales_rep_email,
                        u.phone AS sales_rep_phone,
                        u.position AS sales_rep_position,
                        d.headquarters AS sales_rep_headquarters,
                        d.team AS sales_rep_team
                    FROM {_OPP} o
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    LEFT JOIN users u ON u.id = o.sales_representative_id
                    LEFT JOIN department d ON d.id = u.department_id
                    WHERE o.deleted = false
                      AND ({customer_name_expr.split(' AS ')[0]}) ILIKE %(term)s
                    ORDER BY o.id DESC
                    LIMIT %(limit)s
                    """,
                    {"term": f"%{customer_name_term}%", "limit": limit},
                )
                return list(cur.fetchall())
    except psycopg.errors.UndefinedTable:
        return []
    except psycopg.Error as exc:
        logger.warning("fetch_people_for_customer DB error: %s", exc)
        return []


def fetch_attendees_for_opportunity(*, opportunity_code: str, limit_activities: int = 20) -> list[dict[str, Any]]:
    """사업기회의 최근 활동들과 각 활동의 참석자(자사 유저) 이름 목록.

    반환 row: activity_id, activity_datetime, activity_type, activity_purpose,
              activity_content, attendee_names (list[str])
    """
    try:
        with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT
                        s.id AS activity_id,
                        s.activity_date_time AS activity_datetime,
                        s.activity_type,
                        s.activity_purpose,
                        s.activity_content,
                        s.location,
                        s.status AS activity_status,
                        COALESCE(
                            (
                                SELECT array_agg(DISTINCT u.name ORDER BY u.name)
                                FROM sales_activity_attendee a
                                JOIN users u ON u.id = a.user_id
                                WHERE a.sales_activity_id = s.id
                                  AND COALESCE(a.deleted, false) = false
                            ),
                            ARRAY[]::varchar[]
                        ) AS attendee_names
                    FROM {_ACT} s
                    JOIN {_OPP} o ON o.id = s.project_opportunity_id
                    WHERE s.deleted = false
                      AND o.opportunity_code = %(opportunity_code)s
                    ORDER BY s.activity_date_time DESC NULLS LAST, s.id DESC
                    LIMIT %(limit)s
                    """,
                    {"opportunity_code": opportunity_code, "limit": limit_activities},
                )
                return list(cur.fetchall())
    except psycopg.errors.UndefinedTable:
        return []
    except psycopg.Error as exc:
        logger.warning("fetch_attendees_for_opportunity DB error: %s", exc)
        return []


def fetch_opportunity_people_meta(*, opportunity_code: str) -> dict[str, Any] | None:
    """단일 사업기회의 사람 메타 정보 (영업대표 + 그 부서).

    build_people_response_single_opportunity 에서 사용.
    """
    customer_name_expr = company_name_select_expr()
    try:
        with psycopg.connect(build_backend_database_url(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT
                        o.opportunity_code,
                        o.opportunity_name,
                        {customer_name_expr},
                        {opportunity_status_value_expr()} AS current_status,
                        u.id::text AS sales_rep_id,
                        u.name AS sales_rep_name,
                        u.email AS sales_rep_email,
                        u.phone AS sales_rep_phone,
                        u.position AS sales_rep_position,
                        d.headquarters AS sales_rep_headquarters,
                        d.team AS sales_rep_team
                    FROM {_OPP} o
                    JOIN {_CO} c ON c.id = o.customer_company_id
                    LEFT JOIN users u ON u.id = o.sales_representative_id
                    LEFT JOIN department d ON d.id = u.department_id
                    WHERE o.opportunity_code = %(code)s
                    LIMIT 1
                    """,
                    {"code": opportunity_code},
                )
                return cur.fetchone()
    except psycopg.errors.UndefinedTable:
        return None
    except psycopg.Error as exc:
        logger.warning("fetch_opportunity_people_meta DB error: %s", exc)
        return None
