# 인수인계: 백엔드 권한 컨텍스트를 AI 내부에서 검증하기 위한 모델입니다.
# 핵심 흐름: 사용자 role, 접근 가능한 sourceType/sourceId 목록을 검색 필터로 전달합니다.
# 같이 확인: 백엔드 ChatbotAiUserContext DTO와 필드명을 맞춰야 합니다.
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class UserContext(BaseModel):
    """검색/근거 필터에 사용될 사용자 컨텍스트.

    현재는 mock pass-through 단계이므로 모든 필드가 선택값이고,
    None 이면 '제한 없음' 으로 해석한다.

    추후 BE 권한 시스템이 연동되면 retrieval/metadata_filter 노드에서
    accessibleSourceIds, accessibleSourceTypes, roles 등을 실제 필터로 적용한다.
    """

    model_config = ConfigDict(populate_by_name=True)

    user_id: str | None = Field(default=None, alias="userId")
    roles: list[str] = Field(default_factory=list)
    accessible_source_ids: list[str] | None = Field(
        default=None,
        alias="accessibleSourceIds",
        description="해당 사용자가 열람 가능한 sourceId 화이트리스트. None=제한 없음",
    )
    accessible_source_types: list[str] | None = Field(
        default=None,
        alias="accessibleSourceTypes",
        description="해당 사용자가 열람 가능한 sourceType 목록. None=제한 없음",
    )
    workflow_actor_codes: list[str] = Field(
        default_factory=list,
        alias="workflowActorCodes",
        description="결재 라인에서 본인이 actor 인 단계의 코드 (향후 사용)",
    )
    department: str | None = None
    metadata: dict[str, str] = Field(
        default_factory=dict,
        description="추가 식별 정보 (사번, 본부 코드 등)",
    )
    domain_actions: dict[str, list[str]] = Field(
        default_factory=dict,
        alias="domainActions",
        description=(
            "도메인별 허용 액션 목록. "
            "키는 BE PermissionDomain enum 이름(UPPER_SNAKE), 값은 PermissionAction 이름 리스트. "
            "예: {'PROJECT_OPPORTUNITY': ['READ', 'UPDATE']}"
        ),
    )

    def is_unrestricted(self) -> bool:
        # Backend unrestricted users still send readable source types
        # while leaving accessibleSourceIds as null.
        return self.accessible_source_ids is None
