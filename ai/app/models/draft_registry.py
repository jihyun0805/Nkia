# 인수인계: 챗봇이 만들 수 있는 초안 문서 타입과 slot catalog를 등록하는 파일입니다.
# 핵심 흐름: 사용자 발화가 “작성/초안”이면 이 registry 기준으로 LLM payload를 제한합니다.
# 같이 확인: 문서 타입 추가 시 draft_service와 ChatActions prefill payload도 확인하세요.
from __future__ import annotations

from app.models.draft import DocumentDraftSpec


# 슬롯 키는 BE 어댑터가 폼 필드로 매핑하는 source of truth.
# 검토 의견 (01_발굴 ~ 06_유지보수, 2026.4.23/4.27, 엔키아) 기반의 Nkia 표준 양식을 반영한다.

# 견적서 (검토 의견 02_활동_견적): 고객사, 사업명(사업기회), 제안 유형(자체/SI),
#   제품군(EMS/ITSM/Automation/WSS), 견적 합계 금액, 견적일, 영업대표, 첨부 견적서.
_QUOTATION_SLOTS = [
    "title",
    "customer_name",
    "customer_code",
    "opportunity_code",
    "opportunity_name",
    "proposal_type",       # 자체 / SI
    "product_family",      # EMS / ITSM / Automation / WSS
    "quote_date",
    "total_amount",
    "currency",
    "sales_representative",
    "items",               # 표준 가격표 행 (제품분류/제품군/제품명/라이선스기준/단위/단가/할인율/제안가)
    "remarks",
]

# 영업활동 (02_활동): 등록자, 요청자, 활동일, 활동형태(이메일/전화/대면미팅/영상회의/기타),
#   활동내용(상담/제품소개/데모/PoC/BMT/자료전달/RFP분석/제안서작성/SI제안서작성/기타),
#   활동장소, 참석자, 주요 내용. (사업기회 미확인 가능)
_SALES_ACTIVITY_SLOTS = [
    "title",
    "customer_name",
    "customer_code",
    "opportunity_code",
    "opportunity_name",
    "activity_form",       # 이메일/전화/대면미팅/영상회의/기타
    "activity_content",    # 상담/제품소개/데모/PoC/BMT/자료전달/RFP분석/제안서작성/SI제안서작성/기타
    "activity_date",
    "activity_location",
    "participants",
    "registered_by",       # 등록자 (로그인 ID 기반 자동, 모를 때 null)
    "requested_by",        # 요청자 (없으면 null)
    "summary",             # 주요 내용
    "next_action",         # 후속 조치
]

# RFP 분석 (03_입찰): 고객사, 사업명, 사업 구분(EMS/ITSM/Automation/WSS),
#   납품 모듈, 제안 형태(자체/SI), H/W 제공 주체, 주요사업내용(특이점), 금액 규모,
#   예상 사업기간, 사업장소, 제안서 접수마감일, 영업대표, 담당자, 요청일,
#   + RFP 분석 항목 (배열형: 연번/구분/요구사항고유번호/요구사항명칭/요구사항내용/지원여부/검토내용/공수)
_RFP_ANALYSIS_SLOTS = [
    "title",
    "customer_name",
    "opportunity_code",
    "opportunity_name",
    "business_division",   # 사업 구분: EMS / ITSM / Automation / WSS
    "delivery_module",     # 납품 모듈 (SMS, NMS 등)
    "proposal_type",       # 자체 / SI
    "hardware_provider",   # H/W 제공 주체
    "business_overview",   # 주요사업내용 (특이점)
    "budget_size",         # 금액 규모
    "expected_period",     # 예상 사업기간
    "business_location",   # 사업장소
    "submission_deadline", # 제안서 접수마감일
    "sales_representative",
    "manager",             # 담당자 (RFP 분석 진행자)
    "requested_at",        # 요청일
    "requirements",        # 배열: {category, requirement_no, requirement_name, requirement_detail, support_status, review_note, mandays}
    "risk_points",         # 자유 입력: 식별된 리스크 포인트
    "recommended_strategy",# 자유 입력: 추천 전략
]

# PRB 보고서 (03_입찰): 별도 양식(엑셀 파일 참조). 일반 슬롯 + 결재 라인 정보.
_PRB_REPORT_SLOTS = [
    "title",
    "customer_name",
    "opportunity_code",
    "opportunity_name",
    "submission_deadline",
    "decision_target",
    "background",
    "decision_options",
    "expected_amount",
    "expected_win_rate",
    "risk_summary",
    "recommendation",
    "sales_representative", # 작성자 (영업대표)
]

