"""AI 시스템 전역 상수.

BE 스키마 또는 필드명이 바뀌면 이 파일만 수정하면 된다.

- SourceType   : ai_knowledge_sources.source_type 에 쓰이는 문자열 상수
- METADATA_ALIASES : 인덱싱 시 BE payload/metadata 필드명 → AI 정규 camelCase 키 매핑
- SNAPSHOT_ALIASES : nkia_domain_adapter 가 BE 직쿼리 결과를 읽을 때 쓰는 snake_case 별칭
"""

from __future__ import annotations


# ---------------------------------------------------------------------------
# Source type 상수
# ---------------------------------------------------------------------------

class SourceType:
    """ai_knowledge_sources.source_type 에 저장되는 문자열 상수 모음.

    BE 또는 AI 팀이 source_type 이름을 변경할 경우 이 클래스만 수정한다.
    문자열 리터럴을 직접 쓰지 말고 이 클래스를 import 해서 사용한다.
    """

    # 사업기회 라이프사이클
    PROJECT_OPPORTUNITY = "PROJECT_OPPORTUNITY"
    SALES_ACTIVITY = "SALES_ACTIVITY"
    QUOTATION = "QUOTATION"
    RFP = "RFP"
    RFP_ANALYSIS = "RFP_ANALYSIS"
    PRB = "PRB"
    PRB_RESULT = "PRB_RESULT"
    PROPOSAL = "PROPOSAL"
    BID_RESULT = "BID_RESULT"
    WON = "WON"
    LOST = "LOST"
    ORDER_REPORT = "ORDER_REPORT"
    CONTRACT = "CONTRACT"
    PROJECT = "PROJECT"
    PROJECT_RESULT_REPORT = "PROJECT_RESULT_REPORT"
    POST_SALES = "POST_SALES"
    MAINTENANCE = "MAINTENANCE"
    MAINTENANCE_QUOTE = "MAINTENANCE_QUOTE"
    CUSTOMER_SUPPORT = "CUSTOMER_SUPPORT"
    CUSTOMER_SUPPORT_REQUEST = "CUSTOMER_SUPPORT_REQUEST"
    SALES_ACTIVITY_REQUEST = "SALES_ACTIVITY_REQUEST"
    # 기준 정보
    COMPANY = "COMPANY"
    CONTACT = "CONTACT"
    MODULE = "MODULE"
    LICENSE = "LICENSE"
    BILLING = "BILLING"
    # 첨부파일
    ATTACHMENT = "ATTACHMENT"

    @classmethod
    def all_known(cls) -> frozenset[str]:
        """등록된 source_type 전체 집합. 유효성 검사에 사용."""
        return frozenset(
            v for k, v in vars(cls).items()
            if not k.startswith("_") and isinstance(v, str)
        )


# ---------------------------------------------------------------------------
# 메타데이터 필드명 별칭 테이블 (인덱싱 시 정규화용)
# ---------------------------------------------------------------------------
# 구조: { AI 정규 camelCase 키: (우선순위 순 입력 후보 키들, ...) }
#
# 인덱싱 서비스가 BE payload/metadata 를 받으면 이 테이블로 정규화한다.
# BE 가 필드명을 바꾸면 기존 키는 그대로 두고 새 키를 앞쪽에 추가한다.
# ---------------------------------------------------------------------------

