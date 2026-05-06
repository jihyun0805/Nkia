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
ATTACHMENT_CODE_METADATA_KEYS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("첨부코드", "attachmentCode", ("attachmentCode", "attachment_code")),
    ("관련유형", "relatedType", ("relatedType", "related_type")),
    ("관련코드", "relatedCode", ("relatedCode", "related_code")),
    ("고객사코드", "customerCompanyCode", ("customerCompanyCode", "customer_company_code")),
    ("고객사명", "customerCompanyName", ("customerCompanyName", "customer_company_name", "customerName")),
    ("회사코드", "companyCode", ("companyCode", "company_code")),
    ("회사명", "companyName", ("companyName", "company_name")),
    ("사업기회ID", "opportunityId", ("opportunityId", "projectOpportunityId")),
    ("사업기회코드", "opportunityCode", ("opportunityCode", "opportunity_code")),
    ("사업기회명", "opportunityName", ("opportunityName", "opportunity_name")),
    ("사업유형", "businessType", ("businessType", "business_type")),
    ("현재상태", "currentStatus", ("currentStatus", "current_status")),
    ("영업활동ID", "activityId", ("activityId", "salesActivityId")),
    ("활동유형", "activityType", ("activityType", "activity_type")),
    ("활동채널", "activityChannel", ("activityChannel", "activity_channel")),
    ("견적코드", "quoteCode", ("quoteCode", "quotationCode", "quote_code")),
    ("RFP코드", "rfpCode", ("rfpCode", "rfp_code")),
    ("RFP분석코드", "rfpAnalysisCode", ("rfpAnalysisCode", "rfp_analysis_code")),
    ("제안서코드", "proposalCode", ("proposalCode", "proposal_code")),
    ("PRB코드", "prbCode", ("prbCode", "prb_code")),
    ("PRB결과코드", "prbResultCode", ("prbResultCode", "prb_result_code")),
    ("입찰결과코드", "bidResultCode", ("bidResultCode", "bid_result_code")),
    ("수주보고코드", "wonReportCode", ("wonReportCode", "won_report_code")),
    ("계약코드", "contractCode", ("contractCode", "contract_code")),
    ("프로젝트코드", "projectCode", ("projectCode", "project_code")),
    ("사업결과보고코드", "projectReportCode", ("projectReportCode", "project_report_code")),
    ("유지보수코드", "maintenanceCode", ("maintenanceCode", "maintenance_code")),
    ("유지보수유형", "contractType", ("contractType", "contract_type")),
    ("고객지원코드", "supportCode", ("supportCode", "support_code")),
    ("유지보수견적코드", "maintenanceQuoteCode", ("maintenanceQuoteCode", "maintenance_quote_code")),
    ("라이선스코드", "licenseCode", ("licenseCode", "license_code")),
    ("라이선스타입코드", "licenseTypeCode", ("licenseTypeCode", "license_type_code")),
    ("청구코드", "billingCode", ("billingCode", "billing_code")),
    ("수금코드", "collectionCode", ("collectionCode", "collection_code")),
    ("모듈ID", "moduleId", ("moduleId", "module_id", "productModuleId", "product_module_id")),
    ("모듈명", "moduleName", ("moduleName", "module_name", "productName", "product_name")),
    ("모듈유형", "moduleType", ("moduleType", "module_type", "productType", "product_type")),
)
ATTACHMENT_FILE_ID_KEYS = (
    "fileId",
    "id",
)
ATTACHMENT_PARENT_ENTITY_KEYS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("PROJECT_OPPORTUNITY", "사업기회ID", ("projectOpportunityId",)),
    ("SALES_ACTIVITY", "영업활동ID", ("salesActivityId",)),
    ("POST_SALES", "사후영업ID", ("postSalesId", "salesActivityId")),
    ("QUOTATION", "견적ID", ("quotationId",)),
    ("RFP", "RFPID", ("rfpId", "rfpCode")),
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


