#!/usr/bin/env python3
from __future__ import annotations

import re
from collections import defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path


SOURCE_DUMP = Path("/home/yusin/devdev/S14P31S106/db_dumps/orbis_db_full_20260504_131616.sql")
TARGET_DUMP = Path("/home/yusin/devdev/S14P31S106/db_dumps/orbis_db_testtesttt_entity_subset_20260504.sql")

BASE_COLUMNS = [
    "id",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "deleted",
    "deleted_at",
    "deleted_by",
]

NEEDED_SOURCE_TABLES = {
    "alarms",
    "attachment_files",
    "attendee_opinions",
    "bid_results",
    "billings",
    "companies",
    "company_contacts",
    "company_scores",
    "contracts",
    "customer_support_involved_users",
    "customer_supports",
    "departments",
    "dump_proposals",
    "labor_customizations",
    "license_records",
    "maintenance_contracts",
    "maintenance_quotes",
    "order_report_maintenance_amounts",
    "order_report_maintenances",
    "order_report_misc_items",
    "order_report_purchases",
    "order_report_services",
    "order_reports",
    "payment_collections",
    "permission_policies",
    "prb_general_overhead_expense",
    "prb_personnel_expense",
    "prb_purchase_human_resource",
    "prb_purchase_product",
    "prb_results",
    "prbs",
    "product_modules",
    "project_opportunities",
    "project_opportunity_partners",
    "project_opportunity_product_modules",
    "project_result_reports",
    "projects",
    "quote_solution_packages",
    "quotes",
    "rfp_analysis_results",
    "sales_activity",
    "sales_activity_attendee",
    "sales_activity_requests",
    "users",
    "workflow",
}

OUTPUT_ORDER = [
    "department",
    "users",
    "company",
    "company_manager",
    "upload_file",
    "project_opportunity",
    "proposal",
    "product_module",
    "project_opportunity_partner_company",
    "project_opportunity_product_module",
    "sales_activity",
    "sales_activity_attendee",
    "sales_activity_request",
    "quotation",
    "quotation_solution_item",
    "quotation_labor_item",
    "rfp_analyze_result",
    "prb",
    "prb_personnel_expense",
    "prb_purchase_human_resource",
    "prb_purchase_product",
    "prb_general_overhead_expense",
    "prb_result",
    "prb_result_attendee_opinion",
    "bid_result",
    "bid_result_competitor_score",
    "order_report",
    "order_report_maintenance",
    "order_report_maintenance_amount",
    "order_report_purchase",
    "order_report_service",
    "order_report_other",
    "contract",
    "license",
    "project",
    "project_result_report",
    "maintenance",
    "maintenance_quotation",
    "customer_support",
    "customer_support_other_department_user",
    "billing",
    "collection",
    "permission",
    "alarm",
    "workflow",
]

SEQUENCE_TABLES = [
    "department",
    "company",
    "company_manager",
    "upload_file",
    "project_opportunity",
    "proposal",
    "product_module",
    "project_opportunity_partner_company",
    "project_opportunity_product_module",
    "sales_activity",
    "sales_activity_attendee",
    "sales_activity_request",
    "quotation",
    "quotation_solution_item",
    "quotation_labor_item",
    "rfp_analyze_result",
    "prb",
    "prb_result",
    "bid_result",
    "order_report",
    "order_report_maintenance",
    "order_report_maintenance_amount",
    "order_report_purchase",
    "order_report_service",
    "order_report_other",
    "contract",
    "license",
    "project",
    "project_result_report",
    "maintenance",
    "maintenance_quotation",
    "customer_support",
    "customer_support_other_department_user",
    "billing",
    "collection",
    "permission",
    "alarm",
    "workflow",
]


def parse_copy_tables(path: Path, needed_tables: set[str]) -> dict[str, list[dict[str, str]]]:
    copy_pattern = re.compile(r"^COPY public\.([^( ]+) \((.+)\) FROM stdin;$")
    tables: dict[str, list[dict[str, str]]] = {}
    current_table: str | None = None
    current_columns: list[str] = []
    current_rows: list[dict[str, str]] = []

    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for raw_line in handle:
            line = raw_line.rstrip("\n")
            if current_table is None:
                if not line.startswith("COPY public."):
                    continue
                match = copy_pattern.match(line)
                if not match:
                    continue
                table_name = match.group(1)
                if table_name not in needed_tables:
                    continue
                current_table = table_name
                current_columns = [column.strip().strip('"') for column in match.group(2).split(",")]
                current_rows = []
                continue

            if line == r"\.":
                tables[current_table] = current_rows
                current_table = None
                current_columns = []
                current_rows = []
                continue

            values = line.split("\t")
            current_rows.append(dict(zip(current_columns, values)))

    return tables


