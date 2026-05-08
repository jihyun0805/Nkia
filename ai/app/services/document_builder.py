"""
실 엔티티 테이블 row → IndexDocumentRequest payload 변환 모듈.

index_listener.py 에서 import 해 pg_notify 이벤트를 실시간 색인할 때 사용한다.
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
import html
import re
from typing import Any

from app.models.constants import METADATA_ALIASES, SourceType


# ---------------------------------------------------------------------------
# DocumentConfig
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DocumentConfig:
    table: str
    source_type: str
    id_fields: tuple[str, ...]
    title_fields: tuple[str, ...]
    content_fields: tuple[str, ...] = ()
    source_path_fields: tuple[str, ...] = ()
    payload_aliases: dict[str, tuple[str, ...]] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# 색인 대상 테이블 설정 (reindex_orbis_data.py CURRENT_PUBLIC_CONFIGS + ALWAYS_CONFIGS 와 동일)
# ---------------------------------------------------------------------------

INDEXED_CONFIGS: tuple[DocumentConfig, ...] = (
    # ---------- 사업기회 라이프사이클 ----------
    DocumentConfig(
        table="project_opportunity",
        source_type=SourceType.PROJECT_OPPORTUNITY,
        id_fields=("opportunityCode", "opportunity_code", "id"),
        title_fields=("opportunityName", "opportunity_name", "id"),
        content_fields=(
            "current_status", "business_type", "expected_amount",
            "main_content", "issue_content", "competitor_status",
            "decision_structure", "contact_line",
        ),
        payload_aliases={
            "opportunityId": ("id",),
            "customerCompanyId": ("customer_company_id",),
            "opportunityCode": ("opportunity_code",),
            "opportunityName": ("opportunity_name",),
            "currentStatus": ("current_status",),
            "businessType": ("business_type",),
            "expectedAmount": ("expected_amount",),
        },
    ),
    DocumentConfig(
        table="sales_activity",
        source_type=SourceType.SALES_ACTIVITY,
        id_fields=("activityCode", "activity_code", "id"),
        title_fields=("activityCode", "activity_code", "activity_content", "id"),
        content_fields=("activity_type", "activity_purpose", "activity_content", "customer_interest", "issue", "next_activity"),
        payload_aliases={
            "activityAt": ("activity_date_time",),
            "activityType": ("activity_type",),
            "content": ("activity_content",),
            "opportunityId": ("project_opportunity_id",),
        },
    ),
    DocumentConfig(
        table="quotation",
        source_type=SourceType.QUOTATION,
        id_fields=("quotation_code", "quoteCode", "id"),
        title_fields=("quotation_code", "id"),
        content_fields=("payment_condition", "total_price", "note"),
        payload_aliases={
            "quoteCode": ("quotation_code",),
            "totalAmount": ("total_price",),
            "opportunityId": ("project_opportunity_id",),
        },
    ),
    DocumentConfig(
        table="rfp_analyze_result",
        source_type=SourceType.RFP_ANALYSIS,
        id_fields=("rfpAnalysisCode", "rfp_analysis_code", "id"),
        title_fields=("rfpAnalysisCode", "rfp_analysis_code", "id"),
        content_fields=(
            "issuer", "project_scope", "project_period",
            "requirements", "risk_factors", "special_notes",
            "key_requirements", "analysis_summary",
        ),
        payload_aliases={
            "opportunityId": ("project_opportunity_id",),
            "rfpAnalysisCode": ("id",),
        },
    ),
    DocumentConfig(
        table="prb",
        source_type=SourceType.PRB,
        id_fields=("prbCode", "prb_code", "id"),
        title_fields=("prbCode", "prb_code", "id"),
        content_fields=(
            "prb_date", "expected_win_rate", "estimated_revenue",
            "business_overview", "risk_factors", "competitor_status",
        ),
        payload_aliases={
            "opportunityId": ("project_opportunity_id",),
            "prbCode": ("id",),
        },
    ),
    DocumentConfig(
        table="prb_result",
        source_type=SourceType.PRB_RESULT,
        id_fields=("prbResultCode", "prb_result_code", "id"),
        title_fields=("prbResultCode", "prb_result_code", "id"),
        content_fields=("decision_status", "result_date", "risk_review", "final_opinion"),
        payload_aliases={
            "prbResultCode": ("id",),
            "prbId": ("prb_id",),
        },
    ),
    DocumentConfig(
        table="proposal",
        source_type=SourceType.PROPOSAL,
        id_fields=("proposalCode", "proposal_code", "id"),
        title_fields=("proposalName", "proposal_name", "proposalCode", "id"),
        content_fields=("proposal_summary", "strategy_summary", "key_proposal_points"),
        payload_aliases={
            "proposalCode": ("id",),
        },
    ),
    DocumentConfig(
        table="bid_result",
        source_type=SourceType.BID_RESULT,
        id_fields=("bidResultCode", "bid_result_code", "id"),
        title_fields=("bidResultCode", "bid_result_code", "id"),
        content_fields=("result_status", "result_date", "win_loss_reason", "competitor_summary"),
        payload_aliases={
            "bidResultCode": ("id",),
            "opportunityId": ("project_opportunity_id",),
        },
    ),
    DocumentConfig(
        table="order_report",
        source_type=SourceType.ORDER_REPORT,
        id_fields=("wonReportCode", "won_report_code", "id"),
        title_fields=("wonReportCode", "won_report_code", "id"),
        content_fields=("contract_date", "contract_amount", "business_scope", "special_notes"),
        payload_aliases={
            "wonReportCode": ("id",),
            "opportunityId": ("project_opportunity_id",),
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
        title_fields=("ref_no", "maintenanceQuoteCode", "id"),
        content_fields=("ref_no", "quotation_date", "payment_terms", "total_amount", "special_notes"),
        payload_aliases={
            "maintenanceQuoteCode": ("id",),
            "refNo": ("ref_no",),
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
            "customerType": ("company_type",),
        },
    ),
    DocumentConfig(
        table="company_manager",
        source_type=SourceType.CONTACT,
        id_fields=("contactCode", "contact_code", "email", "id"),
        title_fields=("name", "email", "id"),
        payload_aliases={
            "contactCode": ("id",),
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
        },
    ),
    # ---------- 항상 색인 ----------
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

# 테이블명 → config 빠른 조회
TABLE_TO_CONFIG: dict[str, DocumentConfig] = {cfg.table: cfg for cfg in INDEXED_CONFIGS}


# ---------------------------------------------------------------------------
# 변환 헬퍼 (reindex_orbis_data.py 와 동일한 로직)
# ---------------------------------------------------------------------------

def to_jsonable(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return int(value) if value == int(value) else float(value)
    if isinstance(value, dict):
        return {str(k): to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_jsonable(item) for item in value]
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def first_value(payload: dict[str, Any], field_names: tuple[str, ...]) -> Any:
    for name in field_names:
        if name in payload and payload[name] not in (None, ""):
            return payload[name]
    return None


def first_string(payload: dict[str, Any], field_names: tuple[str, ...]) -> str | None:
    value = first_value(payload, field_names)
    if value in (None, ""):
        return None
    return str(value).strip() or None


def normalize_payload(*, row: dict[str, Any], extra_aliases: dict[str, tuple[str, ...]]) -> dict[str, Any]:
    payload = {str(k): to_jsonable(v) for k, v in row.items()}
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


def build_source_id(payload: dict[str, Any], fields: tuple[str, ...]) -> str | None:
    value = first_value(payload, fields)
    if value in (None, ""):
        return None
    return str(value).strip() or None


def build_title(*, payload: dict[str, Any], title_fields: tuple[str, ...], source_type: str, source_id: str) -> str:
    value = first_value(payload, title_fields)
    if value not in (None, ""):
        title = str(value).strip()
        if title:
            return title
    return f"{source_type}:{source_id}"


def build_content(*, payload: dict[str, Any], content_fields: tuple[str, ...]) -> str | None:
    parts = []
    for fname in content_fields:
        value = payload.get(fname)
        if value in (None, ""):
            continue
        text = str(value).strip()
        if text:
            parts.append(f"{fname}: {text}")
    return "\n".join(parts) if parts else None


def build_metadata(*, payload: dict[str, Any], source_type: str, source_table: str) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "origin": "notify",
        "sourceType": source_type,
        "sourceTable": source_table,
    }
    pk = payload.get("id")
    if pk is not None:
        metadata["dbPk"] = str(pk)
    for canonical_key, aliases in METADATA_ALIASES.items():
        value = first_value(payload, aliases)
        if value not in (None, ""):
            metadata[canonical_key] = value
    return metadata


def build_document(*, config: DocumentConfig, row: dict[str, Any]) -> dict[str, Any] | None:
    """실 엔티티 테이블 row → /internal/index/documents 페이로드 dict."""
    payload = normalize_payload(row=row, extra_aliases=config.payload_aliases)
    source_type = config.source_type
    source_id = build_source_id(payload, config.id_fields)
    if source_id is None:
        return None
    title = build_title(payload=payload, title_fields=config.title_fields, source_type=source_type, source_id=source_id)
    content = build_content(payload=payload, content_fields=config.content_fields)
    occurred_at = first_value(payload, ("updated_at", "updatedAt", "created_at", "createdAt"))
    deleted = bool(payload.get("deleted", False))
    deleted_at = first_value(payload, ("deleted_at", "deletedAt"))
    return {
        "sourceType": source_type,
        "sourceId": source_id,
        "operation": "UPSERT",
        "title": title,
        "sourcePath": first_string(payload, config.source_path_fields),
        "content": content,
        "payload": payload,
        "metadata": build_metadata(payload=payload, source_type=source_type, source_table=config.table),
        "deleted": deleted,
        "deletedAt": deleted_at,
        "eventId": f"notify:{config.table}:{source_type}:{source_id}",
        "occurredAt": occurred_at,
    }


def build_document_text(*, source_type: str | None, title: str | None, content: str | None, payload: dict[str, Any]) -> str:
    normalized_source_type = (source_type or "").strip().upper()
    if normalized_source_type == SourceType.ATTACHMENT:
        return build_attachment_document_text(title=title, content=content, payload=payload)

    version_lines = build_version_lines(payload)
    if content and content.strip():
        parts = []
        if title and title.strip():
            parts.append(f"제목: {title.strip()}")
        parts.append(content.strip())
        parts.extend(version_lines)
        return "\n".join(parts)

    if normalized_source_type == SourceType.RFP_ANALYSIS:
        return build_rfp_analysis_document_text(title=title, payload=payload)

    lines: list[str] = []
    if title and title.strip():
        lines.append(f"제목: {title.strip()}")
    lines.extend(version_lines)
    lines.extend(flatten_payload(payload))
    return "\n".join(lines).strip()


def build_rfp_analysis_document_text(*, title: str | None, payload: dict[str, Any]) -> str:
    lines: list[str] = []
    if title and title.strip():
        lines.append(f"제목: {title.strip()}")
    lines.extend(build_version_lines(payload))

    field_specs: tuple[tuple[str, tuple[str, ...]], ...] = (
        ("고객사", ("customerName", "customer_name", "customerCompanyName")),
        ("사업기회코드", ("opportunityCode", "opportunity_code")),
        ("사업기회명", ("opportunityName", "opportunity_name")),
        ("사업부문", ("businessDivision", "business_division", "businessType", "business_type")),
        ("제안유형", ("proposalType", "proposal_type")),
        ("제출마감", ("submissionDeadline", "submission_deadline")),
        ("영업대표", ("salesRepresentative", "sales_representative")),
        ("담당자", ("manager", "analyst")),
        ("요청일", ("requestedAt", "requested_at", "receivedDate", "received_date")),
        ("분석상태", ("analysisStatus", "analysis_status", "status")),
    )
    for label, aliases in field_specs:
        value = first_value(payload, aliases)
        if value not in (None, ""):
            lines.append(f"{label}: {value}")

    requirements = payload.get("requirements")
    if isinstance(requirements, list) and requirements:
        total_mandays = 0.0
        for index, requirement in enumerate(requirements, start=1):
            if not isinstance(requirement, dict):
                continue
            lines.append(f"요구사항 {index}")
            row_specs: tuple[tuple[str, tuple[str, ...]], ...] = (
                ("구분", ("category",)),
                ("요구사항번호", ("requirementNo", "requirement_code")),
                ("요구사항명칭", ("requirementName", "requirement_title")),
                ("요구사항내용", ("requirementDetail", "requirement_content")),
                ("지원여부", ("supportStatus", "support_status")),
                ("검토 내용", ("reviewNote", "review_note")),
                ("공수(M/D)", ("mandays", "effort")),
            )
            for label, aliases in row_specs:
                value = first_value(requirement, aliases)
                if value in (None, ""):
                    continue
                lines.append(f"{label}: {value}")
            mandays = first_value(requirement, ("mandays", "effort"))
            if isinstance(mandays, (int, float, Decimal)):
                total_mandays += float(mandays)
        lines.append(f"총 공수(M/D): {int(total_mandays) if total_mandays.is_integer() else total_mandays}")
    else:
        lines.extend(flatten_payload(payload))

    return "\n".join(str(line).strip() for line in lines if str(line).strip()).strip()


def build_attachment_document_text(*, title: str | None, content: str | None, payload: dict[str, Any]) -> str:
    lines: list[str] = []
    if title and title.strip():
        lines.append(f"제목: {title.strip()}")

    file_type = first_string(payload, ("fileType", "mimeType", "contentType", "mediaType"))
    if file_type:
        lines.append(f"파일타입: {file_type}")

    if content and "<table" in content.lower():
        lines.extend(_extract_html_table_lines(content))
    elif content and content.strip():
        lines.append(content.strip())
    else:
        lines.extend(flatten_payload(payload))

    return "\n".join(line for line in lines if line).strip()


def build_version_lines(payload: dict[str, Any]) -> list[str]:
    lines: list[str] = []

    series_code = first_value(payload, ("documentSeriesCode", "document_series_code"))
    if series_code not in (None, ""):
        lines.append(f"문서계열코드: {series_code}")

    version = first_value(payload, ("documentVersion", "document_version"))
    if version not in (None, ""):
        lines.append(f"문서버전: {version}")

    is_latest = first_value(payload, ("isLatestVersion", "is_latest_version"))
    latest_label = normalize_latest_version_label(is_latest)
    if latest_label is not None:
        lines.append(f"최신버전여부: {latest_label}")

    previous_version_id = first_value(payload, ("previousVersionId", "previous_version_id"))
    if previous_version_id not in (None, ""):
        lines.append(f"이전버전참조: {previous_version_id}")

    return lines


def normalize_latest_version_label(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return "예" if value else "아니오"
    text = str(value).strip().lower()
    if text in {"true", "t", "1", "y", "yes"}:
        return "예"
    if text in {"false", "f", "0", "n", "no"}:
        return "아니오"
    return str(value)


def _extract_html_table_lines(raw_html: str) -> list[str]:
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", raw_html, flags=re.IGNORECASE | re.DOTALL)
    extracted: list[str] = []
    for row_html in rows:
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row_html, flags=re.IGNORECASE | re.DOTALL)
        normalized_cells = [_normalize_html_cell(cell) for cell in cells]
        normalized_cells = [cell for cell in normalized_cells if cell]
        if normalized_cells:
            extracted.append(" | ".join(normalized_cells))
    return extracted


def _normalize_html_cell(cell_html: str) -> str:
    text = re.sub(r"<br\\s*/?>", "\n", cell_html, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\\s+", " ", text)
    return text.strip()


def flatten_payload(payload: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for key in sorted(payload.keys()):
        lines.extend(flatten_value(key, payload[key]))
    return lines


def flatten_value(path: str, value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, dict):
        lines: list[str] = []
        for key in sorted(value.keys()):
            next_path = f"{path}.{key}" if path else str(key)
            lines.extend(flatten_value(next_path, value[key]))
        return lines
    if isinstance(value, list):
        lines: list[str] = []
        for index, item in enumerate(value):
            next_path = f"{path}[{index}]"
            lines.extend(flatten_value(next_path, item))
        return lines

    text = str(value).strip()
    if not text:
        return []
    return [f"{path}: {text}"]
