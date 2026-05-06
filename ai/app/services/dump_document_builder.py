"""
dump_* 테이블 row → IndexDocumentRequest payload 변환 모듈.

reindex_orbis_data.py 의 build_document 로직을 서비스 레이어에서 재사용할 수 있도록 추출.
index_listener.py 에서 import해서 사용한다.
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
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
# 색인 대상 dump_* 테이블 설정 (reindex_orbis_data.py DUMP_CONFIGS + ALWAYS_CONFIGS 와 동일)
# ---------------------------------------------------------------------------

INDEXED_CONFIGS: tuple[DocumentConfig, ...] = (
    # ---------- dump_* tables ----------
    DocumentConfig(
        table="dump_opportunities",
        source_type=SourceType.PROJECT_OPPORTUNITY,
        id_fields=("opportunity_code", "id"),
        title_fields=("opportunity_name", "customer_name", "id"),
    ),
    DocumentConfig(
        table="dump_quotes",
        source_type=SourceType.QUOTATION,
        id_fields=("quote_code", "quotation_code", "id"),
        title_fields=("quote_code", "opportunity_name", "id"),
    ),
    DocumentConfig(
        table="dump_prbs",
        source_type=SourceType.PRB,
        id_fields=("prb_code", "id"),
        title_fields=("prb_code", "opportunity_name", "id"),
    ),
    DocumentConfig(
        table="dump_prb_results",
        source_type=SourceType.PRB_RESULT,
        id_fields=("prb_result_code", "id"),
        title_fields=("prb_result_code", "opportunity_name", "id"),
    ),
    DocumentConfig(
        table="dump_proposals",
        source_type=SourceType.PROPOSAL,
        id_fields=("proposal_code", "id"),
        title_fields=("proposal_name", "proposal_code", "id"),
    ),
    DocumentConfig(
        table="dump_contracts",
        source_type=SourceType.CONTRACT,
        id_fields=("contract_code", "id"),
        title_fields=("contract_code", "opportunity_name", "id"),
    ),
    DocumentConfig(
        table="dump_projects",
        source_type=SourceType.PROJECT,
        id_fields=("project_code", "pjt_no", "id"),
        title_fields=("project_code", "pjt_no", "id"),
    ),
    DocumentConfig(
        table="dump_project_reports",
        source_type=SourceType.PROJECT_RESULT_REPORT,
        id_fields=("project_report_code", "id"),
        title_fields=("project_report_code", "project_code", "id"),
    ),
    DocumentConfig(
        table="dump_maintenance_contracts",
        source_type=SourceType.MAINTENANCE,
        id_fields=("maintenance_code", "id"),
        title_fields=("maintenance_code", "opportunity_name", "id"),
    ),
    DocumentConfig(
        table="dump_maintenance_quotes",
        source_type=SourceType.MAINTENANCE_QUOTE,
        id_fields=("maintenance_quote_code", "id"),
        title_fields=("maintenance_quote_code", "maintenance_code", "id"),
    ),
    DocumentConfig(
        table="dump_customer_supports",
        source_type=SourceType.CUSTOMER_SUPPORT,
        id_fields=("support_code", "id"),
        title_fields=("support_code", "maintenance_code", "id"),
    ),
    DocumentConfig(
        table="dump_companies",
        source_type=SourceType.COMPANY,
        id_fields=("company_code", "id"),
        title_fields=("company_name", "company_code", "id"),
    ),
    DocumentConfig(
        table="dump_contacts",
        source_type=SourceType.CONTACT,
        id_fields=("contact_code", "email", "id"),
        title_fields=("contact_name", "name", "email", "id"),
    ),
    DocumentConfig(
        table="dump_licenses",
        source_type=SourceType.LICENSE,
        id_fields=("license_code", "id"),
        title_fields=("license_code", "license_name", "id"),
    ),
    DocumentConfig(
        table="dump_billings",
        source_type=SourceType.BILLING,
        id_fields=("billing_code", "id"),
        title_fields=("billing_code", "project_code", "id"),
    ),
    # ---------- always-indexed entity tables ----------
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
    # numeric PK: DELETE 이벤트에서 ai_knowledge_sources 역조회에 사용
    pk = payload.get("id")
    if pk is not None:
        metadata["dbPk"] = str(pk)
    for canonical_key, aliases in METADATA_ALIASES.items():
        value = first_value(payload, aliases)
        if value not in (None, ""):
            metadata[canonical_key] = value
    return metadata


def build_document(*, config: DocumentConfig, row: dict[str, Any]) -> dict[str, Any] | None:
    """dump_* 테이블 row → /internal/index/documents 페이로드 dict."""
    payload = normalize_payload(row=row, extra_aliases=config.payload_aliases)
    source_type = config.source_type
    source_id = build_source_id(payload, config.id_fields)
    if source_id is None:
        return None
    title = build_title(payload=payload, title_fields=config.title_fields, source_type=source_type, source_id=source_id)
    content = build_content(payload=payload, content_fields=config.content_fields)
    occurred_at = first_value(payload, ("updated_at", "updatedAt", "created_at", "createdAt"))
    return {
        "sourceType": source_type,
        "sourceId": source_id,
        "operation": "UPSERT",
        "title": title,
        "sourcePath": first_string(payload, config.source_path_fields),
        "content": content,
        "payload": payload,
        "metadata": build_metadata(payload=payload, source_type=source_type, source_table=config.table),
        "eventId": f"notify:{config.table}:{source_type}:{source_id}",
        "occurredAt": occurred_at,
    }
