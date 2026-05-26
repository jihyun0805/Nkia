# 인수인계: 문서 초안 액션에서 사용하는 도메인 모델입니다.
# 핵심 흐름: LLM이 채운 slot payload와 프론트 prefill이 기대하는 구조를 연결합니다.
# 같이 확인: 새 slot은 draft_registry와 프론트 폼 매핑을 같이 추가하세요.
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


DraftActionType = Literal["create_draft", "edit_field", "navigate"]


class DocumentDraftSpec(BaseModel):
    """문서 초안 작성 가능한 도메인 타입 명세.

    AI는 BE/FE의 실제 폼 필드를 알지 못한다. 여기서는 의미 슬롯
    (semantic slots)만 정의하고, BE의 어댑터가 폼 필드로 매핑한다.
    """

    type: str = Field(..., description="레지스트리 키. BE 어댑터가 분기 키로 사용")
    label: str = Field(..., description="UI 버튼/응답 본문에 노출할 한국어 라벨")
    keywords: list[str] = Field(default_factory=list, description="의도 분류용 키워드")
    semantic_slots: list[str] = Field(
        default_factory=list,
        description="AI가 채울 의미 슬롯 키 목록. 누락된 슬롯은 BE에서 빈 값으로 매핑",
    )
    primary_evidence_types: list[str] = Field(
        default_factory=list,
        description="이 초안 작성에 우선 활용해야 하는 evidence sourceType",
    )
    button_label: str | None = Field(
        default=None,
        description="UI 버튼 라벨. 미지정 시 '{label} 초안 만들기' 사용",
    )
    description: str | None = Field(default=None, description="응답 본문 보조 설명")


class DraftSlot(BaseModel):
    """폼 prefill 대상 단일 의미 슬롯."""

    name: str = Field(..., description="DocumentDraftSpec.semantic_slots 의 키 중 하나")
    value: Any = Field(default=None, description="추출 또는 추정한 값. 없으면 None")
    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="해당 슬롯 추정 신뢰도. 근거가 분명하면 0.8+ 권장",
    )
    source_evidence_ids: list[str] = Field(
        default_factory=list,
        description="이 슬롯을 산출한 근거 evidence sourceId 목록",
    )


class DraftPayload(BaseModel):
    """BE에 전달되는 초안 페이로드. FE 폼 prefill 의 source of truth."""

    document_type: str = Field(..., description="DocumentDraftSpec.type")
    summary: str | None = Field(
        default=None,
        description="사용자에게 보여줄 한 두 문장 요약. 폼 헤더에 표시 가능",
    )
    slots: dict[str, Any] = Field(
        default_factory=dict,
        description="semantic_slots 키 → 값 매핑. BE가 폼 필드로 변환",
    )
    slot_details: list[DraftSlot] = Field(
        default_factory=list,
        description="신뢰도/근거가 필요한 슬롯의 메타 정보. slots 와 중복 가능",
    )
    references: list[str] = Field(
        default_factory=list,
        description="초안 작성에 사용된 evidence sourceId 목록",
    )
    notes: list[str] = Field(
        default_factory=list,
        description="사용자에게 보여줄 주의사항/누락 안내",
    )


class EditFieldPayload(BaseModel):
    """기존 entity 의 특정 필드 수정 액션 payload.

    FE는 entity_route 로 navigate 한 뒤 field_updates 를 폼에 prefill 한다.
    """

    entity_type: str = Field(..., description="대상 도메인 (예: opportunity, contract, billing, license)")
    entity_id: str = Field(..., description="대상 entity 코드 (예: AUTO-OPP-2026-101)")
    entity_route: str = Field(..., description="FE 라우팅 path (예: /finding/opportunities/AUTO-OPP-2026-101?tab=opportunities)")
    field_updates: dict[str, Any] = Field(
        default_factory=dict,
        description="폼 필드명 → 변경할 값 매핑 (예: {'sales_representative_name': '김철수'})",
    )
    summary: str | None = Field(default=None, description="사용자에게 보여줄 한 두 문장 요약")
    references: list[str] = Field(
        default_factory=list,
        description="이 액션의 근거 evidence sourceId 목록",
    )


class NavigatePayload(BaseModel):
    """단순 페이지 이동 액션 payload."""

    href: str = Field(..., description="FE 라우팅 path")
    entity_type: str | None = Field(default=None, description="대상 도메인")
    entity_id: str | None = Field(default=None, description="대상 entity 코드")
    summary: str | None = Field(default=None, description="이동 사유 한 줄 설명")


class DraftAction(BaseModel):
    """챗봇 응답에 부착되는 액션. BE는 이를 그대로 FE에 패스스루한다."""

    type: DraftActionType = "create_draft"
    label: str = Field(..., description="응답 본문/버튼에 노출할 라벨")
    button_label: str = Field(..., description="UI 버튼 텍스트")
    document_type: str = Field(
        default="",
        description="DocumentDraftSpec.type (create_draft 시 필수). edit_field/navigate 시 비워둘 수 있음.",
    )
    payload: DraftPayload | EditFieldPayload | NavigatePayload | None = None
    evidence_ids: list[str] = Field(
        default_factory=list,
        description="DraftPayload.references 와 동일하나, 응답 일관성을 위해 함께 노출",
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="액션 자체의 종합 신뢰도",
    )
    reasons: list[str] = Field(
        default_factory=list,
        description="이 액션을 추천한 이유 (예: 'explicit_intent', 'evidence_sufficient')",
    )


class DraftIntent(BaseModel):
    """preflight 단계에서 감지된 초안 작성 의도."""

    document_type: str
    label: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    matched_keywords: list[str] = Field(default_factory=list)
    triggered_by: Literal["explicit_keyword", "llm_classifier"] = "explicit_keyword"
