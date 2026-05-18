import re
from calendar import monthrange
from dataclasses import asdict
from datetime import date, datetime, time, timedelta, timezone

from app.models.normalization import QueryNormalization, TimeRange


KST = timezone(timedelta(hours=9))
TOKEN_PATTERN = re.compile(r"[0-9A-Za-z가-힣][0-9A-Za-z가-힣_.-]*")
QUOTED_PATTERN = re.compile(r"'([^']+)'|\"([^\"]+)\"")
LIMIT_PATTERN = re.compile(r"(?:top\s*|상위\s*|)(\d{1,2})\s*(?:개|건|명)?", re.IGNORECASE)
STOPWORDS = {
    "누가",
    "언제",
    "무엇",
    "뭐",
    "했는지",
    "알려줘",
    "보여줘",
    "찾아줘",
    "정리해줘",
    "요약해줘",
    "사업",
    "결과",
    "올해",
    "지금",
    "진행중인",
    "상반기",
    "하반기",
    "지난달",
    "이번달",
    "최근",
    "유지보수",
    "구축",
    "고도화",
    "전환",
    "통합",
    "자동화",
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
    "계약",
    "현황",
    "상태",
    "코드",
    "프로젝트",
    "활동",
    "영업활동",
    "업무",
    "기준",
    "근거",
    "비교",
    "가장",
    "제일",
    "최고",
    "좋은",
    "우수한",
    "높은",
    "수익성의",
    "사업기회",
    "고객사",
    "의사결정",
    "구조",
    "포인트",
    "중에서",
    "하나만",
    "말해줘",
    "많았던",
    "많은",
    "사업들",
    "결과에서",
    "상반기",
    "하반기",
    "올해",
    "작년",
    "ITSM",
    "EMS",
    "AIOps",
    "Dashboard",
    "Security",
    "CloudOps",
    "ITO",
    "SLA",
    "무상",
    "유상",
    "전환",
    "후보",
    "끝나고",
    "기준으로",
    "비교해줘",
}
TARGET_HINTS: tuple[tuple[str, str, list[str]], ...] = (
    ("maintenance", "maintenance", ["MAINTENANCE", "MAINTENANCE_QUOTE", "CUSTOMER_SUPPORT", "ATTACHMENT"]),
    ("유지보수", "maintenance", ["MAINTENANCE", "MAINTENANCE_QUOTE", "CUSTOMER_SUPPORT", "ATTACHMENT"]),
    ("장애", "maintenance", ["MAINTENANCE", "CUSTOMER_SUPPORT", "ATTACHMENT"]),
    ("사후영업", "activity", ["POST_SALES", "SALES_ACTIVITY", "ATTACHMENT"]),
    ("영업활동", "activity", ["SALES_ACTIVITY", "POST_SALES", "ATTACHMENT"]),
    ("활동", "activity", ["SALES_ACTIVITY", "POST_SALES", "ATTACHMENT"]),
    ("데모", "activity", ["SALES_ACTIVITY", "POST_SALES", "ATTACHMENT"]),
    ("워크숍", "activity", ["SALES_ACTIVITY", "POST_SALES", "ATTACHMENT"]),
    ("미팅", "activity", ["SALES_ACTIVITY", "POST_SALES", "ATTACHMENT"]),
    ("회의", "activity", ["SALES_ACTIVITY", "POST_SALES", "ATTACHMENT"]),
    ("수주보고서", "contract", ["ORDER_REPORT", "WON", "CONTRACT", "ATTACHMENT"]),
    ("수주 보고서", "contract", ["ORDER_REPORT", "WON", "CONTRACT", "ATTACHMENT"]),
    ("수주보고", "contract", ["ORDER_REPORT", "WON", "CONTRACT", "ATTACHMENT"]),
    ("실주", "opportunity", ["LOST", "BID_RESULT", "PROJECT_OPPORTUNITY", "ATTACHMENT"]),
    ("계약", "contract", ["CONTRACT", "WON", "ORDER_REPORT", "BID_RESULT", "ATTACHMENT"]),
    ("수주", "contract", ["WON", "ORDER_REPORT", "BID_RESULT", "CONTRACT", "ATTACHMENT"]),
    ("RFP 분석", "document", ["RFP_ANALYSIS", "RFP", "ATTACHMENT"]),
    ("RFP분석", "document", ["RFP_ANALYSIS", "RFP", "ATTACHMENT"]),
    ("rfp 분석", "document", ["RFP_ANALYSIS", "RFP", "ATTACHMENT"]),
    ("rfp분석", "document", ["RFP_ANALYSIS", "RFP", "ATTACHMENT"]),
    ("RFP", "document", ["RFP", "RFP_ANALYSIS", "ATTACHMENT"]),
    ("rfp", "document", ["RFP", "RFP_ANALYSIS", "ATTACHMENT"]),
    ("검토 내용", "document", ["RFP_ANALYSIS", "RFP", "ATTACHMENT"]),
    ("검토내용", "document", ["RFP_ANALYSIS", "RFP", "ATTACHMENT"]),
    ("지원 여부", "document", ["RFP_ANALYSIS", "RFP", "ATTACHMENT"]),
    ("지원여부", "document", ["RFP_ANALYSIS", "RFP", "ATTACHMENT"]),
    ("공수", "document", ["RFP_ANALYSIS", "RFP", "ATTACHMENT"]),
    ("모듈", "general", ["MODULE", "PROJECT_OPPORTUNITY", "ATTACHMENT"]),
    ("사업", "opportunity", ["PROJECT_OPPORTUNITY", "SALES_ACTIVITY", "RFP", "RFP_ANALYSIS", "PRB", "PROPOSAL", "ATTACHMENT"]),
    ("프로젝트", "project", ["PROJECT", "PROJECT_RESULT_REPORT", "PROJECT_OPPORTUNITY", "ATTACHMENT"]),
    # 견적 — QUOTATION/MAINTENANCE_QUOTE chunk 에 workflow_summary 가 있어 결재 질의 대응
    ("견적", "document", ["QUOTATION", "MAINTENANCE_QUOTE", "ATTACHMENT"]),
    ("제안", "document", ["PROPOSAL", "RFP", "RFP_ANALYSIS", "PRB", "PRB_RESULT", "ATTACHMENT"]),
    # 청구/수금/세금계산서 → BILLING + ORDER_REPORT (사업기회 청구 컨텍스트)
    ("청구", "billing", ["BILLING", "ORDER_REPORT", "PROJECT_OPPORTUNITY", "ATTACHMENT"]),
    ("청구서", "billing", ["BILLING", "ORDER_REPORT", "PROJECT_OPPORTUNITY", "ATTACHMENT"]),
    ("수금", "billing", ["BILLING", "ORDER_REPORT", "PROJECT_OPPORTUNITY", "ATTACHMENT"]),
    ("미수금", "billing", ["BILLING", "ORDER_REPORT", "PROJECT_OPPORTUNITY", "ATTACHMENT"]),
    ("세금계산서", "billing", ["BILLING", "ORDER_REPORT", "PROJECT_OPPORTUNITY", "ATTACHMENT"]),
    # 라이선스 → LICENSE 도메인
    ("라이선스", "license", ["LICENSE", "ORDER_REPORT", "MODULE", "ATTACHMENT"]),
    ("라이센스", "license", ["LICENSE", "ORDER_REPORT", "MODULE", "ATTACHMENT"]),
    # 고객지원/CS → CUSTOMER_SUPPORT
    ("고객지원", "customer_support", ["CUSTOMER_SUPPORT", "MAINTENANCE", "ATTACHMENT"]),
    ("고객 지원", "customer_support", ["CUSTOMER_SUPPORT", "MAINTENANCE", "ATTACHMENT"]),
    # 결재/상신/승인 — 어떤 도메인인지 명확하지 않을 때 워크플로 가능 도메인 모두 후보에
    ("결재선", "general", ["BILLING", "CONTRACT", "QUOTATION", "ORDER_REPORT", "LICENSE",
                          "CUSTOMER_SUPPORT", "MAINTENANCE_QUOTE", "ATTACHMENT"]),
    ("결재라인", "general", ["BILLING", "CONTRACT", "QUOTATION", "ORDER_REPORT", "LICENSE",
                            "CUSTOMER_SUPPORT", "MAINTENANCE_QUOTE", "ATTACHMENT"]),
    ("상신", "general", ["BILLING", "CONTRACT", "QUOTATION", "ORDER_REPORT", "LICENSE",
                        "CUSTOMER_SUPPORT", "MAINTENANCE_QUOTE", "ATTACHMENT"]),
    ("결재 진행", "general", ["BILLING", "CONTRACT", "QUOTATION", "ORDER_REPORT", "LICENSE",
                              "CUSTOMER_SUPPORT", "MAINTENANCE_QUOTE", "ATTACHMENT"]),
    ("결재 완료", "general", ["BILLING", "CONTRACT", "QUOTATION", "ORDER_REPORT", "LICENSE",
                              "CUSTOMER_SUPPORT", "MAINTENANCE_QUOTE", "ATTACHMENT"]),
    ("결재 대기", "general", ["BILLING", "CONTRACT", "QUOTATION", "ORDER_REPORT", "LICENSE",
                              "CUSTOMER_SUPPORT", "MAINTENANCE_QUOTE", "ATTACHMENT"]),
    # 위험요인/리스크 — PRB 가 위험요인 enrichment 한 도메인 (opp_code + risk 짝 케이스 대응)
    ("위험요인", "general", ["PRB", "PRB_RESULT", "PROJECT_OPPORTUNITY", "RFP_ANALYSIS", "ATTACHMENT"]),
    ("위험 요인", "general", ["PRB", "PRB_RESULT", "PROJECT_OPPORTUNITY", "RFP_ANALYSIS", "ATTACHMENT"]),
    ("리스크", "general", ["PRB", "PRB_RESULT", "PROJECT_OPPORTUNITY", "RFP_ANALYSIS", "ATTACHMENT"]),
    # 회사/파트너 — COMPANY chunk
    ("파트너", "general", ["COMPANY", "PROJECT_OPPORTUNITY", "ATTACHMENT"]),
    ("협력사", "general", ["COMPANY", "PROJECT_OPPORTUNITY", "ATTACHMENT"]),
    ("벤더", "general", ["COMPANY", "ATTACHMENT"]),
    ("파트너사", "general", ["COMPANY", "PROJECT_OPPORTUNITY", "ATTACHMENT"]),
    # 사업 단계/현재 단계/현황 — PROJECT_OPPORTUNITY 가 stage 정보 포함
    ("현재 단계", "opportunity", ["PROJECT_OPPORTUNITY", "PROJECT", "MAINTENANCE", "ATTACHMENT"]),
    ("진행 단계", "opportunity", ["PROJECT_OPPORTUNITY", "PROJECT", "MAINTENANCE", "ATTACHMENT"]),
    ("진행상황", "opportunity", ["PROJECT_OPPORTUNITY", "PROJECT", "MAINTENANCE", "SALES_ACTIVITY", "ATTACHMENT"]),
    ("진행 상황", "opportunity", ["PROJECT_OPPORTUNITY", "PROJECT", "MAINTENANCE", "SALES_ACTIVITY", "ATTACHMENT"]),
    # 라이프사이클 — 모든 도메인
    ("라이프사이클", "opportunity", [
        "PROJECT_OPPORTUNITY", "RFP", "PRB", "PRB_RESULT", "PROPOSAL", "BID_RESULT",
        "ORDER_REPORT", "CONTRACT", "PROJECT", "MAINTENANCE", "BILLING", "ATTACHMENT",
    ]),
    ("전체 라이프사이클", "opportunity", [
        "PROJECT_OPPORTUNITY", "RFP", "PRB", "PRB_RESULT", "PROPOSAL", "BID_RESULT",
        "ORDER_REPORT", "CONTRACT", "PROJECT", "MAINTENANCE", "BILLING", "ATTACHMENT",
    ]),
)


