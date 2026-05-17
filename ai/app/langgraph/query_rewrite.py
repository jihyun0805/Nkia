import re
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

    # 직전 assistant 답변이 disambiguation (다중 후보 제시) 이면 prefix 차단.
    # 사용자가 명시 선택 안 한 상태에서 임의 후보로 prefix 하면 잘못된 사업 lock 됨.
    if previous_assistant_is_disambiguation(history):
        return QueryRewritePlan(
            original_query=query,
            rewritten_query=query,
            rewrite_reason="prev_disambig_skip",
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
    # 2) query 에 새 entity (회사명 후보 / 다른 사업기회 코드) 가 명시되면
    #    follow-up 이 아니라 새 topic — 직전 disambig 후보로 lock 되는 leak 차단.
    if contains_entity_reference(query):
        return False
    # 3) 짧은 self-contained follow-up — 사업코드/회사명 없는 짧은 도메인 질문
    if len(normalized) <= 30 and not extract_business_codes_from_text(normalized):
        for pat in SHORT_FOLLOWUP_PATTERNS:
            if pat in normalized:
                return True
    return False


_COMPANY_SUFFIX_PATTERN = re.compile(
    r"[가-힣A-Za-z0-9]{1,}("
    r"증권|카드|은행|보험|화재|생명|"
    r"전자|화학|통신|텔레콤|네트웍스|네트워크|시스템즈|솔루션|"
    r"건설|중공업|바이오|제약|에너지|디스플레이|모비스|모바일|"
    r"항공|해운|로지스틱스|상사|코스메틱|글로벌|홀딩스|코퍼레이션|"
    r"하이테크|인더스트리"
    r")"
)


_DISAMBIG_MARKERS = (
    "어떤 사업기회를 알고 싶으신가요",
    "사업기회가 2건 있습니다",
    "사업기회가 3건 있습니다",
    "사업기회가 4건 있습니다",
    "사업기회가 5건 있습니다",
    "사업코드나 사업명을 포함해서 다시 질문",
    "다음 중 어느 사업을 의미하시나요",
)


def previous_assistant_is_disambiguation(history: list[ConversationMessage]) -> bool:
    """가장 최근 assistant 답변이 disambig (다중 후보 제시) 인지 검출.

    True 면 query_rewrite 의 subject prefix 를 건너뛰어
    잘못된 후보로 lock 되는 leak 을 막는다.
    """
    for message in reversed(history):
        role = getattr(message, "role", None) or (message.get("role") if isinstance(message, dict) else None)
        if role == "assistant":
            content = get_message_content(message).strip()
            return any(marker in content for marker in _DISAMBIG_MARKERS)
        if role == "user":
            # user 가 새 query 보냈으니 그 직전 assistant 까지만 본다
            continue
    return False


def contains_entity_reference(query: str) -> bool:
    """query 자체에 회사명 후보 또는 다른 사업기회 코드가 명시되어 있으면 True.

    True 면 '새 topic 신호' — has_followup_reference 가 직전 turn 의 사업 컨텍스트로
    lock 되는 follow-up 처리를 건너뛰어야 함.
    """
    if extract_business_codes_from_text(query):
        return True
    if _COMPANY_SUFFIX_PATTERN.search(query):
        return True
    return False


def infer_followup_subject(history: list[ConversationMessage]) -> str | None:
    """follow-up subject 후보를 user query 에서만 추출.

    중요: assistant 답변에서 코드 추출하면 fallback 가이드의 예시 코드
    ("예: 'AUTO-OPP-2026-101'") 가 잘못된 subject 로 lock 되어 leak 발생.
    오직 사용자가 직접 명시한 entity 만 follow-up 의 lock 대상으로 사용.
    """
    recent_messages = history[-6:]
    user_messages = [m for m in recent_messages if _is_user_message(m)]
    codes: list[str] = []
    for message in reversed(user_messages):
        content = get_message_content(message)
        if content:
            codes.extend(extract_business_codes_from_text(content))
    if codes:
        return codes[0]

    # 코드 없으면 user query 들의 entity 단어로 매칭
    combined_text = "\n".join(
        content for message in user_messages if (content := get_message_content(message))
    )
    if not combined_text.strip():
        return None
    normalization = normalize_query_context(combined_text)
    entity = resolve_primary_opportunity(
        query_terms=normalization.scope_terms or normalization.entity_terms,
        exact_codes=extract_business_codes_from_text(combined_text),
    )
    if entity is None:
        return None
    return f"{entity['opportunity_code']} {entity['opportunity_name']}"


def _is_user_message(message: object) -> bool:
    if isinstance(message, dict):
        return message.get("role") == "user"
    return getattr(message, "role", None) == "user"


def extract_business_codes_from_text(text: str) -> list[str]:
    import re

    pattern = re.compile(r"(?<![A-Z0-9-])[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){2,}(?![A-Z0-9-])")
    return list(dict.fromkeys(match.group(0).upper() for match in pattern.finditer(text.upper())))


def get_message_content(message: object) -> str:
    if isinstance(message, dict):
        return str(message.get("content") or "").strip()
    content = getattr(message, "content", "")
    return str(content or "").strip()
