# 인수인계: 백엔드가 넘긴 사용자 권한 컨텍스트로 검색 row 접근 가능 여부를 판단합니다.
# 핵심 흐름: accessibleSourceTypes와 accessibleSourceIds를 모두 확인해 챗봇 근거가 권한 밖으로 새지 않게 막습니다.
# 같이 확인: 권한 정책 변경 시 backend ChatbotUserContextService와 sourceId 문자열 포맷을 반드시 맞추세요.
from __future__ import annotations

from typing import Any, Mapping

from app.models.user_context import UserContext

RELATED_METADATA_KEYS = (
    "opportunityId",
    "opportunityCode",
    "projectId",
    "projectCode",
    "orderReportId",
    "wonReportCode",
    "maintenanceId",
    "maintenanceCode",
    "rfpAnalyzeResultId",
    "rfpAnalysisCode",
    "rfpCode",
    "prbId",
    "prbCode",
    "prbResultCode",
    "quoteCode",
    "quotationCode",
    "contractId",
    "contractCode",
    "supportCode",
    "customerSupportId",
    "projectReportCode",
    "projectResultReportId",
    "billingCode",
    "billingId",
    "licenseCode",
    "licenseId",
    "moduleId",
    "companyCode",
    "contactCode",
)

RELATED_METADATA_SOURCE_TYPES: dict[str, tuple[str, ...]] = {
    "opportunityId": ("PROJECT_OPPORTUNITY", "WON"),
    "opportunityCode": ("PROJECT_OPPORTUNITY", "WON"),
    "projectId": ("PROJECT",),
    "projectCode": ("PROJECT",),
    "orderReportId": ("ORDER_REPORT",),
    "wonReportCode": ("ORDER_REPORT",),
    "maintenanceId": ("MAINTENANCE",),
    "maintenanceCode": ("MAINTENANCE",),
    "rfpAnalyzeResultId": ("RFP_ANALYSIS",),
    "rfpAnalysisCode": ("RFP_ANALYSIS",),
    "rfpCode": ("RFP",),
    "prbId": ("PRB",),
    "prbCode": ("PRB",),
    "prbResultCode": ("PRB_RESULT",),
    "quoteCode": ("QUOTATION",),
    "quotationCode": ("QUOTATION",),
    "contractId": ("CONTRACT",),
    "contractCode": ("CONTRACT",),
    "supportCode": ("CUSTOMER_SUPPORT", "POST_SALES"),
    "customerSupportId": ("CUSTOMER_SUPPORT", "POST_SALES"),
    "projectReportCode": ("PROJECT_RESULT_REPORT",),
    "projectResultReportId": ("PROJECT_RESULT_REPORT",),
    "billingCode": ("BILLING",),
    "billingId": ("BILLING",),
    "licenseCode": ("LICENSE",),
    "licenseId": ("LICENSE",),
    "moduleId": ("MODULE",),
    "companyCode": ("COMPANY",),
    "contactCode": ("CONTACT",),
}

SOURCE_TYPE_ALIASES: dict[str, tuple[str, ...]] = {
    "WON": ("PROJECT_OPPORTUNITY",),
    "POST_SALES": ("CUSTOMER_SUPPORT",),
}


def is_row_accessible(*, row: Mapping[str, Any], user_context: UserContext | None) -> bool:
    metadata = _coerce_mapping(row.get("chunk_metadata")) or _coerce_mapping(row.get("metadata")) or {}
    return is_source_accessible(
        user_context=user_context,
        source_type=_coerce_string(row.get("source_type")) or _coerce_string(row.get("sourceType")),
        source_id=_coerce_string(row.get("source_id")) or _coerce_string(row.get("sourceId")),
        metadata=metadata,
    )


def is_evidence_accessible(*, evidence: Any, user_context: UserContext | None) -> bool:
    metadata = _coerce_mapping(getattr(evidence, "metadata", None)) or {}
    return is_source_accessible(
        user_context=user_context,
        source_type=_coerce_string(getattr(evidence, "sourceType", None)),
        source_id=_coerce_string(getattr(evidence, "sourceId", None)),
        metadata=metadata,
    )


