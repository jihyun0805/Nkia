# 인수인계: 챗봇이 생성하는 문서 초안 슬롯 정의와 LLM payload 정리를 담당합니다.
# 핵심 흐름: 사용자가 “작성해줘”라고 했을 때 실제 저장은 하지 않고 프론트 폼 prefill 액션으로 넘기는 데이터를 만듭니다.
# 같이 확인: 새 초안 문서 타입은 models/draft_registry.py와 프론트 prefill hook을 같이 확장하세요.
from __future__ import annotations

from typing import Any, Iterable

from app.core.config import settings
from app.llm.gms_client import GmsChatClient, GmsChatConfig
from app.models.draft import DraftAction, DraftPayload, DraftSlot
from app.models.draft_registry import DocumentDraftSpec, get_document_draft_spec
from app.models.user_context import UserContext
from app.schemas.answer import AnswerEvidence, ConversationMessage
from app.services.user_context_access import is_evidence_accessible


# evidence content 한 건당 prompt에 넣을 최대 길이
_EVIDENCE_CONTENT_TRUNCATE = 1200
# 한 번에 LLM에 넘길 evidence 최대 개수
_EVIDENCE_BUDGET = 6


def compose_draft_action(
    *,
    query: str,
    document_type: str,
    document_label: str,
    matched_keywords: list[str],
    evidences: list[AnswerEvidence],
    history: list[ConversationMessage],
    user_context: UserContext | None,
    reference_evidences: list[dict[str, Any]] | None = None,
) -> DraftAction | None:
    """draft action을 구성한다.

    reference_evidences: cross-reference 시나리오에서 유사 수주 사업기회의
    견적서 청크를 추가 컨텍스트로 주입하기 위해 사용한다.
    """
    spec = get_document_draft_spec(document_type)
    if spec is None:
        return None

    accessible = filter_evidences_by_user_context(evidences=evidences, user_context=user_context)
    if not accessible and not reference_evidences:
        return _build_no_evidence_action(
            spec=spec,
            matched_keywords=matched_keywords,
            note="요청한 사용자가 열람 가능한 근거 문서가 없어 핵심 슬롯을 채우지 못했습니다.",
        )

    primary_evidences = order_primary_evidences(
        evidences=accessible,
        primary_evidence_types=spec.primary_evidence_types,
    )[:_EVIDENCE_BUDGET]

    slot_payload = _resolve_slot_payload(
        query=query,
        spec=spec,
        document_label=document_label,
        evidences=primary_evidences,
        history=history,
        reference_evidences=reference_evidences,
    )
    slots = _coerce_slots(slot_payload.get("slots"), allowed_keys=spec.semantic_slots)
    summary = _coerce_text(slot_payload.get("summary"))
    notes = _coerce_string_list(slot_payload.get("notes"))

    evidence_ids = [evidence.sourceId for evidence in primary_evidences]
    reference_ids = [str(row.get("source_id") or "") for row in (reference_evidences or []) if row.get("source_id")]
    all_evidence_ids = list(dict.fromkeys(evidence_ids + reference_ids))
    slot_details = [
        DraftSlot(
            name=key,
            value=value,
            source_evidence_ids=evidence_ids[:3],
        )
        for key, value in slots.items()
        if value not in (None, "", [], {})
    ]

    payload = DraftPayload(
        document_type=spec.type,
        summary=summary,
        slots=slots,
        slot_details=slot_details,
        references=all_evidence_ids,
        notes=notes,
    )

    confidence = _compute_action_confidence(
        slots=slots,
        spec=spec,
        evidence_count=len(primary_evidences),
    )

    reasons = _build_reasons(
        matched_keywords=matched_keywords,
        evidence_count=len(primary_evidences),
        slot_filled_count=len(slot_details),
    )
    if reference_evidences:
        reasons.append(f"cross_reference:{len(reference_evidences)}_refs")

    return DraftAction(
        type="create_draft",
        label=f"{spec.label} 초안",
        button_label=spec.button_label or f"{spec.label} 초안 작성으로 이동",
        document_type=spec.type,
        payload=payload,
        evidence_ids=all_evidence_ids,
        confidence=confidence,
        reasons=reasons,
    )


def filter_evidences_by_user_context(
    *,
    evidences: list[AnswerEvidence],
    user_context: UserContext | None,
) -> list[AnswerEvidence]:
    if user_context is None or user_context.is_unrestricted():
        return list(evidences)

    return [
        evidence
        for evidence in evidences
        if is_evidence_accessible(evidence=evidence, user_context=user_context)
    ]


