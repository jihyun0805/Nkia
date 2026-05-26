# 인수인계 메모: FastAPI 엔드포인트 계층입니다. 백엔드에서 들어온 요청을 서비스 계층으로 넘기고 응답 스키마로 감쌉니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.core.database import pool
from app.core.security import require_internal_token


SuggestionTarget = Literal["all", "customers", "partners", "opportunities"]

router = APIRouter(
    prefix="/suggestions",
    tags=["Suggestions"],
    dependencies=[Depends(require_internal_token)],
)


class EntitySuggestion(BaseModel):
    type: Literal["CUSTOMER", "PARTNER", "PROJECT_OPPORTUNITY"]
    id: str
    code: str | None = None
    label: str
    subtitle: str | None = None
    score: float
    matchedBy: Literal["prefix", "contains", "fuzzy", "code"]
    metadata: dict[str, Any] = Field(default_factory=dict)


class EntitySuggestionResponse(BaseModel):
    query: str
    target: SuggestionTarget
    results: list[EntitySuggestion]


@router.get("", response_model=EntitySuggestionResponse)
def suggest_entities(
    q: str = Query(..., min_length=1),
    target: SuggestionTarget = "all",
    limit: int = Query(8, ge=1, le=20),
) -> EntitySuggestionResponse:
    """Return autocomplete suggestions for company/opportunity search boxes.

    This module is intentionally self-contained so it can be added without
    changing existing AI files. Wire `router` into the main API router when
    the endpoint should become active.
    """

    query = q.strip()
    if not query:
        return EntitySuggestionResponse(query=q, target=target, results=[])

    suggestions: list[EntitySuggestion] = []
    with pool.connection() as conn:
        if target in {"all", "customers"}:
            suggestions.extend(_suggest_companies(conn=conn, query=query, company_type="CUSTOMER", limit=limit))
        if target in {"all", "partners"}:
            suggestions.extend(_suggest_companies(conn=conn, query=query, company_type="PARTNER", limit=limit))
        if target in {"all", "opportunities"}:
            suggestions.extend(_suggest_opportunities(conn=conn, query=query, limit=limit))

    deduped = _dedupe_and_sort(suggestions)
    return EntitySuggestionResponse(query=q, target=target, results=deduped[:limit])


def _suggest_companies(*, conn: Any, query: str, company_type: str, limit: int) -> list[EntitySuggestion]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, code, name, company_type, sector, category
            FROM company
            WHERE deleted = false
              AND company_type = %(company_type)s
            ORDER BY name ASC
            LIMIT 2000
            """,
            {"company_type": company_type},
        )
        rows = list(cur.fetchall())

    entity_type = "CUSTOMER" if company_type == "CUSTOMER" else "PARTNER"
    suggestions = []
    for row in rows:
        score, matched_by = _score_candidate(
            query=query,
            primary=str(row["name"] or ""),
            secondary=[str(row.get("code") or "")],
        )
        if score <= 0:
            continue
        suggestions.append(
            EntitySuggestion(
                type=entity_type,
                id=str(row["id"]),
                code=row.get("code"),
                label=str(row["name"]),
                subtitle=_join_nonempty([row.get("code"), row.get("sector"), row.get("category")]),
                score=score,
                matchedBy=matched_by,
                metadata={
                    "companyType": row.get("company_type"),
                    "sector": row.get("sector"),
                    "category": row.get("category"),
                },
            )
        )

    return _dedupe_and_sort(suggestions)[:limit]


def _suggest_opportunities(*, conn: Any, query: str, limit: int) -> list[EntitySuggestion]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                po.id,
                po.opportunity_code,
                po.opportunity_name,
                po.stage,
                po.project_type,
                c.id AS customer_id,
                c.code AS customer_code,
                c.name AS customer_name
            FROM project_opportunity po
            LEFT JOIN company c ON c.id = po.customer_company_id
            WHERE po.deleted = false
            ORDER BY po.created_at DESC NULLS LAST, po.id DESC
            LIMIT 2000
            """
        )
        rows = list(cur.fetchall())

    suggestions = []
    for row in rows:
        score, matched_by = _score_candidate(
            query=query,
            primary=str(row["opportunity_name"] or ""),
            secondary=[
                str(row.get("opportunity_code") or ""),
                str(row.get("customer_name") or ""),
                str(row.get("customer_code") or ""),
            ],
        )
        if score <= 0:
            continue
        suggestions.append(
            EntitySuggestion(
                type="PROJECT_OPPORTUNITY",
                id=str(row["id"]),
                code=row.get("opportunity_code"),
                label=str(row["opportunity_name"]),
                subtitle=_join_nonempty([row.get("opportunity_code"), row.get("customer_name"), row.get("stage")]),
                score=score,
                matchedBy=matched_by,
                metadata={
                    "stage": row.get("stage"),
                    "projectType": row.get("project_type"),
                    "customerId": row.get("customer_id"),
                    "customerCode": row.get("customer_code"),
                    "customerName": row.get("customer_name"),
                },
            )
        )

    return _dedupe_and_sort(suggestions)[:limit]


def _score_candidate(
    *,
    query: str,
    primary: str,
    secondary: list[str],
) -> tuple[float, Literal["prefix", "contains", "fuzzy", "code"]]:
    normalized_query = _normalize_search_text(query)
    if not normalized_query:
        return 0.0, "fuzzy"

    normalized_primary = _normalize_search_text(primary)
    normalized_secondary = [_normalize_search_text(value) for value in secondary if value]

    if any(value == normalized_query or value.startswith(normalized_query) for value in normalized_secondary):
        return 0.98, "code"

    if normalized_primary.startswith(normalized_query):
        prefix_ratio = len(normalized_query) / max(len(normalized_primary), 1)
        return 0.90 + min(prefix_ratio, 1.0) * 0.08, "prefix"

    if normalized_query in normalized_primary:
        return 0.78, "contains"

    for value in normalized_secondary:
        if normalized_query in value:
            return 0.72, "contains"

    fuzzy_score = SequenceMatcher(None, normalized_query, normalized_primary).ratio()
    secondary_score = max((SequenceMatcher(None, normalized_query, value).ratio() for value in normalized_secondary), default=0.0)
    best_score = max(fuzzy_score, secondary_score)

    threshold = 0.58 if len(normalized_query) <= 3 else 0.62
    if best_score >= threshold:
        return best_score * 0.70, "fuzzy"

    return 0.0, "fuzzy"


def _normalize_search_text(value: str) -> str:
    return re.sub(r"[\s\-_./()]+", "", value.strip().lower())


def _join_nonempty(values: list[Any]) -> str | None:
    joined = " | ".join(str(value) for value in values if value not in (None, ""))
    return joined or None


def _dedupe_and_sort(suggestions: list[EntitySuggestion]) -> list[EntitySuggestion]:
    deduped: dict[tuple[str, str], EntitySuggestion] = {}
    for suggestion in suggestions:
        key = (suggestion.type, suggestion.id)
        current = deduped.get(key)
        if current is None or suggestion.score > current.score:
            deduped[key] = suggestion

    return sorted(
        deduped.values(),
        key=lambda item: (
            -item.score,
            0 if item.matchedBy == "prefix" else 1,
            item.type,
            item.label,
        ),
    )