def normalize_query_context(query: str, *, today: date | None = None) -> QueryNormalization:
    today = today or datetime.now(KST).date()
    normalized_query = " ".join(query.lower().split())
    target_hint, source_type_hints = infer_target_hints(query)
    time_range = parse_time_range(query, today=today)
    segment_label, segment_keywords = infer_customer_segment(query)
    business_types = infer_business_types(query)
    proposal_types = infer_proposal_types(query)
    list_intent = infer_list_opportunity_intent(query)

    return QueryNormalization(
        original_query=query,
        normalized_query=normalized_query,
        target_hint=target_hint,
        source_type_hints=source_type_hints,
        entity_terms=extract_entity_terms(query),
        scope_terms=extract_scope_terms(query),
        requested_limit=extract_requested_limit(query),
        time_range=time_range,
        has_ranking_intent=has_ranking_intent(normalized_query),
        has_metric_hint=has_metric_hint(normalized_query),
        has_timeline_intent=has_timeline_intent(normalized_query),
        has_summary_intent=has_summary_intent(normalized_query),
        customer_segment_label=segment_label,
        customer_name_keywords=segment_keywords,
        business_type_filters=business_types,
        proposal_type_filters=proposal_types,
        list_opportunity_intent=list_intent,
    )


def summarize_normalization(normalization: QueryNormalization) -> str:
    parts = [
        f"target_hint={normalization.target_hint}",
        f"source_type_hints={normalization.source_type_hints}",
        f"entity_terms={normalization.entity_terms}",
        f"scope_terms={normalization.scope_terms}",
        f"requested_limit={normalization.requested_limit}",
        f"time_range={asdict(normalization.time_range)}",
        f"has_ranking_intent={normalization.has_ranking_intent}",
        f"has_metric_hint={normalization.has_metric_hint}",
        f"has_timeline_intent={normalization.has_timeline_intent}",
        f"has_summary_intent={normalization.has_summary_intent}",
    ]
    return "\n".join(parts)