_SOURCE_TYPE_PAYLOAD_FIELDS: dict[str, tuple[tuple[str, tuple[str, ...]], ...]] = {
    "PROJECT_OPPORTUNITY": (
        ("사업명", ("opportunityName", "opportunity_name")),
        ("사업코드", ("opportunityCode", "opportunity_code")),
        ("고객사", ("customerName", "customer_name", "customerCompanyName")),
        ("사업유형", ("businessType", "business_type")),
        ("현재상태", ("currentStatus", "current_status")),
        ("예상금액", ("expectedAmount", "expected_amount")),
        ("주요내용", ("mainContent", "main_content")),
        ("이슈", ("issueContent", "issue_content")),
        ("경쟁상황", ("competitorStatus", "competitor_status")),
        ("의사결정구조", ("decisionStructure", "decision_structure")),
        ("연락라인", ("contactLine", "contact_line")),
    ),
    "SALES_ACTIVITY": (
        ("활동코드", ("activityCode", "activity_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("고객사", ("customerName", "customer_name")),
        ("활동유형", ("activityType", "activity_type")),
        ("활동채널", ("activityChannel", "activity_channel")),
        ("활동일시", ("activityAt", "activity_at")),
        ("내용", ("content",)),
        ("고객관심사", ("customerInterest", "customer_interest")),
        ("이슈", ("issue",)),
        ("다음조치", ("nextAction", "next_action")),
        ("진행상태", ("progressStatus", "progress_status")),
    ),
    "QUOTATION": (
        ("견적코드", ("quoteCode", "quotationCode", "quote_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("고객사", ("customerName", "customer_name")),
        ("견적일", ("quoteDate", "quote_date")),
        ("총액", ("totalAmount", "total_amount")),
        ("지급조건", ("paymentTerms", "payment_terms")),
        ("특이사항", ("specialNote", "special_note")),
    ),
    "RFP": (
        ("RFP코드", ("rfpCode", "rfp_code", "rfpAnalysisCode", "rfp_analysis_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("발주기관", ("issuer",)),
        ("공고번호", ("announcementNo", "announcement_no")),
        ("수령일", ("receivedDate", "received_date")),
        ("제출마감", ("submissionDeadline", "submission_deadline")),
        ("사업기간", ("projectPeriod", "project_period")),
        ("사업범위", ("projectScope", "project_scope")),
        ("요구사항", ("requirements",)),
        ("보안요구사항", ("securityRequirements", "security_requirements")),
    ),
    "RFP_ANALYSIS": (
        ("RFP분석코드", ("rfpAnalysisCode", "rfp_analysis_code")),
        ("RFP코드", ("rfpCode", "rfp_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("발주기관", ("issuer",)),
        ("사업기간", ("projectPeriod", "project_period")),
        ("사업범위", ("projectScope", "project_scope")),
        ("요구사항", ("requirements",)),
        ("리스크", ("riskFactors", "risk_factors")),
        ("특이사항", ("specialNotes", "special_notes")),
    ),
    "PRB": (
        ("PRB코드", ("prbCode", "prb_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("고객사", ("customerName", "customer_name")),
        ("예상수주율", ("expectedWinRate", "expected_win_rate")),
        ("추정매출", ("estimatedRevenue", "estimated_revenue")),
        ("추정이익률", ("estimatedProfitRate", "estimated_profit_rate")),
        ("사업개요", ("businessOverview", "business_overview")),
        ("리스크", ("riskFactors", "risk_factors")),
    ),
    "PRB_RESULT": (
        ("PRB결과코드", ("prbResultCode", "prb_result_code")),
        ("PRB코드", ("prbCode", "prb_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("결정상태", ("decisionStatus", "decision_status")),
        ("최종의견", ("finalOpinion", "final_opinion")),
        ("리스크검토", ("riskReview", "risk_review")),
    ),
    "PROPOSAL": (
        ("제안서코드", ("proposalCode", "proposal_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("제안서명", ("proposalName", "proposal_name")),
        ("제안요약", ("proposalSummary", "proposal_summary")),
        ("전략요약", ("strategySummary", "strategy_summary")),
    ),
    "BID_RESULT": (
        ("입찰결과코드", ("bidResultCode", "bid_result_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("수주여부", ("won",)),
        ("수주/실주사유", ("winLossReason", "win_loss_reason")),
        ("경쟁사요약", ("competitorSummary", "competitor_summary")),
    ),
    "WON": (
        ("수주코드", ("wonCode", "won_code", "wonReportCode", "won_report_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("고객사", ("customerName", "customer_name")),
        ("계약금액", ("contractAmount", "contract_amount")),
        ("계약일", ("contractDate", "contract_date")),
        ("사업범위", ("businessScope", "business_scope")),
        ("결과요약", ("outcomeSummary", "outcome_summary")),
    ),
    "LOST": (
        ("실주코드", ("lostCode", "lost_code", "bidResultCode", "bid_result_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("고객사", ("customerName", "customer_name")),
        ("실주사유", ("winLossReason", "win_loss_reason")),
        ("경쟁사요약", ("competitorSummary", "competitor_summary")),
        ("결과요약", ("outcomeSummary", "outcome_summary")),
    ),
    "ORDER_REPORT": (
        ("수주보고코드", ("wonReportCode", "won_report_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("고객사", ("customerName", "customer_name")),
        ("계약금액", ("contractAmount", "contract_amount")),
        ("사업범위", ("businessScope", "business_scope")),
        ("특이사항", ("specialNotes", "special_notes")),
    ),
    "CONTRACT": (
        ("계약코드", ("contractCode", "contract_code")),
        ("수주보고코드", ("wonReportCode", "won_report_code")),
        ("상태", ("contractStatus", "contract_status")),
        ("메모", ("memo",)),
    ),
    "PROJECT": (
        ("프로젝트코드", ("projectCode", "project_code")),
        ("납기일", ("deliveryDate", "delivery_date")),
        ("프로젝트책임자", ("projectOwner", "project_owner")),
        ("상태", ("projectStatus", "project_status")),
        ("팀명", ("teamName", "team_name")),
    ),
    "PROJECT_RESULT_REPORT": (
        ("결과보고코드", ("projectReportCode", "project_report_code")),
        ("프로젝트코드", ("projectCode", "project_code")),
        ("결과상태", ("resultStatus", "result_status")),
        ("상세내용", ("detailContent", "detail_content")),
    ),
    "POST_SALES": (
        ("사후영업코드", ("postSalesCode", "post_sales_code")),
        ("프로젝트코드", ("projectCode", "project_code")),
        ("활동내용", ("activityContent", "activity_content")),
        ("후속기회", ("nextOpportunityHint", "next_opportunity_hint")),
    ),
    "MAINTENANCE": (
        ("유지보수코드", ("maintenanceCode", "maintenance_code")),
        ("사업명", ("opportunityName", "opportunity_name")),
        ("계약유형", ("contractType", "contract_type")),
        ("상태", ("status",)),
        ("상세내용", ("detailContent", "detail_content")),
    ),
    "MAINTENANCE_QUOTE": (
        ("유지보수견적코드", ("maintenanceQuoteCode", "maintenance_quote_code")),
        ("유지보수코드", ("maintenanceCode", "maintenance_code")),
        ("총액", ("totalAmount", "total_amount")),
        ("특이사항", ("specialNotes", "special_notes")),
    ),
    "CUSTOMER_SUPPORT": (
        ("고객지원코드", ("supportCode", "support_code")),
        ("유지보수코드", ("maintenanceCode", "maintenance_code")),
        ("활동유형", ("activityType", "activity_type")),
        ("활동내용", ("activityContent", "activity_content")),
        ("성과", ("performance",)),
    ),
    "COMPANY": (
        ("회사명", ("companyName", "company_name")),
        ("회사코드", ("companyCode", "company_code")),
        ("고객그룹", ("customerGroup", "customer_group")),
        ("고객유형", ("customerType", "customer_type")),
        ("사업기회 수", ("opportunityCount", "opportunity_count")),
        ("최근 영업일", ("recentActivityAt", "recent_activity_at")),
        ("주요 사업", ("recentOpportunityNames", "recent_opportunity_names")),
        ("최근 상태", ("recentOpportunityStatuses", "recent_opportunity_statuses")),
    ),
    "CONTACT": (
        ("이름", ("name", "contactName", "contact_name")),
        ("직책", ("position",)),
        ("부서", ("department",)),
        ("회사명", ("companyName", "company_name")),
    ),
    "MODULE": (
        ("모듈ID", ("moduleId", "module_id", "productModuleId", "product_module_id")),
        ("모듈명", ("moduleName", "module_name", "productName", "product_name")),
        ("모듈유형", ("moduleType", "module_type", "productType", "product_type")),
        ("소비자가", ("listPrice", "list_price")),
        ("연결 사업기회 수", ("opportunityCount", "opportunity_count")),
        ("최근 사업기회", ("recentOpportunityNames", "recent_opportunity_names")),
    ),
    "LICENSE": (
        ("라이선스코드", ("licenseCode", "license_code")),
        ("수주보고코드", ("wonReportCode", "won_report_code")),
        ("종류", ("licenseKind", "license_kind")),
        ("상태", ("status",)),
    ),
    "BILLING": (
        ("청구코드", ("billingCode", "billing_code")),
        ("프로젝트코드", ("projectCode", "project_code")),
        ("청구유형", ("billingType", "billing_type")),
        ("청구금액", ("billingAmount", "billing_amount")),
        ("청구상태", ("billingStatus", "billing_status")),
    ),
}


def _build_typed_payload_lines(source_type: str, payload: dict[str, Any]) -> list[str]:
    field_specs = _SOURCE_TYPE_PAYLOAD_FIELDS.get(source_type.upper())
    if not field_specs:
        return flatten_payload(payload)
    lines: list[str] = []
    for label, candidate_keys in field_specs:
        value = lookup_first_value(payload, candidate_keys)
        if value in (None, ""):
            continue
        text = str(value).strip()
        if text:
            lines.append(f"{label}: {text}")
    return lines


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
    lines.extend(_build_typed_payload_lines(source_type or "", payload))
    return "\n".join(lines).strip()


def build_attachment_document_text(*, title: str | None, content: str | None, payload: dict[str, Any]) -> str:
    attachment_title = first_non_empty_str(title, lookup_first_string(payload, ATTACHMENT_NAME_KEYS))
    extracted_text = first_non_empty_str(content, lookup_first_string(payload, ATTACHMENT_TEXT_KEYS))

    lines: list[str] = []
    if attachment_title:
        lines.append(f"제목: {attachment_title}")
    lines.append("문서유형: 첨부파일")

    file_extension = lookup_first_string(payload, ATTACHMENT_EXTENSION_KEYS)
    if file_extension:
        lines.append(f"확장자: {file_extension}")

    file_type = lookup_first_string(payload, ATTACHMENT_MIME_KEYS)
    if file_type:
        lines.append(f"파일타입: {file_type}")

    parent_source_type = lookup_first_string(payload, ATTACHMENT_PARENT_TYPE_KEYS)
    if parent_source_type:
        lines.append(f"원본문서유형: {parent_source_type}")

    modules = lookup_first_value(payload, ("modules", "moduleNames", "productModules"))
    if modules not in (None, ""):
        lines.append(f"모듈: {format_attachment_value(modules)}")

    competitors = lookup_first_value(payload, ("competitors",))
    if competitors not in (None, ""):
        lines.append(f"경쟁사: {format_attachment_value(competitors)}")

    if extracted_text:
        lines.append("본문:")
        lines.append(extracted_text)

    file_id = lookup_first_value(payload, ATTACHMENT_FILE_ID_KEYS)
    if file_id not in (None, ""):
        lines.append(f"파일ID: {file_id}")

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

    for label, _, keys in ATTACHMENT_CODE_METADATA_KEYS:
        related_value = lookup_first_value(payload, keys)
        if related_value in (None, ""):
            continue
        lines.append(f"{label}: {format_attachment_value(related_value)}")

    if extracted_text:
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


def format_attachment_value(value: Any) -> str:
    if isinstance(value, list):
        return ", ".join(str(item).strip() for item in value if str(item).strip())
    if isinstance(value, tuple):
        return ", ".join(str(item).strip() for item in value if str(item).strip())
    return str(value).strip()
