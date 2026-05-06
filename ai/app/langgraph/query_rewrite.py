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
    "그 사업",
    "그 건",
    "그 프로젝트",
    "그거",
    "해당 사업",
    "해당 건",
    "이 건",
    "이 사업",
    "그럼",
    "이번엔",
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
    return any(keyword in normalized for keyword in FOLLOWUP_KEYWORDS)


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
