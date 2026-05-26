# 인수인계: 자연어 질문에서 정형 조회 의도, 순위 기준, 상태/기간/고객 조건을 규칙 기반으로 추출합니다.
# 핵심 흐름: LLM planner 없이도 자주 묻는 질문을 빠르게 DB 조회로 처리하기 위한 1차 해석기입니다.
# 같이 확인: 새 질문 패턴은 query_normalization_service.py와 metric_registry.py 용어도 같이 확인하세요.
import re

from app.models.intent import StructuredQueryIntent
from app.models.normalization import QueryNormalization
from app.services.metric_registry import resolve_metric_spec


DISCOVERY_PATTERN_KEYWORDS = (
    "반복",
    "공통",
    "패턴",
    "트렌드",
    "종합",
    "전반",
)


def parse_structured_query_intent(query: str, normalization: QueryNormalization | None = None) -> StructuredQueryIntent | None:
    normalized = normalize_query(query)
    if should_defer_to_query_planner(normalized):
        return None

    document_recency_intent = parse_document_recency_intent(normalized, normalization)
    if document_recency_intent is not None:
        return document_recency_intent

    count_rank_intent = parse_count_rank_intent(normalized, normalization)
    if count_rank_intent is not None:
        return count_rank_intent

    aggregate_total_intent = parse_aggregate_total_intent(normalized)
    if aggregate_total_intent is not None:
        return aggregate_total_intent

    period_summary_intent = parse_period_summary_intent(normalized, normalization)
    if period_summary_intent is not None:
        return period_summary_intent

    status_filters, status_label = parse_status_filters(normalized)

    metric_intent = parse_metric_rank_intent(normalized, status_filters, status_label)
    if metric_intent is not None:
        return metric_intent

    status_intent = parse_status_list_intent(normalized, status_filters, status_label)
    if status_intent is not None:
        return status_intent

    return None


def normalize_query(query: str) -> str:
    return " ".join(query.lower().split())


def should_defer_to_query_planner(normalized_query: str) -> bool:
    complex_condition_keywords = [
        "수주가 어려웠",
        "수주 어려웠",
        "어렵게 수주",
        "수주 난이도",
        "힘들게 수주",
        "중에서",
        "조건",
    ]
    rank_or_explain_keywords = [
        "리스크",
        "위험",
        "문제",
        "수주율",
        "경쟁",
        "경쟁사",
        "우위",
        "불리",
        "큰",
        "낮은",
        "높은",
    ]
    return any(keyword in normalized_query for keyword in complex_condition_keywords) and any(
        keyword in normalized_query for keyword in rank_or_explain_keywords
    )


def parse_document_recency_intent(
    normalized_query: str,
    normalization: QueryNormalization | None,
) -> StructuredQueryIntent | None:
    if not any(keyword in normalized_query for keyword in ["최근", "최신", "업로드", "등록", "생긴"]):
        return None
    if any(keyword in normalized_query for keyword in DISCOVERY_PATTERN_KEYWORDS):
        return None

    document_scope = resolve_document_scope(normalized_query)
    if document_scope is None:
        return None

    rank_position, result_count = parse_rank_request(normalized_query)
    if normalization is not None and normalization.requested_limit:
        result_count = max(normalization.requested_limit, result_count)

    recency_basis = "uploaded" if any(keyword in normalized_query for keyword in ["업로드", "등록", "생긴"]) else "document_date"
    return StructuredQueryIntent(
        intent_type="document_recency_rank",
        metric_label="최근성",
        rank_position=rank_position,
        result_count=max(result_count, 1),
        sort_direction="desc",
        source_types=[document_scope],
        document_scope=document_scope,
        recency_basis=recency_basis,
    )


def resolve_document_scope(normalized_query: str) -> str | None:
    if "prb 결과" in normalized_query or "prb결과" in normalized_query:
        return "PRB_RESULT"
    if "rfp 분석" in normalized_query or "rfp분석" in normalized_query:
        return "RFP_ANALYSIS"
    if "rfp" in normalized_query:
        return "RFP"
    if "prb" in normalized_query:
        return "PRB"
    if "제안서" in normalized_query or "제안 " in f"{normalized_query} ":
        return "PROPOSAL"
    if "수주보고서" in normalized_query or "수주 보고서" in normalized_query or "수주보고" in normalized_query:
        return "ORDER_REPORT"
    if "실주" in normalized_query:
        return "LOST"
    if "수주" in normalized_query:
        return "WON"
    if "계약서" in normalized_query or "계약 문서" in normalized_query:
        return "CONTRACT"
    if "결과보고서" in normalized_query:
        return "PROJECT_RESULT_REPORT"
    if "유지보수 견적서" in normalized_query or "유지보수견적서" in normalized_query:
        return "MAINTENANCE_QUOTE"
    return None