def infer_target_hints(query: str) -> tuple[str, list[str]]:
    """질문에 매칭되는 모든 hint 의 source_types 를 결합해 반환.

    - target_hint 는 첫 번째로 매칭된 keyword 의 것을 사용 (호환성)
    - source_types 는 모든 매칭된 keyword 의 것을 OR 결합 (cross-domain 질의 대응)
    """
    primary_target: str | None = None
    combined_source_types: list[str] = []
    for keyword, target, source_types in TARGET_HINTS:
        if keyword in query:
            if primary_target is None:
                primary_target = target
            for st in source_types:
                if st not in combined_source_types:
                    combined_source_types.append(st)
    if primary_target is None:
        return "general", []
    return primary_target, combined_source_types


def extract_entity_terms(query: str) -> list[str]:
    terms: list[str] = []
    for match in QUOTED_PATTERN.finditer(query):
        value = next((group for group in match.groups() if group), None)
        if value:
            append_unique(terms, value.strip())

    for token in TOKEN_PATTERN.findall(query):
        normalized = token.strip()
        if len(normalized) < 2:
            continue
        if normalized in STOPWORDS:
            continue
        append_unique(terms, normalized)

    return terms[:12]


def extract_scope_terms(query: str) -> list[str]:
    terms: list[str] = []
    for term in extract_entity_terms(query):
        normalized = term.strip()
        if len(normalized) < 2:
            continue
        if normalized in STOPWORDS:
            continue
        if normalized.lower() in {"top", "rfp", "prb"}:
            continue
        append_unique(terms, normalized)
    return terms[:8]