def is_snapshot_accessible(
    *,
    user_context: UserContext | None,
    source_type: str,
    snapshot: Mapping[str, Any] | None,
    direct_keys: tuple[str, ...] = (),
    related_keys: tuple[str, ...] = (),
) -> bool:
    if snapshot is None:
        return False

    metadata: dict[str, Any] = {}
    for key in (*direct_keys, *related_keys):
        value = snapshot.get(key)
        if value not in (None, ""):
            metadata[key] = value

    source_id = None
    for key in direct_keys:
        source_id = _coerce_string(snapshot.get(key))
        if source_id:
            break

    return is_source_accessible(
        user_context=user_context,
        source_type=source_type,
        source_id=source_id,
        metadata=metadata,
    )


# 사내 모든 직원이 동일하게 접근 가능한 조직 메타 source_type.
# backend PermissionDomain.USER/DEPARTMENT 가 빈 sourceType 매핑이라
# 권한 화이트리스트만으로는 색인된 USER/DEPARTMENT 문서가 항상 걸러진다.
# 조직 구조(이름/부서/직책)는 공개 정보로 보고 누구나 검색 가능하도록 화이트리스트.
_ALWAYS_ACCESSIBLE_SOURCE_TYPES = frozenset({"USER", "DEPARTMENT"})


def is_source_accessible(
    *,
    user_context: UserContext | None,
    source_type: str | None,
    source_id: str | None,
    metadata: Mapping[str, Any] | None = None,
) -> bool:
    if user_context is None or user_context.is_unrestricted():
        return True

    if source_type and source_type in _ALWAYS_ACCESSIBLE_SOURCE_TYPES:
        return True

    allowed_types = (
        {value for value in user_context.accessible_source_types or [] if value}
        if user_context.accessible_source_types is not None
        else None
    )
    allowed_ids = (
        {value for value in user_context.accessible_source_ids or [] if value}
        if user_context.accessible_source_ids is not None
        else None
    )

    candidate_types = {
        value
        for value in (
            source_type,
            _coerce_string((metadata or {}).get("parentSourceType")),
        )
        if value
    }
    if allowed_types is not None and not candidate_types.intersection(allowed_types):
        return False

    candidate_ids = _build_scoped_candidate_ids(
        source_type=source_type,
        source_id=source_id,
        metadata=metadata,
    )
    if allowed_ids is not None and not candidate_ids.intersection(allowed_ids):
        return False

    return True


def _build_scoped_candidate_ids(
    *,
    source_type: str | None,
    source_id: str | None,
    metadata: Mapping[str, Any] | None,
) -> set[str]:
    scoped_ids: set[str] = set()

    for source_type_candidate in _expand_source_types(source_type):
        ref = _scoped_ref(source_type_candidate, source_id)
        if ref:
            scoped_ids.add(ref)

    parent_source_type = _coerce_string((metadata or {}).get("parentSourceType"))
    parent_source_id = _coerce_string((metadata or {}).get("parentSourceId"))
    for source_type_candidate in _expand_source_types(parent_source_type):
        ref = _scoped_ref(source_type_candidate, parent_source_id)
        if ref:
            scoped_ids.add(ref)

    for key in RELATED_METADATA_KEYS:
        value = _coerce_string((metadata or {}).get(key))
        if not value:
            continue
        for source_type_candidate in RELATED_METADATA_SOURCE_TYPES.get(key, ()):
            ref = _scoped_ref(source_type_candidate, value)
            if ref:
                scoped_ids.add(ref)

    return scoped_ids


def _expand_source_types(source_type: str | None) -> tuple[str, ...]:
    normalized = _coerce_string(source_type)
    if not normalized:
        return ()
    return (normalized, *SOURCE_TYPE_ALIASES.get(normalized, ()))


def _scoped_ref(source_type: str | None, value: Any) -> str | None:
    normalized_type = _coerce_string(source_type)
    normalized_value = _coerce_string(value)
    if not normalized_type or not normalized_value:
        return None
    return f"{normalized_type}::{normalized_value}"


def _coerce_string(value: Any) -> str | None:
    if value in (None, ""):
        return None
    text = str(value).strip()
    return text or None


def _coerce_mapping(value: Any) -> Mapping[str, Any] | None:
    if isinstance(value, Mapping):
        return value
    return None