def parse_metric_rank_intent(
    normalized_query: str,
    status_filters: list[str],
    status_label: str | None,
) -> StructuredQueryIntent | None:
    rank_position, result_count = parse_rank_request(normalized_query)
    sort_direction = parse_sort_direction(normalized_query)
    metric_spec = resolve_metric_spec(normalized_query)
    if metric_spec is None:
        return None

    if sort_direction is None:
        has_rank_marker = rank_position > 1 or result_count > 1 or any(marker in normalized_query for marker in ["top", "탑", "상위"])
        if not has_rank_marker and "가장" not in normalized_query and "제일" not in normalized_query:
            return None
        sort_direction = metric_spec.default_sort_direction

    return StructuredQueryIntent(
        intent_type="metric_rank",
        metric_key=metric_spec.metric_key,
        metric_label=metric_spec.metric_label,
        rank_position=rank_position,
        result_count=result_count,
        sort_direction=sort_direction,
        status_filters=status_filters,
        status_label=status_label,
        source_types=list(metric_spec.source_types),
    )

def parse_status_list_intent(
    normalized_query: str,
    status_filters: list[str],
    status_label: str | None,
) -> StructuredQueryIntent | None:
    if not status_filters:
        return None

    list_keywords = ["목록", "리스트", "알려줘", "보여줘", "뭐 있어", "어떤 사업", "사업들", "건들"]
    if any(keyword in normalized_query for keyword in list_keywords):
        return StructuredQueryIntent(
            intent_type="status_list",
            status_filters=status_filters,
            status_label=status_label,
            source_types=["OPPORTUNITY"],
        )

    return None


def parse_count_rank_intent(
    normalized_query: str,
    normalization: QueryNormalization | None,
) -> StructuredQueryIntent | None:
    if normalization is None or not normalization.has_ranking_intent:
        return None

    rank_position, result_count = parse_rank_request(normalized_query)
    sort_direction = parse_sort_direction(normalized_query) or "desc"
    if "유지보수" in normalized_query and any(keyword in normalized_query for keyword in ["활동", "지원", "점검", "대응"]):
        contract_type = None
        if "유상" in normalized_query:
            contract_type = "유상"
        elif "무상" in normalized_query:
            contract_type = "무상"
        return StructuredQueryIntent(
            intent_type="count_rank",
            metric_label="활동 건수",
            rank_position=rank_position,
            result_count=result_count,
            sort_direction=sort_direction,
            count_domain="maintenance_activity",
            source_types=["MAINTENANCE", "CUSTOMER_SUPPORT", "ATTACHMENT"],
            contract_type=contract_type,
        )

    if ("영업활동" in normalized_query or "활동" in normalized_query) and any(
        keyword in normalized_query for keyword in ["횟수", "건수", "많", "적", "최다", "최소"]
    ):
        return StructuredQueryIntent(
            intent_type="count_rank",
            metric_label="활동 건수",
            rank_position=rank_position,
            result_count=result_count,
            sort_direction=sort_direction,
            count_domain="sales_activity",
            source_types=["SALES_ACTIVITY", "POST_SALES", "ATTACHMENT"],
        )

    if ("고객지원" in normalized_query or "지원" in normalized_query) and any(
        keyword in normalized_query for keyword in ["횟수", "건수", "많", "적", "최다", "최소"]
    ):
        return StructuredQueryIntent(
            intent_type="count_rank",
            metric_label="고객지원 건수",
            rank_position=rank_position,
            result_count=result_count,
            sort_direction=sort_direction,
            count_domain="customer_support",
            source_types=["CUSTOMER_SUPPORT", "MAINTENANCE", "ATTACHMENT"],
            contract_type="유상" if "유상" in normalized_query else ("무상" if "무상" in normalized_query else None),
        )

    return None