METADATA_ALIASES: dict[str, tuple[str, ...]] = {
    # ── 사업기회 ────────────────────────────────────────────────────────────
    "opportunityId": (
        "opportunityId", "projectOpportunityId", "opportunity_id",
    ),
    "opportunityCode": (
        "opportunityCode", "opportunity_code", "oppCode", "opp_code",
    ),
    "opportunityName": (
        "opportunityName", "opportunity_name", "oppName",
    ),
    # ── 루트 사업기회 (상위 연결) ──────────────────────────────────────────
    "rootOpportunityCode": (
        "rootOpportunityCode", "root_opportunity_code", "rootOppCode",
    ),
    "rootOpportunityName": (
        "rootOpportunityName", "root_opportunity_name",
    ),
    # ── 고객사 ──────────────────────────────────────────────────────────────
    "customerCode": (
        "customerCode", "customer_code", "customerCompanyCode",
        "customer_company_code",
    ),
    "customerName": (
        "customerName", "customer_name", "customerCompanyName",
        "customer_company_name", "custName",
    ),
    "rootCustomerName": (
        "rootCustomerName", "root_customer_name",
    ),
    "customerGroup": (
        "customerGroup", "customer_group",
    ),
    "customerType": (
        "customerType", "customer_type",
    ),
    # ── 사업 속성 ───────────────────────────────────────────────────────────
    "businessType": (
        "businessType", "business_type",
    ),
    "rootBusinessType": (
        "rootBusinessType", "root_business_type",
    ),
    "proposalType": (
        "proposalType", "proposal_type",
    ),
    "productFamily": (
        "productFamily", "product_family",
    ),
    "projectId": (
        "projectId", "project_id",
    ),
    "orderReportId": (
        "orderReportId", "order_report_id", "wonReportId", "won_report_id",
    ),
    "maintenanceId": (
        "maintenanceId", "maintenance_id",
    ),
    "rfpAnalyzeResultId": (
        "rfpAnalyzeResultId", "rfp_analyze_result_id",
    ),
    "prbId": (
        "prbId", "prb_id",
    ),
    "contractId": (
        "contractId", "contract_id",
    ),
    "projectResultReportId": (
        "projectResultReportId", "project_result_report_id",
    ),
    "customerSupportId": (
        "customerSupportId", "customer_support_id",
    ),
    "billingId": (
        "billingId", "billing_id",
    ),
    "licenseId": (
        "licenseId", "license_id",
    ),
    # ── 상태 ────────────────────────────────────────────────────────────────
    "currentStatus": (
        "currentStatus", "current_status", "opportunityStatus",
        "opportunity_status",
    ),
    "bidResult": (
        "bidResult", "bid_result", "bidStatus", "bid_status",
        "orderResult", "order_result",
    ),
    "orderStatus": (
        "orderStatus", "order_status",
    ),
    # ── 금액 ────────────────────────────────────────────────────────────────
    "expectedAmount": (
        "expectedAmount", "expected_amount", "estimatedAmount",
        "estimated_amount", "budgetAmount", "budget_amount",
    ),
    "contractAmount": (
        "contractAmount", "contract_amount",
    ),
    # ── 날짜 ────────────────────────────────────────────────────────────────
    "documentStartAt": (
        "documentStartAt", "document_start_at", "startAt", "start_at",
        "startDate", "start_date",
    ),
    "documentEndAt": (
        "documentEndAt", "document_end_at", "endAt", "end_at",
        "endDate", "end_date",
    ),
    "businessStartAt": (
        "businessStartAt", "business_start_at",
    ),
    "businessEndAt": (
        "businessEndAt", "business_end_at",
    ),
    "periodStartAt": (
        "periodStartAt", "period_start_at",
    ),
    "periodEndAt": (
        "periodEndAt", "period_end_at",
    ),
    # ── 관련 코드들 ─────────────────────────────────────────────────────────
    "projectCode": (
        "projectCode", "project_code",
    ),
    "maintenanceCode": (
        "maintenanceCode", "maintenance_code",
    ),
    "contractCode": (
        "contractCode", "contract_code",
    ),
    "wonReportCode": (
        "wonReportCode", "won_report_code",
    ),
    "bidResultCode": (
        "bidResultCode", "bid_result_code",
    ),
    "rfpAnalysisCode": (
        "rfpAnalysisCode", "rfp_analysis_code",
    ),
    "proposalCode": (
        "proposalCode", "proposal_code",
    ),
    "rfpCode": (
        "rfpCode", "rfp_code", "rfpAnalysisCode", "rfp_analysis_code",
    ),
    "prbCode": (
        "prbCode", "prb_code",
    ),
    "prbResultCode": (
        "prbResultCode", "prb_result_code",
    ),
    "moduleId": (
        "moduleId", "module_id", "productModuleId", "product_module_id",
    ),
    "moduleName": (
        "moduleName", "module_name", "productName", "product_name",
    ),
    "moduleType": (
        "moduleType", "module_type", "productType", "product_type",
    ),
    # ── 버전 관리 문서 ──────────────────────────────────────────────────────
    "documentSeriesCode": (
        "documentSeriesCode", "document_series_code", "rootDocumentCode",
        "root_document_code", "baseDocumentCode", "base_document_code",
        "quoteRootCode", "quote_root_code", "quotationRootCode", "quotation_root_code",
    ),
    "documentVersion": (
        "documentVersion", "document_version", "version", "version_no",
        "versionNo", "revision", "revision_no", "revisionNo",
        "quoteVersion", "quote_version", "quotationVersion", "quotation_version",
    ),
    "isLatestVersion": (
        "isLatestVersion", "is_latest_version", "latestVersion", "latest_version",
        "isCurrentVersion", "is_current_version",
    ),
    "previousVersionId": (
        "previousVersionId", "previous_version_id", "prevVersionId", "prev_version_id",
    ),
}


