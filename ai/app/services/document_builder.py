from typing import Any


SENSITIVE_KEY_PARTS = {
    "password",
    "passwd",
    "secret",
    "token",
    "key",
    "credential",
}

ATTACHMENT_SOURCE_TYPES = {"ATTACHMENT"}
ATTACHMENT_TEXT_KEYS = (
    "extractedText",
    "extracted_text",
    "fullText",
    "full_text",
    "text",
    "body",
    "content",
)
ATTACHMENT_NAME_KEYS = (
    "fileName",
    "filename",
    "originalFilename",
    "originalFileName",
    "name",
)
ATTACHMENT_EXTENSION_KEYS = (
    "extension",
    "ext",
    "fileExtension",
)
ATTACHMENT_MIME_KEYS = (
    "fileType",
    "mimeType",
    "contentType",
    "mediaType",
)
ATTACHMENT_PARENT_TYPE_KEYS = (
    "parentSourceType",
    "ownerSourceType",
    "domainSourceType",
)
ATTACHMENT_PARENT_ID_KEYS = (
    "parentSourceId",
    "ownerSourceId",
    "domainSourceId",
)
ATTACHMENT_PAGE_COUNT_KEYS = (
    "pageCount",
    "pages",
    "sheetCount",
    "slideCount",
)
ATTACHMENT_FILE_ID_KEYS = (
    "fileId",
    "id",
)
ATTACHMENT_PARENT_ENTITY_KEYS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("PROJECT_OPPORTUNITY", "사업기회ID", ("projectOpportunityId",)),
    ("SALES_ACTIVITY", "영업활동ID", ("salesActivityId",)),
    ("QUOTATION", "견적ID", ("quotationId",)),
    ("RFP_ANALYSIS", "RFP분석ID", ("rfpAnalyzeResultId", "rfpAnalysisId")),
    ("PRB", "PRB ID", ("prbId",)),
    ("BID_RESULT", "입찰결과ID", ("bidResultId",)),
    ("ORDER_REPORT", "수주보고ID", ("orderReportId",)),
    ("CONTRACT", "계약ID", ("contractId",)),
    ("PROJECT", "사업ID", ("projectId",)),
    ("PROJECT_RESULT_REPORT", "사업결과보고ID", ("projectResultReportId",)),
    ("MAINTENANCE", "유지보수ID", ("maintenanceId",)),
    ("MAINTENANCE_QUOTE", "유지보수견적ID", ("maintenanceQuotationId",)),
    ("CUSTOMER_SUPPORT", "고객지원ID", ("customerSupportId",)),
    ("LICENSE", "라이선스ID", ("licenseId",)),
    ("BILLING", "청구ID", ("billingId",)),
)


def build_document_text(*, source_type: str | None = None, title: str | None, content: str | None, payload: dict[str, Any]) -> str:
    if normalize_source_type(source_type) in ATTACHMENT_SOURCE_TYPES:
        return build_attachment_document_text(title=title, content=content, payload=payload)

    if content and content.strip():
        parts = []
        if title and title.strip():
            parts.append(f"제목: {title.strip()}")
        parts.append(content.strip())
        return "\n".join(parts)

    lines = []
    if title and title.strip():
        lines.append(f"제목: {title.strip()}")
    lines.extend(flatten_payload(payload))
    return "\n".join(lines).strip()


def build_attachment_document_text(*, title: str | None, content: str | None, payload: dict[str, Any]) -> str:
    attachment_title = first_non_empty_str(title, lookup_first_string(payload, ATTACHMENT_NAME_KEYS))
    extracted_text = first_non_empty_str(content, lookup_first_string(payload, ATTACHMENT_TEXT_KEYS))

    lines: list[str] = []
    if attachment_title:
        lines.append(f"제목: {attachment_title}")
    lines.append("문서유형: 첨부파일")

    file_id = lookup_first_value(payload, ATTACHMENT_FILE_ID_KEYS)
    if file_id not in (None, ""):
        lines.append(f"파일ID: {file_id}")

    file_extension = lookup_first_string(payload, ATTACHMENT_EXTENSION_KEYS)
    if file_extension:
        lines.append(f"확장자: {file_extension}")

    file_type = lookup_first_string(payload, ATTACHMENT_MIME_KEYS)
    if file_type:
        lines.append(f"파일타입: {file_type}")

    parent_source_type = lookup_first_string(payload, ATTACHMENT_PARENT_TYPE_KEYS)
    if parent_source_type:
        lines.append(f"원본문서유형: {parent_source_type}")

    parent_source_id = lookup_first_string(payload, ATTACHMENT_PARENT_ID_KEYS)
    if parent_source_id:
        lines.append(f"원본문서ID: {parent_source_id}")

    for _, label, keys in ATTACHMENT_PARENT_ENTITY_KEYS:
        related_id = lookup_first_value(payload, keys)
        if related_id not in (None, ""):
            lines.append(f"{label}: {related_id}")

    page_count = lookup_first_value(payload, ATTACHMENT_PAGE_COUNT_KEYS)
    if page_count not in (None, ""):
        lines.append(f"페이지수: {page_count}")

    if extracted_text:
        lines.append("본문:")
        lines.append(extracted_text)
        return "\n".join(lines).strip()

    lines.extend(flatten_payload(payload))
    return "\n".join(lines).strip()


def flatten_payload(payload: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for key in sorted(payload.keys()):
        lines.extend(flatten_value(key, payload[key]))
    return lines


def flatten_value(path: str, value: Any) -> list[str]:
    if value is None or is_sensitive_path(path):
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


def is_sensitive_path(path: str) -> bool:
    normalized = path.lower()
    return any(part in normalized for part in SENSITIVE_KEY_PARTS)


def lookup_first_string(payload: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    value = lookup_first_value(payload, keys)
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def lookup_first_value(payload: dict[str, Any], keys: tuple[str, ...]) -> Any:
    for key in keys:
        if key in payload and payload[key] is not None:
            return payload[key]
    return None


def first_non_empty_str(*values: str | None) -> str | None:
    for value in values:
        if value and value.strip():
            return value.strip()
    return None


def normalize_source_type(source_type: str | None) -> str:
    return (source_type or "").strip().upper()