def parse_period_summary_intent(
    normalized_query: str,
    normalization: QueryNormalization | None,
) -> StructuredQueryIntent | None:
    if normalization is None or not normalization.time_range.label:
        return None
    summary_hints = ("실적", "매출", "총 매출", "총액")
    is_won_summary = (
        normalization.has_summary_intent or any(h in normalized_query for h in summary_hints)
    ) and any(keyword in normalized_query for keyword in ["수주", "실적", "계약", "매출"])

    if is_won_summary:
        return StructuredQueryIntent(
            intent_type="period_summary",
            summary_domain="won",
            metric_label="수주 실적",
            source_types=["WON", "ORDER_REPORT", "CONTRACT", "ATTACHMENT"],
            time_from=normalization.time_range.start_at,
            time_to=normalization.time_range.end_at,
            time_label=normalization.time_range.label,
        )

    # 청구 기반 period summary — 시간 범위 + billing 키워드만 있어도 진입
    # (summary_intent 미요구 — "지난달 청구 건" 같은 자연스러운 질의 대응)
    if any(keyword in normalized_query for keyword in ["청구", "수금", "발행", "세금계산서", "미수금"]):
        return StructuredQueryIntent(
            intent_type="period_summary",
            summary_domain="billing",
            metric_label="청구·수금",
            source_types=["BILLING"],
            time_from=normalization.time_range.start_at,
            time_to=normalization.time_range.end_at,
            time_label=normalization.time_range.label,
        )

    return None


def parse_aggregate_total_intent(normalized_query: str) -> StructuredQueryIntent | None:
    total_markers = ["총", "전체", "누적", "합계"]
    if not any(marker in normalized_query for marker in total_markers):
        return None

    if any(keyword in normalized_query for keyword in ["총 매출", "전체 매출", "누적 매출", "총 계약 금액", "계약 총액", "총 수주 금액", "누적 수주 금액"]):
        return StructuredQueryIntent(
            intent_type="aggregate_total",
            metric_key="contract_amount",
            metric_label="총 매출",
            source_types=["WON", "ORDER_REPORT", "CONTRACT"],
        )

    if any(keyword in normalized_query for keyword in ["총 예상 사업비", "예상 사업비 합계", "전체 예상 사업비"]):
        return StructuredQueryIntent(
            intent_type="aggregate_total",
            metric_key="expected_amount",
            metric_label="예상 사업비 합계",
            source_types=["OPPORTUNITY"],
        )

    return None


def parse_sort_direction(normalized_query: str) -> str | None:
    ascending_keywords = ["최저", "낮", "적", "작은", "하위"]
    descending_keywords = ["최고", "높", "많", "큰", "상위"]

    has_asc = any(keyword in normalized_query for keyword in ascending_keywords)
    has_desc = any(keyword in normalized_query for keyword in descending_keywords)

    if has_desc and not has_asc:
        return "desc"
    if has_asc and not has_desc:
        return "asc"
    return None


def parse_rank_request(normalized_query: str) -> tuple[int, int]:
    if "top" in normalized_query or "탑" in normalized_query or "상위" in normalized_query:
        count_match = re.search(r"(?:top|탑|상위)\s*(\d{1,2})", normalized_query)
        if count_match:
            return 1, max(int(count_match.group(1)), 1)

    ordinal_map = {
        "첫": 1,
        "첫번째": 1,
        "첫째": 1,
        "두번째": 2,
        "두 번째": 2,
        "둘째": 2,
        "세번째": 3,
        "세 번째": 3,
        "셋째": 3,
        "네번째": 4,
        "네 번째": 4,
        "넷째": 4,
        "다섯번째": 5,
        "다섯 번째": 5,
        "다섯째": 5,
    }
    compact_query = normalized_query.replace(" ", "")
    for keyword, position in ordinal_map.items():
        if keyword.replace(" ", "") in compact_query:
            return position, 1

    numeric_ordinal = re.search(r"(\d{1,2})\s*번째", normalized_query)
    if numeric_ordinal:
        return max(int(numeric_ordinal.group(1)), 1), 1

    return 1, 1


def parse_status_filters(normalized_query: str) -> tuple[list[str], str | None]:
    if "수주 상태" in normalized_query or "수주된" in normalized_query or "수주 사업" in normalized_query:
        return ["수주"], "수주"
    if "발굴 상태" in normalized_query or "발굴 사업" in normalized_query:
        return ["발굴"], "발굴"
    proposal_stage_markers = ["제안 상태", "제안 단계", "제안 사업", "제안 중", "제안중"]
    if (
        "입찰" in normalized_query
        or "경쟁 중" in normalized_query
        or "경쟁중" in normalized_query
        or any(marker in normalized_query for marker in proposal_stage_markers)
    ):
        return ["입찰", "경쟁중", "제안", "발굴"], "입찰/경쟁중"
    return [], None