def extract_requested_limit(query: str) -> int | None:
    match = LIMIT_PATTERN.search(query)
    if not match:
        return None
    value = int(match.group(1))
    if value <= 0:
        return None
    return min(value, 10)


def has_ranking_intent(normalized_query: str) -> bool:
    keywords = ("가장", "제일", "최고", "최대", "상위", "top", "순위", "좋은", "우수한", "높은")
    return any(keyword in normalized_query for keyword in keywords)


def has_metric_hint(normalized_query: str) -> bool:
    keywords = (
        "횟수",
        "건수",
        "금액",
        "총액",
        "총금액",
        "총비용",
        "비용",
        "단가",
        "예산",
        "매출",
        "이익",
        "수익성",
        "사업비",
        "수주율",
        "수주 가능성",
        "기대 수주율",
        "예상 수주율",
        "리스크",
        "위험",
        "위험요인",
        "급한",
        "급해",
        "긴급",
        "우선",
        "최신",
        "기간",
        "최근",
        "오래된",
        "확률",
        "달성률",
    )
    return any(keyword in normalized_query for keyword in keywords)


def has_timeline_intent(normalized_query: str) -> bool:
    keywords = ("언제", "이력", "타임라인", "순서", "흐름")
    return any(keyword in normalized_query for keyword in keywords)