# ---------------------------------------------------------------------------
# Snapshot 어댑터 필드명 별칭 테이블 (BE 직쿼리 결과 → canonical)
# ---------------------------------------------------------------------------
# nkia_domain_adapter 가 BE 직쿼리 결과 dict 에서 값을 꺼낼 때 사용한다.
# 구조: { 우선 후보 키, ... }  → _lookup(snapshot, *SNAPSHOT_ALIASES["opportunity_code"])
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# 백엔드 테이블명 매핑 - 테이블명 변경 시 이 딕셔너리만 수정한다
# ---------------------------------------------------------------------------

TABLE: dict[str, str] = {
    # 사업기회 라이프사이클
    "opportunities":           "project_opportunity",
    "activities":              "sales_activity",
    "quotes":                  "quotation",
    "quote_items":             "quotation_solution_item",
    "quote_labor_items":       "quotation_labor_item",
    "prbs":                    "prb",
    "prb_results":             "prb_result",
    "rfp_analyses":            "rfp_analyze_result",
    "proposals":               "proposal",
    "bid_results":             "bid_result",
    "won_reports":             "order_report",
    "contracts":               "contract",
    "projects":                "project",
    "project_reports":         "project_result_report",
    "post_sales":              "customer_support",
    "billings":                "billing",
    "collections":             "collection",
    # 유지보수
    "maintenance_contracts":   "maintenance",
    "maintenance_quotes":      "maintenance_quotation",
    "maintenance_quote_items": "maintenance_service_info",
    "customer_supports":       "customer_support",
    # 기준 정보
    "companies":               "company",
    "contacts":                "company_manager",
    "license_types":           "product_module",
    "licenses":                "license",
    # 첨부파일
    "attachments":             "upload_file",
    # 영업활동 요청
    "activity_requests":       "sales_activity_request",
}


SNAPSHOT_ALIASES: dict[str, tuple[str, ...]] = {
    # 사업기회
    "opportunity_code": ("opportunity_code", "opportunityCode", "opp_code"),
    "opportunity_name": ("opportunity_name", "opportunityName", "oppName"),
    # 고객사
    "customer_name":   ("customer_name", "customerName", "custName",
                        "customerCompanyName"),
    "customer_group":  ("customer_group", "customerGroup"),
    "customer_type":   ("customer_type", "customerType"),
    # 사업 속성
    "current_status":  ("current_status", "currentStatus", "opportunityStatus"),
    "business_type":   ("business_type", "businessType"),
    "expected_amount": ("expected_amount", "expectedAmount", "estimatedAmount"),
    # 계약
    "contract_code":   ("contract_code", "contractCode"),
    "contract_status": ("contract_status", "contractStatus"),
    "contract_amount": ("contract_amount", "contractAmount"),
    "contract_date":   ("contract_date", "contractDate"),
    "contract_start_date": ("contract_start_date", "contractStartDate", "startDate"),
    "contract_end_date":   ("contract_end_date", "contractEndDate", "endDate"),
    "payment_terms":   ("payment_terms", "paymentTerms"),
    "business_scope":  ("business_scope", "businessScope"),
    # 프로젝트
    "project_code":    ("project_code", "projectCode"),
    "project_status":  ("project_status", "projectStatus"),
    "project_type":    ("project_type", "projectType"),
    "project_owner":   ("project_owner", "projectOwner"),
    "team_name":       ("team_name", "teamName"),
    "delivery_date":   ("delivery_date", "deliveryDate"),
    "project_report_code": ("project_report_code", "projectReportCode"),
    "result_status":   ("result_status", "resultStatus"),
    "detail_content":  ("detail_content", "detailContent"),
    "pjt_no":          ("pjt_no", "pjtNo"),
    # 유지보수
    "maintenance_code":  ("maintenance_code", "maintenanceCode"),
    "contract_type":     ("contract_type", "contractType"),
    "status":            ("status",),
    "maintenance_start_date": ("maintenance_start_date", "maintenanceStartDate"),
    "maintenance_end_date":   ("maintenance_end_date", "maintenanceEndDate"),
    "activity_date":     ("activity_date", "activityDate", "latestActivityDate"),
    "activity_type":     ("activity_type", "activityType"),
    "activity_content":  ("activity_content", "activityContent"),
    "performance":       ("performance",),
    # 공통
    "memo":              ("memo", "note", "specialNote"),
    "special_notes":     ("special_notes", "specialNotes", "memo"),
    "main_content":      ("main_content", "mainContent"),
    "issue_content":     ("issue_content", "issueContent"),
    "competitor_status": ("competitor_status", "competitorStatus"),
    "decision_structure":("decision_structure", "decisionStructure"),
    "contact_line":      ("contact_line", "contactLine"),
    "document_series_code": ("document_series_code", "documentSeriesCode", "root_document_code"),
    "document_version":  ("document_version", "documentVersion", "version", "revision"),
    "is_latest_version": ("is_latest_version", "isLatestVersion", "latestVersion"),
}