# PRB 결과 (03_입찰): PRB 보고서 영역 + 결과 영역 (일시/장소/참석자/결과)
_PRB_RESULT_SLOTS = [
    "title",
    "customer_name",
    "opportunity_code",
    "opportunity_name",
    "prb_report_reference", # 연결될 PRB 보고서 코드
    "result_meeting_date",
    "result_meeting_location",
    "participants",
    "decision",
    "result_summary",
]

# 제안서 (03_입찰): 고객사명, 사업명, 제안형태, 제품군, 요청일, 제안서 마감일,
#   영업대표, 담당자, 첨부파일.
_PROPOSAL_SLOTS = [
    "title",
    "customer_name",
    "opportunity_code",
    "opportunity_name",
    "proposal_type",       # 자체 / SI
    "product_family",      # EMS / ITSM / Automation / WSS
    "requested_at",
    "submission_deadline",
    "sales_representative",
    "manager",
    "proposal_summary",    # 제안 핵심 메시지 (요약)
    "value_propositions",  # 가치 제안 포인트 (배열)
    "scope_of_work",       # 작업 범위
    "schedule_overview",   # 일정 개요
    "estimated_amount",    # 예상 금액
    "differentiators",     # 차별 포인트
]

# 입찰 결과 (03_입찰): 고객사, 사업명, 제안형태, 제품군, 제안서 마감일,
#   입찰 결과(수주/실주), 영업대표, 상태(미정/수주/실주). (별도 엑셀 양식 참조)
_BID_RESULT_SLOTS = [
    "title",
    "customer_name",
    "opportunity_code",
    "opportunity_name",
    "proposal_type",
    "product_family",
    "submission_deadline",
    "result_status",       # 수주 / 실주
    "result_amount",
    "result_summary",
    "lessons_learned",
    "sales_representative",
]

# 결과 보고 (05_사업): 사업 종료 후 작성하는 결과 보고 (일반 슬롯 유지)
_PROJECT_RESULT_REPORT_SLOTS = [
    "title",
    "opportunity_code",
    "opportunity_name",
    "project_code",
    "customer_name",
    "completed_at",
    "results_summary",
    "achievements",
    "issues",
    "lessons_learned",
]