def has_summary_intent(normalized_query: str) -> bool:
    keywords = ("요약", "정리", "의미있는", "핵심", "결과")
    return any(keyword in normalized_query for keyword in keywords)


# Nkia 공식 customer_type 은 7개로 한정(금융/국방/교통/의료/제조/공기업/지자체).
# 사용자가 자연어로 말하는 '카드사/저축은행/캐피탈' 같은 sub-segment 는 공식 분류에 없으므로
# 회사명 키워드로 풀어 후처리에서 매칭한다.
CUSTOMER_SEGMENT_KEYWORDS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("공공 고객", "공공", ()),
    ("공공기관", "공공", ()),
    ("공기업", "공공", ()),
    ("공공", "공공", ()),
    ("민간 고객", "민간", ()),
    ("민간기업", "민간", ()),
    ("민간", "민간", ()),
    ("저축은행", "저축은행", ("저축은행",)),
    ("카드사", "카드사", ("카드",)),
    ("카드회사", "카드사", ("카드",)),
    ("신용카드", "카드사", ("카드",)),
    ("캐피탈", "캐피탈", ("캐피탈",)),
    ("생명보험", "생명보험", ("생명",)),
    ("손해보험", "손해보험", ("손해보험", "화재")),
    ("보험사", "보험사", ("보험",)),
    ("증권사", "증권사", ("증권",)),
    ("시중은행", "시중은행", ("은행",)),
    ("지방은행", "지방은행", ("은행",)),
)


# 표준 사업 구분 (검토 의견 03_입찰: EMS, ITSM, Automation, WSS).
BUSINESS_TYPE_ALIASES: tuple[tuple[str, str], ...] = (
    ("ems", "EMS"),
    ("itsm", "ITSM"),
    ("automation", "Automation"),
    ("자동화", "Automation"),
    ("wss", "WSS"),
)


# 제안 형태 (자체 제안, SI 제안).
PROPOSAL_TYPE_ALIASES: tuple[tuple[str, str], ...] = (
    ("자체 제안", "자체"),
    ("자체제안", "자체"),
    ("si 제안", "SI"),
    ("si제안", "SI"),
)


def infer_customer_segment(query: str) -> tuple[str | None, list[str]]:
    """자연어 customer segment 를 회사명 LIKE 키워드로 변환한다.

    예) '카드사 사업기회' → label='카드사', keywords=['카드']
    가장 구체적인 segment(저축은행 > 시중은행 > 은행)가 우선이며,
    1개의 segment 만 반환한다 (복수 segment 는 metadata_filter 단계에서 OR 조합).
    """

    normalized = " ".join(query.lower().split())
    for source_keyword, label, name_keywords in CUSTOMER_SEGMENT_KEYWORDS:
        if source_keyword in normalized:
            return label, list(name_keywords)
    return None, []


def infer_business_types(query: str) -> list[str]:
    normalized = " ".join(query.lower().split())
    matched: list[str] = []
    for alias, canonical in BUSINESS_TYPE_ALIASES:
        if alias in normalized and canonical not in matched:
            matched.append(canonical)
    return matched