def raw(value: str | None) -> str | None:
    if value in (None, r"\N"):
        return None
    return value


def as_int(value: str | None) -> int | None:
    if raw(value) is None:
        return None
    try:
        return int(value)
    except ValueError:
        try:
            return int(Decimal(value))
        except (InvalidOperation, ValueError):
            return None


def as_float(value: str | None) -> float | None:
    if raw(value) is None:
        return None
    return float(value)


def escape_copy(value: object | None) -> str:
    if value is None:
        return r"\N"
    if isinstance(value, bool):
        return "t" if value else "f"
    text = str(value)
    text = text.replace("\\", "\\\\")
    text = text.replace("\t", "\\t")
    text = text.replace("\r", "\\r")
    text = text.replace("\n", "\\n")
    return text


def build_base(row: dict[str, str]) -> dict[str, object | None]:
    return {
        "id": raw(row.get("id")),
        "created_at": raw(row.get("created_at")) or raw(row.get("updated_at")),
        "updated_at": raw(row.get("updated_at")) or raw(row.get("created_at")),
        "created_by": raw(row.get("created_by")),
        "updated_by": raw(row.get("updated_by")),
        "deleted": False,
        "deleted_at": None,
        "deleted_by": None,
    }


def fk_or_none(value: str | None, valid_ids: set[str]) -> str | None:
    normalized = raw(value)
    if normalized is None or normalized not in valid_ids:
        return None
    return normalized


def map_product_class(product_type: str | None, product_name: str | None) -> str:
    type_value = raw(product_type) or ""
    name_value = raw(product_name) or ""
    if type_value == "EMS":
        return "EMS"
    if type_value == "ITSM":
        if "ITAM" in name_value.upper():
            return "ITAM"
        return "ITSM"
    if type_value == "CloudOps":
        return "CLOUD"
    if type_value == "AIOps":
        if "대시보드" in name_value or "리포트" in name_value:
            return "DASHBOARD"
        return "BSM"
    return "SUPPORTING_TOOLS"


def map_labor_type(detail_item: str | None) -> str:
    value = raw(detail_item) or ""
    if "설계" in value or "현황분석" in value:
        return "HIGH"
    if "구축" in value or "이행" in value:
        return "MIDDLE"
    if "안정화" in value or "교육" in value:
        return "LOW"
    if "제경비" in value:
        return "EXPENSE"
    if "기술료" in value:
        return "TECH_FEE"
    return "MIDDLE"


def map_request_activity_purpose(
    request_type: str | None,
    sales_activity_id: str | None,
    sales_activities_by_id: dict[str, dict[str, str]],
) -> str:
    value = raw(request_type) or ""
    if "RFP" in value.upper():
        return "RFP_ANALYSIS"
    if "데모" in value:
        return "DEMO"
    if "미팅" in value or "현장" in value:
        return "CONSULTING"
    activity_id = raw(sales_activity_id)
    if activity_id and activity_id in sales_activities_by_id:
        return raw(sales_activities_by_id[activity_id].get("activity_purpose")) or "ETC"
    return "ETC"


def max_numeric_id(rows: list[dict[str, object | None]]) -> int:
    max_id = 0
    for row in rows:
        current = row.get("id")
        if current is None:
            continue
        max_id = max(max_id, int(str(current)))
    return max_id


def append_row(store: dict[str, list[dict[str, object | None]]], table: str, row: dict[str, object | None]) -> None:
    store[table].append(row)