_DOCUMENT_DRAFT_REGISTRY: dict[str, DocumentDraftSpec] = {
    spec.type: spec
    for spec in (
        DocumentDraftSpec(
            type="quotation",
            label="견적서",
            keywords=["견적서", "견적", "quotation", "quote"],
            semantic_slots=_QUOTATION_SLOTS,
            primary_evidence_types=[
                "QUOTATION",
                "PROJECT_OPPORTUNITY",
                "MAINTENANCE_QUOTE",
                "PROPOSAL",
            ],
            description="제시된 근거를 바탕으로 견적서 초안을 작성합니다.",
        ),
        DocumentDraftSpec(
            type="sales_activity",
            label="영업활동",
            keywords=[
                "영업활동",
                "사업활동",
                "활동 보고",
                "활동보고",
                "영업 활동",
                "사후영업",
                "activity",
            ],
            semantic_slots=_SALES_ACTIVITY_SLOTS,
            primary_evidence_types=["SALES_ACTIVITY", "POST_SALES", "PROJECT_OPPORTUNITY"],
            description="대화 맥락의 활동 정보를 바탕으로 영업활동 초안을 작성합니다.",
        ),
        DocumentDraftSpec(
            type="rfp_analysis",
            label="RFP 분석",
            keywords=["rfp 분석", "rfp분석", "rfp 검토", "rfp"],
            semantic_slots=_RFP_ANALYSIS_SLOTS,
            primary_evidence_types=["RFP", "RFP_ANALYSIS", "ATTACHMENT", "PROJECT_OPPORTUNITY"],
            description="RFP 관련 근거를 바탕으로 RFP 분석 초안을 작성합니다.",
        ),
        DocumentDraftSpec(
            type="prb_report",
            label="PRB 보고서",
            keywords=["prb 보고서", "prb보고서", "prb 보고", "prb 의사결정", "prb"],
            semantic_slots=_PRB_REPORT_SLOTS,
            primary_evidence_types=["PRB", "PRB_RESULT", "PROJECT_OPPORTUNITY"],
            description="입찰 의사결정을 위한 PRB 보고서 초안을 작성합니다.",
        ),
        DocumentDraftSpec(
            type="prb_result",
            label="PRB 결과",
            keywords=["prb 결과", "prb결과", "prb 결과보고"],
            semantic_slots=_PRB_RESULT_SLOTS,
            primary_evidence_types=["PRB_RESULT", "PRB"],
            description="오프라인 PRB 회의 결과를 정리한 PRB 결과 보고 초안을 작성합니다.",
        ),
        DocumentDraftSpec(
            type="proposal",
            label="제안서",
            keywords=["제안서", "proposal"],
            semantic_slots=_PROPOSAL_SLOTS,
            primary_evidence_types=["PROPOSAL", "RFP", "RFP_ANALYSIS", "PROJECT_OPPORTUNITY"],
            description="제안서 초안 작성을 위한 핵심 슬롯을 채웁니다.",
        ),
        DocumentDraftSpec(
            type="bid_result",
            label="입찰 결과",
            keywords=["입찰 결과", "입찰결과", "수주 결과", "실주", "수주보고", "수주 보고"],
            semantic_slots=_BID_RESULT_SLOTS,
            primary_evidence_types=["BID_RESULT", "LOST", "WON", "ORDER_REPORT", "PROJECT_OPPORTUNITY"],
            description="입찰 결과 등록을 위한 초안을 작성합니다.",
        ),
        DocumentDraftSpec(
            type="project_result_report",
            label="결과 보고",
            keywords=["결과보고", "결과 보고", "프로젝트 결과", "result report"],
            semantic_slots=_PROJECT_RESULT_REPORT_SLOTS,
            primary_evidence_types=["PROJECT_RESULT_REPORT", "PROJECT", "ATTACHMENT"],
            description="사업 종료 후 결과 보고 초안을 작성합니다.",
        ),
    )
}


# 의도 트리거 키워드 (한 번이라도 포함되면 draft intent 후보로 본다)
# 짧은 명령형 ("작성", "만들기")도 인식 — 사용자가 자연스러운 한국어로 요청 가능
DRAFT_TRIGGER_KEYWORDS: tuple[str, ...] = (
    "초안",
    "초안 만들",
    "초안 작성",
    "초안을 만들",
    "초안을 작성",
    "임시 작성",
    "draft",
    "양식 채워",
    "양식 작성",
    "작성해줘",
    "작성 해줘",
    "작성해 줘",
    "작성해주세요",
    "작성 해주세요",
    "작성해주십시오",
    "만들어줘",
    "만들어주세요",
    "만들어 주세요",
    "만들어줄래",
    "만들 수 있어",
    "만들어볼래",
    "써줘",
    "써주세요",
    "써 주세요",
    "정리해줘",
    "정리해주세요",
    "정리 해줘",
    # 짧은 form — 도메인 키워드와 결합되어야만 trigger
    " 작성",
    " 만들기",
    " 만들어",
)


# 'cross-reference' 어휘. 이 어휘가 있으면 유사 사업기회의 견적서를 참고로 사용한다.
DRAFT_REFERENCE_KEYWORDS: tuple[str, ...] = (
    "비슷한",
    "유사한",
    "참고하여",
    "참고해서",
    "참고로",
    "이전과 비슷",
    "닮은",
    "기반으로",
    "사례를 바탕",
    "사례 참고",
    "과거 사례",
    "최근 사례",
    "수주 사례",
    "선례",
    "유사 사례",
    "비슷한 과거",
    "에 맞춰서",
    "에 맞게",
)


def get_document_draft_spec(document_type: str) -> DocumentDraftSpec | None:
    return _DOCUMENT_DRAFT_REGISTRY.get(document_type)


def list_document_draft_specs() -> list[DocumentDraftSpec]:
    return list(_DOCUMENT_DRAFT_REGISTRY.values())


def all_document_draft_types() -> list[str]:
    return list(_DOCUMENT_DRAFT_REGISTRY.keys())


def has_draft_reference_intent(query: str) -> bool:
    normalized = " ".join(query.lower().split())
    return any(keyword in normalized for keyword in DRAFT_REFERENCE_KEYWORDS)