def order_primary_evidences(
    *,
    evidences: list[AnswerEvidence],
    primary_evidence_types: Iterable[str],
) -> list[AnswerEvidence]:
    primary_set = set(primary_evidence_types or [])
    if not primary_set:
        return list(evidences)
    primary = [evidence for evidence in evidences if evidence.sourceType in primary_set]
    others = [evidence for evidence in evidences if evidence.sourceType not in primary_set]
    return primary + others


def _resolve_slot_payload(
    *,
    query: str,
    spec: DocumentDraftSpec,
    document_label: str,
    evidences: list[AnswerEvidence],
    history: list[ConversationMessage],
    reference_evidences: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if not evidences and not reference_evidences:
        return {"summary": None, "slots": {}, "notes": ["근거 문서가 없어 슬롯을 채우지 못했습니다."]}

    if not settings.gms_key:
        return _extractive_slot_fallback(spec=spec, evidences=evidences)

    try:
        client = GmsChatClient(
            GmsChatConfig(
                api_key=settings.gms_key,
                url=settings.gms_chat_completions_url,
                model=settings.gms_chat_model,
                timeout_seconds=settings.gms_timeout_seconds,
            )
        )
        return client.create_draft_payload(
            query=query,
            document_label=document_label,
            slot_keys=list(spec.semantic_slots),
            evidence_context=_build_evidence_context(evidences),
            conversation_context=_build_conversation_context(history),
            reference_context=_build_reference_context(reference_evidences),
        )
    except RuntimeError:
        return _extractive_slot_fallback(spec=spec, evidences=evidences)


def _extractive_slot_fallback(
    *,
    spec: DocumentDraftSpec,
    evidences: list[AnswerEvidence],
) -> dict[str, Any]:
    customer_name, opportunity_code, opportunity_name = _extract_common_fields(evidences)

    slots: dict[str, Any] = {}
    for key in spec.semantic_slots:
        if key == "customer_name" and customer_name:
            slots[key] = customer_name
        elif key == "opportunity_code" and opportunity_code:
            slots[key] = opportunity_code
        elif key == "opportunity_name" and opportunity_name:
            slots[key] = opportunity_name
        elif key == "title" and opportunity_name:
            slots[key] = f"{opportunity_name} {spec.label} 초안"

    summary = None
    if opportunity_name:
        summary = f"{opportunity_name} 관련 근거를 바탕으로 {spec.label} 초안을 준비했습니다."

    notes = ["LLM 응답 사용이 불가하여 핵심 슬롯만 채웠습니다. 폼에서 세부 항목을 직접 보강해 주세요."]
    return {"summary": summary, "slots": slots, "notes": notes}


def _extract_common_fields(evidences: list[AnswerEvidence]) -> tuple[str | None, str | None, str | None]:
    customer_name: str | None = None
    opportunity_code: str | None = None
    opportunity_name: str | None = None
    for evidence in evidences:
        metadata = evidence.metadata or {}
        if customer_name is None:
            customer_name = _first_non_empty(
                metadata.get("customerName"),
                metadata.get("rootCustomerName"),
            )
        if opportunity_code is None:
            opportunity_code = _first_non_empty(
                metadata.get("rootOpportunityCode"),
                metadata.get("opportunityCode"),
            )
        if opportunity_name is None:
            opportunity_name = _first_non_empty(
                metadata.get("rootOpportunityName"),
                metadata.get("opportunityName"),
                evidence.title,
            )
        if customer_name and opportunity_code and opportunity_name:
            break
    return customer_name, opportunity_code, opportunity_name


def _first_non_empty(*candidates: Any) -> str | None:
    for candidate in candidates:
        if candidate is None:
            continue
        text = str(candidate).strip()
        if text:
            return text
    return None


def _coerce_slots(raw: Any, *, allowed_keys: list[str]) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    allowed = set(allowed_keys)
    cleaned: dict[str, Any] = {}
    for key, value in raw.items():
        if key not in allowed:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        cleaned[key] = value
    return cleaned


def _coerce_text(raw: Any) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip()
    return text or None


def _coerce_string_list(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        if item is None:
            continue
        text = str(item).strip()
        if text:
            out.append(text)
    return out


def _compute_action_confidence(
    *,
    slots: dict[str, Any],
    spec: DocumentDraftSpec,
    evidence_count: int,
) -> float:
    if not spec.semantic_slots:
        slot_ratio = 0.0
    else:
        slot_ratio = len(slots) / len(spec.semantic_slots)

    base = 0.45
    base += min(slot_ratio, 0.7) * 0.5
    base += min(evidence_count, 4) * 0.04
    return round(min(base, 0.97), 2)


def _build_reasons(*, matched_keywords: list[str], evidence_count: int, slot_filled_count: int) -> list[str]:
    reasons = ["explicit_intent"]
    if matched_keywords:
        reasons.append(f"matched_keywords:{','.join(matched_keywords[:3])}")
    if evidence_count:
        reasons.append(f"evidence_count:{evidence_count}")
    if slot_filled_count:
        reasons.append(f"slots_filled:{slot_filled_count}")
    return reasons


def _build_evidence_context(evidences: list[AnswerEvidence]) -> str:
    sections = []
    for index, evidence in enumerate(evidences, start=1):
        content = evidence.content or ""
        if len(content) > _EVIDENCE_CONTENT_TRUNCATE:
            content = content[:_EVIDENCE_CONTENT_TRUNCATE] + "...(생략)"
        metadata_lines = _format_metadata(evidence.metadata)
        sections.append(
            "\n".join(
                line
                for line in [
                    f"[근거 {index}]",
                    f"sourceType: {evidence.sourceType}",
                    f"sourceId: {evidence.sourceId}",
                    f"title: {evidence.title or ''}",
                    *metadata_lines,
                    "content:",
                    content,
                ]
                if line is not None
            )
        )
    return "\n\n---\n\n".join(sections)


def _format_metadata(metadata: dict[str, Any] | None) -> list[str]:
    if not metadata:
        return []
    interesting_keys = (
        "rootOpportunityCode",
        "rootOpportunityName",
        "rootCustomerName",
        "customerName",
        "opportunityCode",
        "opportunityName",
        "documentStartAt",
        "documentEndAt",
        "documentWrittenAt",
        "expectedAmount",
        "contractAmount",
    )
    out: list[str] = []
    for key in interesting_keys:
        value = metadata.get(key)
        if value in (None, "", [], {}):
            continue
        out.append(f"metadata.{key}: {value}")
    return out


def _build_conversation_context(history: list[ConversationMessage]) -> str:
    if not history:
        return ""
    lines: list[str] = []
    for message in history[-6:]:
        label = "사용자" if message.role == "user" else "AI"
        lines.append(f"{label}: {message.content}")
    return "\n".join(lines)


def _build_reference_context(reference_evidences: list[dict[str, Any]] | None) -> str | None:
    """cross-reference 견적서 청크를 LLM 프롬프트용 텍스트로 변환한다."""
    if not reference_evidences:
        return None
    sections: list[str] = []
    for index, row in enumerate(reference_evidences[:6], start=1):
        metadata = row.get("chunk_metadata") or {}
        content = str(row.get("content") or "")
        if len(content) > _EVIDENCE_CONTENT_TRUNCATE:
            content = content[:_EVIDENCE_CONTENT_TRUNCATE] + "...(생략)"
        lines = [
            f"[참고 견적서 {index}]",
            f"sourceType: {row.get('source_type', '')}",
            f"opportunityCode: {metadata.get('opportunityCode', '')}",
            f"customerName: {metadata.get('customerName', '')}",
            f"contractAmount: {metadata.get('contractAmount', '')}",
            "content:",
            content,
        ]
        sections.append("\n".join(line for line in lines if line.split(": ", 1)[-1]))
    return "\n\n---\n\n".join(sections) if sections else None


def _build_no_evidence_action(
    *,
    spec: DocumentDraftSpec,
    matched_keywords: list[str],
    note: str,
) -> DraftAction:
    payload = DraftPayload(
        document_type=spec.type,
        summary=None,
        slots={},
        slot_details=[],
        references=[],
        notes=[note],
    )
    return DraftAction(
        type="create_draft",
        label=f"{spec.label} 초안",
        button_label=spec.button_label or f"{spec.label} 초안 작성으로 이동",
        document_type=spec.type,
        payload=payload,
        evidence_ids=[],
        confidence=0.2,
        reasons=_build_reasons(
            matched_keywords=matched_keywords,
            evidence_count=0,
            slot_filled_count=0,
        ),
    )
