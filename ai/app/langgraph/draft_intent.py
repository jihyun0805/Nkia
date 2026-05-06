from __future__ import annotations

from app.langgraph.state import GraphDraftIntent
from app.models.draft_registry import (
    DRAFT_TRIGGER_KEYWORDS,
    list_document_draft_specs,
)


def detect_draft_intent(query: str) -> GraphDraftIntent | None:
    """사용자 발화에서 '문서 초안 작성' 의도를 룰 기반으로 감지한다.

    감지 조건:
      1) 트리거 키워드 (예: '초안', '작성해줘') 중 하나 이상 포함
      2) DocumentDraftSpec.keywords 와 매칭되는 문서 타입이 식별됨

    조건이 모두 만족되지 않으면 None 을 반환한다.
    LLM 기반 보강은 우선 도입하지 않는다 (룰만으로 시작).
    """

    if not query:
        return None

    normalized = " ".join(query.lower().split())
    triggers_found = [keyword for keyword in DRAFT_TRIGGER_KEYWORDS if keyword in normalized]
    if not triggers_found:
        return None

    best_spec = None
    best_matches: list[str] = []
    for spec in list_document_draft_specs():
        matches = [keyword for keyword in spec.keywords if keyword in normalized]
        if matches and len(matches) > len(best_matches):
            best_spec = spec
            best_matches = matches

    if best_spec is None:
        return None

    confidence = _confidence_from_matches(triggers_found, best_matches)
    return GraphDraftIntent(
        document_type=best_spec.type,
        label=best_spec.label,
        confidence=confidence,
        matched_keywords=list({*triggers_found, *best_matches}),
        triggered_by="explicit_keyword",
    )


def _confidence_from_matches(trigger_matches: list[str], spec_matches: list[str]) -> float:
    base = 0.55
    base += min(len(trigger_matches), 2) * 0.10
    base += min(len(spec_matches), 3) * 0.08
    return min(base, 0.95)