def infer_proposal_types(query: str) -> list[str]:
    normalized = " ".join(query.lower().split())
    matched: list[str] = []
    for alias, canonical in PROPOSAL_TYPE_ALIASES:
        if alias in normalized and canonical not in matched:
            matched.append(canonical)
    return matched


def infer_list_opportunity_intent(query: str) -> bool:
    """'카드사 사업기회 뭐있어?' / '최근 사업기회 5개' 같은 사업기회 목록 의도 감지."""

    normalized = " ".join(query.lower().split())
    has_opportunity_word = any(
        keyword in normalized for keyword in ("사업기회", "영업기회", "사업 기회", "영업 기회")
    )
    if not has_opportunity_word:
        return False
    list_keywords = (
        "뭐있", "뭐 있", "어떤", "리스트", "목록", "현황", "있는지", "있어",
        "최근", "최근에", "신규", "이번", "전체", "모든",
        "보여", "알려", "찾아",
    )
    if any(keyword in normalized for keyword in list_keywords):
        return True
    # 숫자 + (개|건|건의|개의) 패턴 — '사업기회 5개', '사업기회 10건'
    if re.search(r"\d+\s*(개|건)", normalized):
        return True
    return False


def parse_time_range(query: str, *, today: date) -> TimeRange:
    compact_query = re.sub(r"\s+", "", query)
    current_year = today.year
    quarter_with_year = re.search(r"(20\d{2})년?([1-4])분기", compact_query)
    if quarter_with_year:
        year = int(quarter_with_year.group(1))
        quarter = int(quarter_with_year.group(2))
        return build_quarter_range(year, quarter)

    quarter_without_year = re.search(r"([1-4])분기", compact_query)
    if quarter_without_year:
        quarter = int(quarter_without_year.group(1))
        return build_quarter_range(current_year, quarter)

    month_with_year = re.search(r"(20\d{2})년?(\d{1,2})월", compact_query)
    if month_with_year:
        year = int(month_with_year.group(1))
        month = int(month_with_year.group(2))
        if 1 <= month <= 12:
            return build_month_range(year, month)

    month_without_year = re.search(r"(?<!\d)(\d{1,2})월", compact_query)
    if month_without_year:
        month = int(month_without_year.group(1))
        if 1 <= month <= 12:
            return build_month_range(current_year, month)

    # 연도 명시 + 상/하반기 (e.g., "2025년 하반기") — generic 하반기보다 먼저
    year_half_match = re.search(r"(20\d{2})년?\s*([상하])반기", query)
    if year_half_match:
        year = int(year_half_match.group(1))
        half = year_half_match.group(2)
        if half == "상":
            return build_time_range(f"{year} 상반기", date(year, 1, 1), date(year, 6, 30))
        else:
            return build_time_range(f"{year} 하반기", date(year, 7, 1), date(year, 12, 31))

    # 상대 연도 + 상/하반기 — generic 하반기보다 먼저
    if "작년 상반기" in query or "작년상반기" in compact_query:
        last_year = current_year - 1
        return build_time_range(f"{last_year} 상반기", date(last_year, 1, 1), date(last_year, 6, 30))
    if "작년 하반기" in query or "작년하반기" in compact_query:
        last_year = current_year - 1
        return build_time_range(f"{last_year} 하반기", date(last_year, 7, 1), date(last_year, 12, 31))
    if "올해 상반기" in query or "올해상반기" in compact_query:
        return build_time_range(f"{current_year} 상반기", date(current_year, 1, 1), date(current_year, 6, 30))
    if "올해 하반기" in query or "올해하반기" in compact_query:
        return build_time_range(f"{current_year} 하반기", date(current_year, 7, 1), date(current_year, 12, 31))
    if "상반기" in query or "상반기" in compact_query:
        return build_time_range(f"{current_year} 상반기", date(current_year, 1, 1), date(current_year, 6, 30))
    if "하반기" in query or "하반기" in compact_query:
        return build_time_range(f"{current_year} 하반기", date(current_year, 7, 1), date(current_year, 12, 31))
    if "올해" in query:
        return build_time_range(f"{current_year}년", date(current_year, 1, 1), date(current_year, 12, 31))
    if "금년" in query:
        return build_time_range(f"{current_year}년", date(current_year, 1, 1), date(current_year, 12, 31))
    explicit_year = re.search(r"(20\d{2})년", compact_query)
    if explicit_year:
        year = int(explicit_year.group(1))
        return build_time_range(f"{year}년", date(year, 1, 1), date(year, 12, 31))
    if "작년" in query:
        last_year = current_year - 1
        return build_time_range(f"{last_year}년", date(last_year, 1, 1), date(last_year, 12, 31))
    if "전년" in query:
        last_year = current_year - 1
        return build_time_range(f"{last_year}년", date(last_year, 1, 1), date(last_year, 12, 31))
    if "이번분기" in compact_query:
        quarter = ((today.month - 1) // 3) + 1
        return build_quarter_range(current_year, quarter)
    if "지난분기" in compact_query:
        current_quarter = ((today.month - 1) // 3) + 1
        if current_quarter == 1:
            return build_quarter_range(current_year - 1, 4)
        return build_quarter_range(current_year, current_quarter - 1)
    if "이번달" in compact_query:
        start = date(today.year, today.month, 1)
        end = date(today.year, today.month, monthrange(today.year, today.month)[1])
        return build_time_range(f"{today.year}-{today.month:02d}", start, end)
    if "지난달" in compact_query:
        first_of_month = date(today.year, today.month, 1)
        prev_month_end = first_of_month - timedelta(days=1)
        start = date(prev_month_end.year, prev_month_end.month, 1)
        end = date(prev_month_end.year, prev_month_end.month, monthrange(prev_month_end.year, prev_month_end.month)[1])
        return build_time_range(f"{prev_month_end.year}-{prev_month_end.month:02d}", start, end)
    if "이번주" in compact_query or "금주" in compact_query:
        # 이번 주 월요일 ~ 일요일 (today.weekday()=0이 월)
        monday = today - timedelta(days=today.weekday())
        sunday = monday + timedelta(days=6)
        return build_time_range(f"이번주({monday}~{sunday})", monday, sunday)
    if "지난주" in compact_query or "전주" in compact_query:
        monday_this = today - timedelta(days=today.weekday())
        monday_last = monday_this - timedelta(days=7)
        sunday_last = monday_last + timedelta(days=6)
        return build_time_range(f"지난주({monday_last}~{sunday_last})", monday_last, sunday_last)
    if "다음주" in compact_query or "차주" in compact_query:
        monday_this = today - timedelta(days=today.weekday())
        monday_next = monday_this + timedelta(days=7)
        sunday_next = monday_next + timedelta(days=6)
        return build_time_range(f"다음주({monday_next}~{sunday_next})", monday_next, sunday_next)

    recent_days_match = re.search(r"최근\s*(\d{1,3})\s*일", query)
    if recent_days_match:
        days = int(recent_days_match.group(1))
        start = today - timedelta(days=max(days - 1, 0))
        return build_time_range(f"최근 {days}일", start, today)

    return TimeRange()


def build_time_range(label: str, start_date: date, end_date: date) -> TimeRange:
    start_at = datetime.combine(start_date, time.min, tzinfo=KST).isoformat()
    end_at = datetime.combine(end_date, time.max.replace(microsecond=0), tzinfo=KST).isoformat()
    return TimeRange(label=label, start_at=start_at, end_at=end_at)


def build_month_range(year: int, month: int) -> TimeRange:
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    return build_time_range(f"{year}-{month:02d}", start, end)


def build_quarter_range(year: int, quarter: int) -> TimeRange:
    start_month = ((quarter - 1) * 3) + 1
    end_month = start_month + 2
    start = date(year, start_month, 1)
    end = date(year, end_month, monthrange(year, end_month)[1])
    return build_time_range(f"{year} Q{quarter}", start, end)


def append_unique(target: list[str], value: str) -> None:
    if value and value not in target:
        target.append(value)
