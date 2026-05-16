from dataclasses import dataclass

from app.repositories.backend_query_repository import resolve_primary_opportunity
from app.schemas.answer import ConversationMessage
from app.services.query_normalization_service import normalize_query_context


@dataclass(frozen=True)
class QueryRewritePlan:
    original_query: str
    rewritten_query: str
    rewrite_reason: str | None
    rewrite_confidence: float | None
    applied: bool


FOLLOWUP_KEYWORDS = (
    # 지시 표현
    "그 사업", "그 건", "그 프로젝트", "그거", "그건", "그것",
    "이 건", "이 사업", "이거", "이건", "이것",
    "해당 사업", "해당 건", "해당 프로젝트",
    "그럼", "그러면", "그래서", "이번엔", "여기서", "여기는",
    # follow-up 자연어 (앞에 entity 없으면 → history 참조)
    "방금", "아까", "위의",
)

# 짧은 자체 질문(<30자) 중 의문/지시어/도메인 명사 단독 → follow-up 으로 인식
SHORT_FOLLOWUP_PATTERNS = (
    # 사람 메타
    "참석자", "참가자", "담당자", "영업대표", "영업담당", "pm", "프로젝트매니저",
    "결재자", "결재선", "고객사 담당", "팀장", "본부장",
    # 진행 상태
    "현재 단계", "현재 상태", "진행 단계", "진행 상태", "지금 단계", "지금 상태",
    "어디까지", "어떻게 되", "어떻게 됐", "어디까지 갔", "통과했", "통과해",
    # 원인/이유
    "원인", "이유", "왜 부결", "왜 안", "왜 패", "왜 안 됐", "왜 떨어졌",
    # 더 자세히
    "더 자세히", "더 구체적", "더 알려", "더 보여",
    # 다음 단계
    "다음 활동", "다음 단계", "다음 일정",
    # 리스크
    "리스크 요인", "위험 요소", "위험 요인", "리스크는", "위험은",
    # 도메인 단독 후속
    "rfp 분석", "rfp는", "rfp 내용", "rfp 결과",
    "prb는", "prb 결과", "prb 의견", "prb 종합",
    "견적은", "견적 금액", "견적 내용",
    "계약은", "계약 내용", "계약 금액", "계약 상태",
    "라이선스는", "라이선스 정보",
    "수주보고", "수주는",
    "입찰 결과", "입찰은",
    "프로젝트 진행", "프로젝트는",
    "유지보수 상태", "유지보수는",
    "활동은", "최근 활동", "활동 이력",
    "고객지원",
    # 비교/순위 follow-up
    "그 중 가장", "가장 큰", "가장 작은", "가장 오래", "가장 최근", "가장 비싼", "가장 싼",
    "최대", "최소", "1위", "탑",
    # 평가 follow-up
    "수주됐", "수주 성공", "수주 실패", "패찰", "탈락",
)


def build_query_rewrite_plan(*, query: str, history: list[ConversationMessage]) -> QueryRewritePlan:
    if not history or not has_followup_reference(query):
        return QueryRewritePlan(
            original_query=query,
            rewritten_query=query,
            rewrite_reason=None,
            rewrite_confidence=None,
            applied=False,
        )

    subject = infer_followup_subject(history)
    if not subject or subject in query:
        return QueryRewritePlan(
            original_query=query,
            rewritten_query=query,
            rewrite_reason=None,
            rewrite_confidence=None,
            applied=False,
        )

    rewritten = f"{subject} {query}".strip()
    return QueryRewritePlan(
        original_query=query,
        rewritten_query=rewritten,
        rewrite_reason="followup_subject_prefix",
        rewrite_confidence=0.86 if any(keyword in query for keyword in ("그 사업", "그 건", "그 프로젝트")) else 0.72,
        applied=True,
    )


def has_followup_reference(query: str) -> bool:
    normalized = " ".join(query.lower().split())
    # 1) 명시적 지시 표현 매치
    if any(keyword in normalized for keyword in FOLLOWUP_KEYWORDS):
        return True
    # 2) 짧은 self-contained follow-up — 사업코드/회사명 없는 짧은 도메인 질문
    if len(normalized) <= 30 and not extract_business_codes_from_text(normalized):
        for pat in SHORT_FOLLOWUP_PATTERNS:
            if pat in normalized:
                return True
    return False


def infer_followup_subject(history: list[ConversationMessage]) -> str | None:
    recent_messages = history[-6:]
    codes: list[str] = []
    for message in reversed(recent_messages):
        content = get_message_content(message)
        if content:
            codes.extend(extract_business_codes_from_text(content))
    if codes:
        return codes[0]

    combined_text = "\n".join(content for message in recent_messages if (content := get_message_content(message)))
    normalization = normalize_query_context(combined_text)
    entity = resolve_primary_opportunity(
        query_terms=normalization.scope_terms or normalization.entity_terms,
        exact_codes=extract_business_codes_from_text(combined_text),
    )
    if entity is None:
        return None
    return f"{entity['opportunity_code']} {entity['opportunity_name']}"


def extract_business_codes_from_text(text: str) -> list[str]:
    import re

    pattern = re.compile(r"(?<![A-Z0-9-])[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){2,}(?![A-Z0-9-])")
    return list(dict.fromkeys(match.group(0).upper() for match in pattern.finditer(text.upper())))


def get_message_content(message: object) -> str:
    if isinstance(message, dict):
        return str(message.get("content") or "").strip()
    content = getattr(message, "content", "")
    return str(content or "").strip()