def main() -> None:
    source = parse_copy_tables(SOURCE_DUMP, NEEDED_SOURCE_TABLES)
    out: dict[str, list[dict[str, object | None]]] = defaultdict(list)

    departments = source.get("departments", [])
    users = source.get("users", [])
    companies = source.get("companies", [])
    company_contacts = source.get("company_contacts", [])
    attachment_files = source.get("attachment_files", [])
    opportunities = source.get("project_opportunities", [])
    proposals = source.get("dump_proposals", [])
    product_modules = source.get("product_modules", [])
    opportunity_partners = source.get("project_opportunity_partners", [])
    opportunity_product_modules = source.get("project_opportunity_product_modules", [])
    sales_activities = source.get("sales_activity", [])
    sales_activity_attendees = source.get("sales_activity_attendee", [])
    sales_activity_requests = source.get("sales_activity_requests", [])
    quotes = source.get("quotes", [])
    quote_solution_packages = source.get("quote_solution_packages", [])
    labor_customizations = source.get("labor_customizations", [])
    rfp_results = source.get("rfp_analysis_results", [])
    prbs = source.get("prbs", [])
    prb_personnel = source.get("prb_personnel_expense", [])
    prb_purchase_hr = source.get("prb_purchase_human_resource", [])
    prb_purchase_product = source.get("prb_purchase_product", [])
    prb_overhead = source.get("prb_general_overhead_expense", [])
    prb_results = source.get("prb_results", [])
    attendee_opinions = source.get("attendee_opinions", [])
    bid_results = source.get("bid_results", [])
    company_scores = source.get("company_scores", [])
    order_reports = source.get("order_reports", [])
    order_report_maintenances = source.get("order_report_maintenances", [])
    order_report_maintenance_amounts = source.get("order_report_maintenance_amounts", [])
    order_report_purchases = source.get("order_report_purchases", [])
    order_report_services = source.get("order_report_services", [])
    order_report_misc_items = source.get("order_report_misc_items", [])
    contracts = source.get("contracts", [])
    license_records = source.get("license_records", [])
    projects = source.get("projects", [])
    project_result_reports = source.get("project_result_reports", [])
    maintenance_contracts = source.get("maintenance_contracts", [])
    maintenance_quotes = source.get("maintenance_quotes", [])
    customer_supports = source.get("customer_supports", [])
    customer_support_users = source.get("customer_support_involved_users", [])
    billings = source.get("billings", [])
    collections = source.get("payment_collections", [])
    permissions = source.get("permission_policies", [])
    alarms = source.get("alarms", [])
    workflows = source.get("workflow", [])

    users_by_id = {row["id"]: row for row in users}
    users_by_name: dict[str, list[str]] = defaultdict(list)
    for row in users:
        name = raw(row.get("name"))
        if name:
            users_by_name[name].append(row["id"])

    departments_ids = {row["id"] for row in departments}
    company_ids = {row["id"] for row in companies}
    attachment_ids = {row["id"] for row in attachment_files}
    opportunity_ids = {row["id"] for row in opportunities}
    product_module_source_by_id = {row["id"]: row for row in product_modules}
    product_module_ids = set(product_module_source_by_id)
    sales_activity_by_id = {row["id"]: row for row in sales_activities}
    prb_ids = {row["id"] for row in prbs}
    bid_results_by_id = {row["id"]: row for row in bid_results}
    order_report_ids = {row["id"] for row in order_reports}
    project_ids = {row["id"] for row in projects}
    billing_ids = {row["id"] for row in billings}
    maintenance_ids = {row["id"] for row in maintenance_contracts}

    for row in departments:
        append_row(out, "department", build_base(row))

    for row in users:
        base = build_base(row)
        base.update(
            {
                "employee_number": raw(row.get("employee_number")) or f"EMP-{row['id']}",
                "position": raw(row.get("position")) or "STAFF",
                "name": raw(row.get("name")) or f"User-{row['id']}",
                "phone": raw(row.get("phone")),
                "email": raw(row.get("email")) or f"user-{row['id']}@example.local",
                "password": raw(row.get("password")) or "temporary-password",
                "role": raw(row.get("role")) or "USER",
                "status": raw(row.get("status")) or "ACTIVE",
                "department_id": fk_or_none(row.get("department_id"), departments_ids),
            }
        )
        append_row(out, "users", base)

    user_ids = {row["id"] for row in out["users"] if row.get("id")}

    partner_company_ids = {
        raw(row.get("company_id"))
        for row in opportunity_partners
        if raw(row.get("company_id")) is not None
    }
    for row in companies:
        base = build_base(row)
        company_type = raw(row.get("company_type"))
        if company_type is None:
            company_type = "PARTNER" if row["id"] in partner_company_ids else "CUSTOMER"
        base.update({"company_type": company_type})
        append_row(out, "company", base)

    company_ids = {row["id"] for row in out["company"] if row.get("id")}

    for row in company_contacts:
        base = build_base(row)
        company_id = fk_or_none(row.get("company_id"), company_ids)
        if company_id is None:
            continue
        base.update({"company_id": company_id})
        append_row(out, "company_manager", base)

    company_manager_ids = {row["id"] for row in out["company_manager"] if row.get("id")}

    for row in attachment_files:
        append_row(out, "upload_file", build_base(row))

    attachment_ids = {row["id"] for row in out["upload_file"] if row.get("id")}

    for row in opportunities:
        base = build_base(row)
        base.update({"customer_company_id": fk_or_none(row.get("customer_company_id"), company_ids)})
        append_row(out, "project_opportunity", base)

    opportunity_ids = {row["id"] for row in out["project_opportunity"] if row.get("id")}

    for row in proposals:
        append_row(out, "proposal", build_base(row))

    for row in product_modules:
        base = build_base(row)
        product_type = raw(row.get("product_type"))
        product_name = raw(row.get("product_name")) or f"MODULE-{row['id']}"
        base.update(
            {
                "product_class": map_product_class(product_type, product_name),
                "product_group": product_type or "UNKNOWN",
                "product_name": product_name,
                "license_standard": None,
                "license_unit": None,
                "unit_price": as_int(row.get("list_price")) or 0,
            }
        )
        append_row(out, "product_module", base)

    product_module_ids = {row["id"] for row in out["product_module"] if row.get("id")}

    for row in opportunity_partners:
        base = build_base(row)
        project_opportunity_id = fk_or_none(row.get("project_opportunity_id"), opportunity_ids)
        company_id = fk_or_none(row.get("company_id"), company_ids)
        if project_opportunity_id is None or company_id is None:
            continue
        base.update({"project_opportunity_id": project_opportunity_id, "company_id": company_id})
        append_row(out, "project_opportunity_partner_company", base)

    for row in opportunity_product_modules:
        base = build_base(row)
        project_opportunity_id = fk_or_none(row.get("project_opportunity_id"), opportunity_ids)
        product_module_id = fk_or_none(row.get("product_module_id"), product_module_ids)
        if project_opportunity_id is None or product_module_id is None:
            continue
        base.update({"project_opportunity_id": project_opportunity_id, "product_module_id": product_module_id})
        append_row(out, "project_opportunity_product_module", base)

    for row in sales_activities:
        base = build_base(row)
        base.update(
            {
                "project_opportunity_id": fk_or_none(row.get("project_opportunity_id"), opportunity_ids),
                "activity_type": raw(row.get("activity_type")) or "ETC",
                "activity_purpose": raw(row.get("activity_purpose")) or "ETC",
                "activity_content": raw(row.get("activity_content")),
                "location": raw(row.get("location")),
                "activity_date_time": raw(row.get("activity_date_time")),
                "issue": raw(row.get("issue")),
                "next_activity": raw(row.get("next_activity")),
                "customer_interest": raw(row.get("customer_interest")),
                "status": raw(row.get("status")) or "PLANNED",
            }
        )
        append_row(out, "sales_activity", base)

    sales_activity_ids = {row["id"] for row in out["sales_activity"] if row.get("id")}

    for row in sales_activity_attendees:
        base = build_base(row)
        sales_activity_id = fk_or_none(row.get("sales_activity_id"), sales_activity_ids)
        user_id = fk_or_none(row.get("user_id"), user_ids)
        if sales_activity_id is None or user_id is None:
            continue
        base.update({"sales_activity_id": sales_activity_id, "user_id": user_id})
        append_row(out, "sales_activity_attendee", base)

    first_user_id = sorted(user_ids)[0] if user_ids else None
    for row in sales_activity_requests:
        base = build_base(row)
        target_user_id = None
        receiver_name = raw(row.get("receiver_name"))
        if receiver_name and users_by_name.get(receiver_name):
            target_user_id = users_by_name[receiver_name][0]
        if target_user_id is None:
            target_user_id = fk_or_none(row.get("request_user_id"), user_ids)
        if target_user_id is None:
            target_user_id = first_user_id
        sales_activity_id = fk_or_none(row.get("sales_activity_id"), sales_activity_ids)
        if target_user_id is None:
            continue
        base.update(
            {
                "sales_activity_id": sales_activity_id,
                "target_user_id": target_user_id,
                "activity_purpose": map_request_activity_purpose(
                    row.get("request_type"),
                    row.get("sales_activity_id"),
                    sales_activity_by_id,
                ),
                "activity_date_time": raw(row.get("activity_due_date")) or raw(row.get("request_date")),
                "request_content": raw(row.get("request_content")),
            }
        )
        append_row(out, "sales_activity_request", base)

    quote_solution_rows: list[dict[str, object | None]] = []
    quote_labor_rows: list[dict[str, object | None]] = []
    quote_totals: dict[str, dict[str, int]] = defaultdict(
        lambda: {"consumer_total_price": 0, "supply_total_price": 0, "labor_total_price": 0}
    )

    for row in quote_solution_packages:
        base = build_base(row)
        quotation_id = fk_or_none(row.get("quotation_id"), {quote["id"] for quote in quotes})
        product_module_id = fk_or_none(row.get("product_module_id"), product_module_ids)
        if quotation_id is None or product_module_id is None:
            continue
        product = product_module_source_by_id[product_module_id]
        quantity = as_int(row.get("quantity")) or 1
        consumer_price = as_int(product.get("list_price")) or 0
        consumer_total_price = consumer_price * quantity
        supply_price = as_int(row.get("supply_price")) or 0
        free_supply = raw(row.get("is_free_supply")) == "t"
        supply_total_price = 0 if free_supply else supply_price * quantity
        discount_rate = as_float(row.get("discount_rate"))
        discount_rate_value = 0.0 if discount_rate is None else discount_rate
        base.update(
            {
                "quotation_id": quotation_id,
                "product_module_id": product_module_id,
                "quantity": quantity,
                "consumer_price": consumer_price,
                "consumer_total_price": consumer_total_price,
                "supply_price": supply_price,
                "supply_total_price": supply_total_price,
                "discount_rate": discount_rate_value,
                "free_supply": free_supply,
            }
        )
        quote_solution_rows.append(base)
        quote_totals[quotation_id]["consumer_total_price"] += consumer_total_price
        quote_totals[quotation_id]["supply_total_price"] += supply_total_price

    for row in labor_customizations:
        base = build_base(row)
        quotation_id = fk_or_none(row.get("quotation_id"), {quote["id"] for quote in quotes})
        if quotation_id is None:
            continue
        labor_type = map_labor_type(row.get("detail_item"))
        unit_price = as_int(row.get("labor_unit_price"))
        man_month = as_float(row.get("man_month"))
        supply_price = as_int(row.get("supply_amount")) or 0
        if labor_type not in {"EXPENSE", "TECH_FEE"} and unit_price is not None and man_month is not None:
            supply_price = int(unit_price * man_month)
        base.update(
            {
                "quotation_id": quotation_id,
                "labor_type": labor_type,
                "unit_price": None if labor_type in {"EXPENSE", "TECH_FEE"} else (unit_price or 0),
                "man_month": None if labor_type in {"EXPENSE", "TECH_FEE"} else man_month,
                "supply_price": supply_price,
            }
        )
        quote_labor_rows.append(base)
        quote_totals[quotation_id]["labor_total_price"] += supply_price

    for row in quotes:
        base = build_base(row)
        quotation_id = raw(row.get("id"))
        if quotation_id is None:
            continue
        totals = quote_totals[quotation_id]
        consumer_total_price = totals["consumer_total_price"]
        supply_total_price = as_int(row.get("solution_package_total_amount")) or totals["supply_total_price"]
        labor_total_price = as_int(row.get("labor_customization_total_amount")) or totals["labor_total_price"]
        total_price = as_int(row.get("total_amount")) or (supply_total_price + labor_total_price)
        base.update(
            {
                "quotation_code": raw(row.get("quote_code")) or f"QUOTE-{quotation_id}",
                "project_opportunity_id": fk_or_none(row.get("project_opportunity_id"), opportunity_ids),
                "quotation_date": raw(row.get("quote_date")),
                "payment_condition": raw(row.get("payment_terms")),
                "consumer_total_price": consumer_total_price,
                "supply_total_price": supply_total_price,
                "labor_total_price": labor_total_price,
                "total_price": total_price,
                "note": raw(row.get("special_notes")),
            }
        )
        append_row(out, "quotation", base)

    quotation_ids = {row["id"] for row in out["quotation"] if row.get("id")}
    for row in quote_solution_rows:
        if row["quotation_id"] in quotation_ids:
            append_row(out, "quotation_solution_item", row)
    for row in quote_labor_rows:
        if row["quotation_id"] in quotation_ids:
            append_row(out, "quotation_labor_item", row)

    for row in rfp_results:
        base = build_base(row)
        base.update({"project_opportunity_id": fk_or_none(row.get("project_opportunity_id"), opportunity_ids)})
        append_row(out, "rfp_analyze_result", base)

    for row in prbs:
        base = build_base(row)
        base.update(
            {
                "project_opportunity_id": fk_or_none(row.get("project_opportunity_id"), opportunity_ids),
                "sales_representative_id": fk_or_none(row.get("sales_representative_id"), user_ids),
            }
        )
        append_row(out, "prb", base)

    prb_ids = {row["id"] for row in out["prb"] if row.get("id")}

    for row in prb_personnel:
        prb_id = fk_or_none(row.get("prb_id"), prb_ids)
        if prb_id is None:
            continue
        append_row(out, "prb_personnel_expense", {"prb_id": prb_id, "price": as_int(row.get("amount")) or 0})

    for row in prb_purchase_hr:
        prb_id = fk_or_none(row.get("prb_id"), prb_ids)
        if prb_id is None:
            continue
        append_row(out, "prb_purchase_human_resource", {"prb_id": prb_id, "price": as_int(row.get("amount")) or 0})

    for row in prb_purchase_product:
        prb_id = fk_or_none(row.get("prb_id"), prb_ids)
        if prb_id is None:
            continue
        append_row(out, "prb_purchase_product", {"prb_id": prb_id, "price": as_int(row.get("amount")) or 0})

    for row in prb_overhead:
        prb_id = fk_or_none(row.get("prb_id"), prb_ids)
        if prb_id is None:
            continue
        append_row(out, "prb_general_overhead_expense", {"prb_id": prb_id, "price": as_int(row.get("amount")) or 0})

    for row in prb_results:
        base = build_base(row)
        prb_id = fk_or_none(row.get("prb_id"), prb_ids)
        if prb_id is None:
            continue
        base.update({"prb_id": prb_id})
        append_row(out, "prb_result", base)

    prb_result_ids = {row["id"] for row in out["prb_result"] if row.get("id")}
    for row in attendee_opinions:
        prb_result_id = fk_or_none(row.get("prb_result_id"), prb_result_ids)
        opinion = raw(row.get("opinion"))
        if prb_result_id is None or opinion is None:
            continue
        append_row(out, "prb_result_attendee_opinion", {"prb_result_id": prb_result_id, "opinion": opinion})

    for row in bid_results:
        base = build_base(row)
        project_opportunity_id = fk_or_none(row.get("project_opportunity_id"), opportunity_ids)
        if project_opportunity_id is None:
            continue
        sum_score = as_int(row.get("our_total_score"))
        if sum_score is None:
            price_score = as_int(row.get("our_price_score")) or 0
            technical_score = as_int(row.get("our_technical_score")) or 0
            sum_score = price_score + technical_score
        base.update({"project_opportunity_id": project_opportunity_id, "sum_score": sum_score})
        append_row(out, "bid_result", base)

    bid_result_ids = {row["id"] for row in out["bid_result"] if row.get("id")}
    for row in company_scores:
        bid_result_id = fk_or_none(row.get("bid_result_id"), bid_result_ids)
        if bid_result_id is None:
            continue
        bid_result = bid_results_by_id.get(bid_result_id)
        if bid_result and raw(row.get("company_id")) == raw(bid_result.get("our_company_id")):
            continue
        append_row(
            out,
            "bid_result_competitor_score",
            {"bid_result_id": bid_result_id, "sum_score": as_int(row.get("total_score")) or 0},
        )

    for row in order_reports:
        base = build_base(row)
        base.update(
            {
                "project_opportunity_id": fk_or_none(row.get("project_opportunity_id"), opportunity_ids),
                "pm_user_id": fk_or_none(row.get("pm_user_id"), user_ids),
                "contract_counterpart_manager_id": fk_or_none(
                    row.get("contract_counterparty_contact_id"),
                    company_manager_ids,
                ),
                "final_customer_company_id": fk_or_none(row.get("final_customer_company_id"), company_ids),
                "final_customer_manager_id": fk_or_none(row.get("final_customer_contact_id"), company_manager_ids),
            }
        )
        append_row(out, "order_report", base)

    order_report_ids = {row["id"] for row in out["order_report"] if row.get("id")}

    for row in order_report_maintenances:
        base = build_base(row)
        order_report_id = fk_or_none(row.get("order_report_id"), order_report_ids)
        if order_report_id is None:
            continue
        base.update({"order_report_id": order_report_id})
        append_row(out, "order_report_maintenance", base)

    for row in order_report_maintenance_amounts:
        base = build_base(row)
        order_report_id = fk_or_none(row.get("order_report_id"), order_report_ids)
        if order_report_id is None:
            continue
        base.update({"order_report_id": order_report_id})
        append_row(out, "order_report_maintenance_amount", base)

    for row in order_report_purchases:
        base = build_base(row)
        order_report_id = fk_or_none(row.get("order_report_id"), order_report_ids)
        if order_report_id is None:
            continue
        base.update({"order_report_id": order_report_id})
        append_row(out, "order_report_purchase", base)

    for row in order_report_services:
        base = build_base(row)
        order_report_id = fk_or_none(row.get("order_report_id"), order_report_ids)
        if order_report_id is None:
            continue
        base.update({"order_report_id": order_report_id})
        append_row(out, "order_report_service", base)

    for row in order_report_misc_items:
        base = build_base(row)
        order_report_id = fk_or_none(row.get("order_report_id"), order_report_ids)
        if order_report_id is None:
            continue
        base.update({"order_report_id": order_report_id})
        append_row(out, "order_report_other", base)

    for row in contracts:
        base = build_base(row)
        order_report_id = fk_or_none(row.get("order_report_id"), order_report_ids)
        if order_report_id is None:
            continue
        base.update(
            {
                "order_report_id": order_report_id,
                "contract_file_id": fk_or_none(row.get("contract_file_id"), attachment_ids),
            }
        )
        append_row(out, "contract", base)

    for row in license_records:
        base = build_base(row)
        product_module_id = fk_or_none(row.get("product_module_id"), product_module_ids)
        order_report_id = fk_or_none(row.get("order_report_id"), order_report_ids)
        if product_module_id is None or order_report_id is None:
            continue
        base.update({"product_module_id": product_module_id, "order_report_id": order_report_id})
        append_row(out, "license", base)

    for row in projects:
        base = build_base(row)
        project_code = raw(row.get("project_code")) or "GN"
        project_type = raw(row.get("project_type")) or "SOLUTION"
        base.update(
            {
                "pjt_number": raw(row.get("pjt_number")) or f"PJT-{row['id']}",
                "type": project_type,
                "code": project_code,
                "start_date": raw(row.get("start_date")),
                "end_date": raw(row.get("end_date")),
                "order_report_id": fk_or_none(row.get("order_report_id"), order_report_ids),
                "manager_id": fk_or_none(row.get("manager_id"), user_ids),
            }
        )
        append_row(out, "project", base)

    project_ids = {row["id"] for row in out["project"] if row.get("id")}

    for row in project_result_reports:
        base = build_base(row)
        project_id = fk_or_none(row.get("project_id"), project_ids)
        if project_id is None:
            continue
        base.update(
            {
                "project_id": project_id,
                "result_report_file_id": fk_or_none(row.get("result_report_file_id"), attachment_ids),
                "manager_id": fk_or_none(row.get("manager_id"), user_ids),
            }
        )
        append_row(out, "project_result_report", base)

    for row in maintenance_contracts:
        base = build_base(row)
        project_id = fk_or_none(row.get("project_id"), project_ids)
        if project_id is None:
            continue
        base.update({"project_id": project_id})
        append_row(out, "maintenance", base)

    maintenance_ids = {row["id"] for row in out["maintenance"] if row.get("id")}

    for row in maintenance_quotes:
        base = build_base(row)
        project_id = fk_or_none(row.get("project_id"), project_ids)
        if project_id is None:
            continue
        base.update({"project_id": project_id})
        append_row(out, "maintenance_quotation", base)

    for row in customer_supports:
        base = build_base(row)
        maintenance_id = fk_or_none(row.get("maintenance_id"), maintenance_ids)
        if maintenance_id is None:
            continue
        base.update(
            {
                "maintenance_id": maintenance_id,
                "primary_manager_id": fk_or_none(row.get("primary_manager_id"), user_ids),
                "secondary_manager_id": fk_or_none(row.get("secondary_manager_id"), user_ids),
            }
        )
        append_row(out, "customer_support", base)

    customer_support_ids = {row["id"] for row in out["customer_support"] if row.get("id")}

    for row in customer_support_users:
        base = build_base(row)
        customer_support_id = fk_or_none(row.get("customer_support_id"), customer_support_ids)
        user_id = fk_or_none(row.get("user_id"), user_ids)
        if customer_support_id is None or user_id is None:
            continue
        base.update({"customer_support_id": customer_support_id, "user_id": user_id})
        append_row(out, "customer_support_other_department_user", base)

    for row in billings:
        base = build_base(row)
        project_id = fk_or_none(row.get("project_id"), project_ids)
        if project_id is None:
            continue
        base.update({"project_id": project_id})
        append_row(out, "billing", base)

    billing_ids = {row["id"] for row in out["billing"] if row.get("id")}

    for row in collections:
        base = build_base(row)
        billing_id = fk_or_none(row.get("billing_id"), billing_ids)
        if billing_id is None:
            continue
        base.update({"billing_id": billing_id})
        append_row(out, "collection", base)

    for row in permissions:
        base = build_base(row)
        department_id = fk_or_none(row.get("department_id"), departments_ids)
        if department_id is None:
            continue
        base.update({"department_id": department_id})
        append_row(out, "permission", base)

    for row in alarms:
        base = build_base(row)
        sender_id = fk_or_none(row.get("sender_id"), user_ids)
        receiver_id = fk_or_none(row.get("receiver_id"), user_ids)
        if sender_id is None and receiver_id is None:
            continue
        base.update({"sender_id": sender_id, "receiver_id": receiver_id})
        append_row(out, "alarm", base)

    for row in workflows:
        append_row(out, "workflow", build_base(row))

    table_columns = {
        "department": BASE_COLUMNS,
        "users": BASE_COLUMNS
        + ["employee_number", "position", "name", "phone", "email", "password", "role", "status", "department_id"],
        "company": BASE_COLUMNS + ["company_type"],
        "company_manager": BASE_COLUMNS + ["company_id"],
        "upload_file": BASE_COLUMNS,
        "project_opportunity": BASE_COLUMNS + ["customer_company_id"],
        "proposal": BASE_COLUMNS,
        "product_module": BASE_COLUMNS
        + ["product_class", "product_group", "product_name", "license_standard", "license_unit", "unit_price"],
        "project_opportunity_partner_company": BASE_COLUMNS + ["project_opportunity_id", "company_id"],
        "project_opportunity_product_module": BASE_COLUMNS + ["project_opportunity_id", "product_module_id"],
        "sales_activity": BASE_COLUMNS
        + [
            "project_opportunity_id",
            "activity_type",
            "activity_purpose",
            "activity_content",
            "location",
            "activity_date_time",
            "issue",
            "next_activity",
            "customer_interest",
            "status",
        ],
        "sales_activity_attendee": BASE_COLUMNS + ["sales_activity_id", "user_id"],
        "sales_activity_request": BASE_COLUMNS
        + ["sales_activity_id", "target_user_id", "activity_purpose", "activity_date_time", "request_content"],
        "quotation": BASE_COLUMNS
        + [
            "quotation_code",
            "project_opportunity_id",
            "quotation_date",
            "payment_condition",
            "consumer_total_price",
            "supply_total_price",
            "labor_total_price",
            "total_price",
            "note",
        ],
        "quotation_solution_item": BASE_COLUMNS
        + [
            "quotation_id",
            "product_module_id",
            "quantity",
            "consumer_price",
            "consumer_total_price",
            "supply_price",
            "supply_total_price",
            "discount_rate",
            "free_supply",
        ],
        "quotation_labor_item": BASE_COLUMNS + ["quotation_id", "labor_type", "unit_price", "man_month", "supply_price"],
        "rfp_analyze_result": BASE_COLUMNS + ["project_opportunity_id"],
        "prb": BASE_COLUMNS + ["project_opportunity_id", "sales_representative_id"],
        "prb_personnel_expense": ["prb_id", "price"],
        "prb_purchase_human_resource": ["prb_id", "price"],
        "prb_purchase_product": ["prb_id", "price"],
        "prb_general_overhead_expense": ["prb_id", "price"],
        "prb_result": BASE_COLUMNS + ["prb_id"],
        "prb_result_attendee_opinion": ["prb_result_id", "opinion"],
        "bid_result": BASE_COLUMNS + ["project_opportunity_id", "sum_score"],
        "bid_result_competitor_score": ["bid_result_id", "sum_score"],
        "order_report": BASE_COLUMNS
        + [
            "project_opportunity_id",
            "pm_user_id",
            "contract_counterpart_manager_id",
            "final_customer_company_id",
            "final_customer_manager_id",
        ],
        "order_report_maintenance": BASE_COLUMNS + ["order_report_id"],
        "order_report_maintenance_amount": BASE_COLUMNS + ["order_report_id"],
        "order_report_purchase": BASE_COLUMNS + ["order_report_id"],
        "order_report_service": BASE_COLUMNS + ["order_report_id"],
        "order_report_other": BASE_COLUMNS + ["order_report_id"],
        "contract": BASE_COLUMNS + ["order_report_id", "contract_file_id"],
        "license": BASE_COLUMNS + ["product_module_id", "order_report_id"],
        "project": BASE_COLUMNS + ["pjt_number", "type", "code", "start_date", "end_date", "order_report_id", "manager_id"],
        "project_result_report": BASE_COLUMNS + ["project_id", "result_report_file_id", "manager_id"],
        "maintenance": BASE_COLUMNS + ["project_id"],
        "maintenance_quotation": BASE_COLUMNS + ["project_id"],
        "customer_support": BASE_COLUMNS + ["maintenance_id", "primary_manager_id", "secondary_manager_id"],
        "customer_support_other_department_user": BASE_COLUMNS + ["customer_support_id", "user_id"],
        "billing": BASE_COLUMNS + ["project_id"],
        "collection": BASE_COLUMNS + ["billing_id"],
        "permission": BASE_COLUMNS + ["department_id"],
        "alarm": BASE_COLUMNS + ["sender_id", "receiver_id"],
        "workflow": BASE_COLUMNS,
    }

    TARGET_DUMP.parent.mkdir(parents=True, exist_ok=True)
    with TARGET_DUMP.open("w", encoding="utf-8") as handle:
        handle.write("-- Generated from orbis_db_full_20260504_131616.sql\n")
        handle.write("-- Target: /home/yusin/testtesttt/S14P31S106 entity subset only\n")
        handle.write("BEGIN;\n\n")

        for table in OUTPUT_ORDER:
            rows = out.get(table, [])
            if not rows:
                continue
            columns = table_columns[table]
            handle.write(f"COPY public.{table} ({', '.join(columns)}) FROM stdin;\n")
            for row in rows:
                handle.write("\t".join(escape_copy(row.get(column)) for column in columns))
                handle.write("\n")
            handle.write("\\.\n\n")

        for table in SEQUENCE_TABLES:
            rows = out.get(table, [])
            if not rows:
                continue
            max_id = max_numeric_id(rows)
            if max_id == 0:
                continue
            handle.write(
                "SELECT setval(pg_get_serial_sequence('public.%s', 'id'), %d, true);\n"
                % (table, max_id)
            )
        handle.write("\nCOMMIT;\n")

    print(f"written={TARGET_DUMP}")
    for table in OUTPUT_ORDER:
        if out.get(table):
            print(f"{table}={len(out[table])}")


if __name__ == "__main__":
    main()
