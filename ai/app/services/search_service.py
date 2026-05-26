# 인수인계 메모: 챗봇 서비스 계층입니다. 색인, 검색, 근거 선별, 답변 생성, 추천/비교 등 실제 업무 로직이 모여 있습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
import re
from typing import Any, Literal

from app.core.database import pool
from app.embeddings.model import EmbeddingModel
from app.embeddings.vector import vector_literal
from app.langgraph.retrieval import RetrievalExecutionPlan
from app.models.chat_plan import ChatQueryPlan
from app.models.constants import SourceType
from app.models.normalization import QueryNormalization
from app.models.user_context import UserContext

S = SourceType
from app.repositories.search_repository import (
    fetch_searchable_date_range,
    fetch_keyword_candidates,
    fetch_session_attachment_chunks,
    fetch_vector_candidates,
    merge_exact_scopes,
    resolve_named_entity_scope,
    resolve_exact_code_scope,
)
from app.schemas.search import (
    QueryPlanView,
    QueryTimeRangeView,
    SearchResponse,
    SearchResult,
    SearchResultGroups,
    SearchableDateRangeResponse,
)
from app.services.confidence_service import compute_confidence_assessment
from app.services.reranker_service import apply_lightweight_reranker
from app.services.user_context_access import is_row_accessible

KEYWORD_TOKEN_PATTERN = re.compile(r"[0-9A-Za-z가-힣][0-9A-Za-z가-힣_.-]*")
BUSINESS_CODE_PATTERN = re.compile(r"(?<![A-Z0-9-])[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){2,}(?![A-Z0-9-])")
KEYWORD_SCORE_WEIGHT = 0.15
EXACT_CODE_SCORE_BONUS = 0.40
ROOT_CODE_EXACT_BONUS = 0.35
ROOT_CODE_MISMATCH_PENALTY = -0.18
ENTITY_TOKEN_BONUS = 0.06
SESSION_ATTACHMENT_SCORE_BONUS = 0.2
SESSION_ATTACHMENT_INDIRECT_PENALTY = -0.08
ENTITY_TOKEN_STOPWORDS = {
    "사업",
    "영업기회",
    "제안서",
    "작성",
    "조심",
    "주의",
    "부분",
    "리스크",
    "위험",
    "문제",
    "알려줘",
    "보여줘",
    "찾아줘",
    "가장",
    "현재",
    "관련",
    "문서",
    "구축",
    "고도화",
    "전환",
    "itsm",
    "ems",
    "aiops",
    "dashboard",
    "security",
    "cloudops",
    "ito",
    "sla",
}
SOURCE_TYPE_BOOSTS = {
    "opportunity": {
        S.PROJECT_OPPORTUNITY:    0.12,
        S.SALES_ACTIVITY:         0.08,
        S.RFP:                    0.07,
        S.RFP_ANALYSIS:           0.07,
        S.PRB:                    0.07,
        S.PRB_RESULT:             0.05,
        S.PROPOSAL:               0.05,
        S.QUOTATION:              0.04,
        S.ATTACHMENT:             0.02,
        S.PROJECT_RESULT_REPORT: -0.10,
        S.PROJECT:               -0.08,
        S.ORDER_REPORT:          -0.05,
    },
    "opportunity_status": {
        S.PROJECT_OPPORTUNITY:    0.14,
        S.SALES_ACTIVITY:         0.08,
        S.PRB:                    0.08,
        S.RFP:                    0.06,
        S.RFP_ANALYSIS:           0.06,
        S.PROPOSAL:               0.04,
        S.PROJECT_RESULT_REPORT: -0.12,
        S.PROJECT:               -0.10,
        S.ORDER_REPORT:          -0.05,
    },
    "opportunity_summary": {
        S.PROJECT_OPPORTUNITY:    0.12,
        S.SALES_ACTIVITY:         0.08,
        S.PRB:                    0.08,
        S.RFP:                    0.07,
        S.RFP_ANALYSIS:           0.07,
        S.PROPOSAL:               0.05,
        S.QUOTATION:              0.04,
        S.ATTACHMENT:             0.02,
        S.PROJECT_RESULT_REPORT: -0.08,
        S.PROJECT:               -0.06,
    },
    "proposal_writing": {
        S.PROPOSAL:          0.12,
        S.RFP:               0.10,
        S.RFP_ANALYSIS:      0.10,
        S.PRB:               0.06,
        S.PRB_RESULT:        0.04,
        S.PROJECT_OPPORTUNITY: 0.03,
        S.CONTRACT:         -0.05,
        S.CUSTOMER_SUPPORT: -0.04,
        S.MAINTENANCE_QUOTE:-0.04,
    },
    "risk_analysis": {
        S.PRB:               0.10,
        S.PRB_RESULT:        0.08,
        S.RFP:               0.08,
        S.RFP_ANALYSIS:      0.08,
        S.PROJECT_OPPORTUNITY: 0.05,
        S.PROPOSAL:          0.03,
    },
    "maintenance_quote": {
        S.MAINTENANCE_QUOTE: 0.12,
        S.MAINTENANCE:       0.08,
        S.CUSTOMER_SUPPORT:  0.04,
        S.CONTRACT:          0.02,
    },
    "contract": {
        S.WON:           0.12,
        S.CONTRACT:      0.12,
        S.ORDER_REPORT:  0.10,
        S.BID_RESULT:    0.04,
    },
    "lost": {
        S.LOST:               0.12,
        S.BID_RESULT:         0.08,
        S.PROJECT_OPPORTUNITY: 0.05,
        S.ATTACHMENT:         0.02,
    },
    "activity": {
        S.SALES_ACTIVITY:      0.12,
        S.POST_SALES:          0.10,
        S.PROJECT_OPPORTUNITY: 0.05,
        S.ATTACHMENT:          0.02,
    },
    "maintenance": {
        S.MAINTENANCE:       0.12,
        S.MAINTENANCE_QUOTE: 0.10,
        S.CUSTOMER_SUPPORT:  0.08,
        S.ATTACHMENT:        0.02,
    },
    "project": {
        S.PROJECT:               0.12,
        S.PROJECT_RESULT_REPORT: 0.10,
        S.PROJECT_OPPORTUNITY:   0.08,
        S.ATTACHMENT:            0.02,
    },
    "module": {
        S.MODULE:              0.14,
        S.PROJECT_OPPORTUNITY: 0.06,
        S.ATTACHMENT:          0.02,
    },
}
SOURCE_TYPE_ALIASES = {
    "OPPORTUNITY": S.PROJECT_OPPORTUNITY,
    "WON_REPORT":  S.ORDER_REPORT,
}

AttachmentUsageMode = Literal["direct_evidence", "query_expansion"]


def search_knowledge(
    *,
    query: str,
    limit: int,
    source_types: list[str] | None,
    attachment_session_id: str | None,
    start_at: str | None,
    end_at: str | None,
    embedder: EmbeddingModel,
    metadata_filters: dict[str, Any] | None = None,
    chat_plan: ChatQueryPlan | None = None,
    normalization: QueryNormalization | None = None,
    retrieval_plan: RetrievalExecutionPlan | None = None,
    user_context: UserContext | None = None,
) -> SearchResponse:
    # 챗 플래너가 재작성한 질의가 있으면 검색 질의로 사용하되, 응답의 원문 query는 유지한다.
    effective_query = chat_plan.rewritten_query if chat_plan and chat_plan.rewritten_query else query
    explicit_source_types = normalize_source_types(source_types)
    normalized_source_types = resolve_source_types(
        explicit_source_types=explicit_source_types,
        planned_source_types=chat_plan.source_types if chat_plan else None,
    )
    candidate_limit = max(limit * 5, 20)
    exact_codes = extract_business_codes(query)
    attachment_usage_mode = classify_attachment_usage(query)
    effective_time_from = start_at
    effective_time_to = end_at

    with pool.connection() as conn:
        session_attachment_rows: list[dict[str, Any]] = []
        if attachment_session_id:
            # 사용자가 방금 올린 첨부파일은 현재 대화에만 묶어서 검색 질의 보강 또는 직접 근거로 사용한다.
            session_attachment_rows = fetch_session_attachment_chunks(
                conn=conn,
                session_id=attachment_session_id,
                limit=3,
            )
            effective_query = build_attachment_aware_query(
                query=effective_query,
                attachment_rows=session_attachment_rows,
                usage_mode=attachment_usage_mode,
            )

        query_embedding = embedder.encode_query(effective_query)
        # 코드가 명시된 질문은 벡터 유사도보다 정확 코드 스코프를 우선 반영한다.
        exact_code_scope = resolve_exact_code_scope(conn=conn, exact_codes=exact_codes)
        named_entity_scope = (
            None
            if explicit_source_types
            else resolve_named_entity_scope(
                conn=conn,
                entity_terms=normalization.scope_terms if normalization else extract_entity_tokens(query),
            )
        )
        exact_scope = merge_exact_scopes(
            exact_code_scope,
            *(scope for scope in [named_entity_scope] if scope is not None),
        )
        vector_rows, keyword_rows = fetch_candidates(
            conn=conn,
            query_embedding=query_embedding,
            keyword_query=build_keyword_query(query),
            model_name=embedder.config.model_name,
            limit=candidate_limit,
            source_types=normalized_source_types or None,
            attachment_session_id=attachment_session_id,
            exact_scope=exact_scope,
            time_from=effective_time_from,
            time_to=effective_time_to,
            metadata_filters=metadata_filters,
        )
        if not vector_rows and not keyword_rows and not explicit_source_types and normalized_source_types:
            # 문서유형 추정이 빗나간 경우를 대비해, 사용자가 명시하지 않은 타입 필터는 한 번 완화한다.
            vector_rows, keyword_rows = fetch_candidates(
                conn=conn,
                query_embedding=query_embedding,
                keyword_query=build_keyword_query(query),
                model_name=embedder.config.model_name,
                limit=candidate_limit,
                source_types=None,
                attachment_session_id=attachment_session_id,
                exact_scope=exact_scope,
                time_from=effective_time_from,
                time_to=effective_time_to,
                metadata_filters=metadata_filters,
            )

    rows = merge_candidates(
        vector_rows=vector_rows,
        keyword_rows=keyword_rows,
        exact_codes=exact_codes,
        source_boosts=infer_source_type_boosts(query, chat_plan.target if chat_plan else None),
        entity_tokens=normalization.entity_terms if normalization else extract_entity_tokens(query),
        attachment_session_id=attachment_session_id,
        attachment_usage_mode=attachment_usage_mode,
        limit=max(candidate_limit, normalization.requested_limit if normalization and normalization.requested_limit else limit),
    )

    # 후보 병합 후에는 첨부 정책, 세그먼트 필터, 사용자 권한 필터를 순서대로 적용한다.
    rows = apply_attachment_evidence_policy(
        rows=rows,
        attachment_session_id=attachment_session_id,
        usage_mode=attachment_usage_mode,
        limit=max(candidate_limit, normalization.requested_limit if normalization and normalization.requested_limit else limit),
    )
    rows = apply_segment_filter(rows=rows, normalization=normalization)
    rows = apply_user_context_filter(rows=rows, user_context=user_context)
    final_limit = normalization.requested_limit if normalization and normalization.requested_limit else limit
    if retrieval_plan and retrieval_plan.use_reranker:
        # reranker는 후보를 새로 가져오지 않고 기존 후보의 순서만 재조정한다.
        rows = apply_lightweight_reranker(query=query, rows=rows, limit=final_limit)
    else:
        rows = rows[:final_limit]
    retrieval_confidence, confidence_band_value, confidence_reasons = compute_confidence_assessment(rows)
    typed_results = build_typed_result_groups(rows)

    return SearchResponse(
        query=query,
        searchMode=retrieval_plan.search_mode if retrieval_plan is not None else "hybrid",
        route=infer_search_route(chat_plan),
        embeddingModel=embedder.config.model_name,
        embeddingDimension=embedder.config.dimension,
        retrievalConfidence=retrieval_confidence,
        confidenceBand=confidence_band_value,
        confidenceReasons=confidence_reasons,
        excludedSourceTypes=[],
        plan=build_query_plan_view(chat_plan),
        results=typed_results.retrievedEvidence + typed_results.structuredEvidence + typed_results.derivedSummaryEvidence,
        typedResults=typed_results,
    )


def apply_segment_filter(
    *,
    rows: list[dict[str, Any]],
    normalization: QueryNormalization | None,
) -> list[dict[str, Any]]:
    """자연어 customer segment / 사업 구분 / 제안 형태 필터.

    customer_name_keywords 가 있으면 metadata.customerName / rootCustomerName /
    opportunityName / rootOpportunityName / title 중 하나에 키워드가 포함된 행만 통과시킨다.
    business_type_filters / proposal_type_filters 도 metadata + content 텍스트에 대해
    같은 방식으로 부분일치한다.

    필터 적용 후 행이 비어버리면 원본을 보존한다 (회수 0 보다는 약한 매칭이라도 보여주는 게 낫다).
    """

    if normalization is None:
        return rows

    segment_keywords = [keyword.strip() for keyword in normalization.customer_name_keywords if keyword.strip()]
    segment_label = (normalization.customer_segment_label or "").strip()
    business_types = [value.strip() for value in normalization.business_type_filters if value.strip()]
    proposal_types = [value.strip() for value in normalization.proposal_type_filters if value.strip()]

    if not segment_label and not segment_keywords and not business_types and not proposal_types:
        return rows

    def matches(row: dict[str, Any]) -> bool:
        haystack = _build_segment_haystack(row)
        if segment_label == "공공" and not _matches_public_customer_haystack(haystack):
            return False
        if segment_label == "민간" and _matches_public_customer_haystack(haystack):
            return False
        if segment_keywords and not any(keyword in haystack for keyword in segment_keywords):
            return False
        if business_types and not any(value.lower() in haystack.lower() for value in business_types):
            return False
        if proposal_types and not any(value in haystack for value in proposal_types):
            return False
        return True

    filtered = [row for row in rows if matches(row)]
    if not filtered:
        return rows
    return filtered


def _build_segment_haystack(row: dict[str, Any]) -> str:
    metadata = row.get("chunk_metadata") or {}
    candidates = [
        metadata.get("customerName"),
        metadata.get("rootCustomerName"),
        metadata.get("customerGroup"),
        metadata.get("customerType"),
        metadata.get("sector"),
        metadata.get("opportunityName"),
        metadata.get("rootOpportunityName"),
        metadata.get("businessType"),
        metadata.get("rootBusinessType"),
        metadata.get("proposalType"),
        row.get("title"),
        row.get("content"),
    ]
    return " ".join(str(value) for value in candidates if value)


def _matches_public_customer_haystack(haystack: str) -> bool:
    upper = haystack.upper()
    if "PUBLIC" in upper or "공공" in haystack or "공기업" in haystack:
        return True
    return any(keyword in haystack for keyword in ("공사", "공단", "발전"))


def apply_user_context_filter(
    *,
    rows: list[dict[str, Any]],
    user_context: UserContext | None,
) -> list[dict[str, Any]]:
    """사용자 권한에 따라 결과 행을 필터링한다.

    현재는 mock 단계로, user_context 가 None 이거나 is_unrestricted 이면 그대로 통과시킨다.
    추후 BE 권한 시스템과 연동되면 accessible_source_ids/accessible_source_types
    필드가 채워져 실제 화이트리스트 필터링이 적용된다.
    """

    if user_context is None or user_context.is_unrestricted():
        return rows

    return [
        row
        for row in rows
        if is_row_accessible(row=row, user_context=user_context)
    ]


def build_typed_result_groups(rows: list[dict[str, Any]]) -> SearchResultGroups:
    groups = SearchResultGroups()
    for row in rows:
        result = SearchResult(
            evidenceType=row.get("evidenceType", "retrieved_evidence"),
            sourceType=row["source_type"],
            sourceId=row["source_id"],
            title=row["title"],
            chunkIndex=row["chunk_index"],
            distance=float(row["distance"]),
            vectorScore=float(row["vector_score"]),
            keywordScore=float(row["keyword_score"]),
            finalScore=float(row["final_score"]),
            matchedBy=row["matched_by"],
            content=row["content"],
            metadata=row["chunk_metadata"],
        )
        if result.evidenceType == "structured_evidence":
            groups.structuredEvidence.append(result)
        elif result.evidenceType == "derived_summary_evidence":
            groups.derivedSummaryEvidence.append(result)
        else:
            groups.retrievedEvidence.append(result)
    return groups


def fetch_candidates(
    *,
    conn: Any,
    query_embedding: list[float],
    keyword_query: str,
    model_name: str,
    limit: int,
    source_types: list[str] | None,
    attachment_session_id: str | None,
    exact_scope: Any,
    time_from: str | None,
    time_to: str | None,
    metadata_filters: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    vector_rows = fetch_vector_candidates(
        conn=conn,
        embedding=vector_literal(query_embedding),
        model_name=model_name,
        limit=limit,
        source_types=source_types,
        attachment_session_id=attachment_session_id,
        exact_scope=exact_scope,
        time_from=time_from,
        time_to=time_to,
        metadata_filters=metadata_filters,
    )
    keyword_rows = fetch_keyword_candidates(
        conn=conn,
        keyword_query=keyword_query,
        embedding=vector_literal(query_embedding),
        model_name=model_name,
        limit=limit,
        source_types=source_types,
        attachment_session_id=attachment_session_id,
        exact_scope=exact_scope,
        time_from=time_from,
        time_to=time_to,
        metadata_filters=metadata_filters,
    )
    return vector_rows, keyword_rows


def get_searchable_date_range() -> SearchableDateRangeResponse:
    with pool.connection() as conn:
        row = fetch_searchable_date_range(conn=conn)
    start_at = row.get("start_at")
    end_at = row.get("end_at")
    return SearchableDateRangeResponse(
        startAt=start_at.isoformat() if start_at is not None else None,
        endAt=end_at.isoformat() if end_at is not None else None,
    )


def merge_candidates(
    *,
    vector_rows: list[dict[str, Any]],
    keyword_rows: list[dict[str, Any]],
    exact_codes: list[str],
    source_boosts: dict[str, float],
    entity_tokens: list[str],
    attachment_session_id: str | None,
    attachment_usage_mode: AttachmentUsageMode,
    limit: int,
) -> list[dict[str, Any]]:
    merged: dict[tuple[str, str, int], dict[str, Any]] = {}

    for row in vector_rows:
        key = row_key(row)
        distance = float(row["distance"])
        merged[key] = {
            **row,
            "vector_score": vector_score(distance),
            "keyword_score": 0.0,
            "matched_by": ["vector"],
        }

    for row in keyword_rows:
        key = row_key(row)
        distance = float(row["distance"])
        keyword_score = float(row["keyword_score"] or 0.0)
        if key in merged:
            merged[key]["keyword_score"] = max(float(merged[key]["keyword_score"]), keyword_score)
            merged[key]["distance"] = min(float(merged[key]["distance"]), distance)
            if "keyword" not in merged[key]["matched_by"]:
                merged[key]["matched_by"].append("keyword")
        else:
            merged[key] = {
                **row,
                "vector_score": vector_score(distance),
                "keyword_score": keyword_score,
                "matched_by": ["keyword"],
            }

    for row in merged.values():
        exact_bonus = EXACT_CODE_SCORE_BONUS if row_matches_exact_code(row, exact_codes) else 0.0
        root_code_bonus = root_code_match_bonus(row=row, exact_codes=exact_codes)
        entity_bonus = entity_match_bonus(row=row, entity_tokens=entity_tokens)
        session_attachment_bonus = session_attachment_match_bonus(
            row=row,
            attachment_session_id=attachment_session_id,
            usage_mode=attachment_usage_mode,
        )
        source_boost = source_boosts.get(str(row["source_type"]), 0.0) * source_boost_multiplier(
            row=row,
            entity_tokens=entity_tokens,
        )
        row["source_boost"] = source_boost
        row["root_code_bonus"] = root_code_bonus
        row["entity_bonus"] = entity_bonus
        row["session_attachment_bonus"] = session_attachment_bonus
        row["final_score"] = (
            float(row["vector_score"])
            + (float(row["keyword_score"]) * KEYWORD_SCORE_WEIGHT)
            + exact_bonus
            + root_code_bonus
            + entity_bonus
            + session_attachment_bonus
            + source_boost
        )

    return sorted(
        merged.values(),
        key=lambda row: (
            -float(row["final_score"]),
            float(row["distance"]),
            row["source_type"],
            row["source_id"],
            row["chunk_index"],
        ),
    )[:limit]


def build_query_plan_view(chat_plan: ChatQueryPlan | None) -> QueryPlanView | None:
    if chat_plan is None:
        return None
    time_range = None
    if chat_plan.time_label or chat_plan.time_from or chat_plan.time_to:
        time_range = QueryTimeRangeView(
            label=chat_plan.time_label,
            startAt=chat_plan.time_from,
            endAt=chat_plan.time_to,
        )
    return QueryPlanView(
        task=chat_plan.task,
        target=chat_plan.target,
        answerStyle=chat_plan.answer_style,
        sourceTypes=chat_plan.source_types,
        filters=chat_plan.filters,
        timeRange=time_range,
        missingFields=chat_plan.missing_fields,
        clarificationMessage=chat_plan.clarification_message,
        confidence=chat_plan.confidence,
    )


def infer_search_route(chat_plan: ChatQueryPlan | None) -> str:
    if chat_plan is None:
        return "discovery"
    if chat_plan.task in {"timeline_lookup", "maintenance_lookup", "summarize_period"}:
        return "fast_structured"
    if chat_plan.target in {"opportunity", "activity", "maintenance", "contract", "project"}:
        return "mixed"
    return "discovery"


def row_key(row: dict[str, Any]) -> tuple[str, str, int]:
    return (str(row["source_type"]), str(row["source_id"]), int(row["chunk_index"]))


def vector_score(distance: float) -> float:
    return 1.0 / (1.0 + distance)



def extract_business_codes(query: str) -> list[str]:
    return list(dict.fromkeys(match.group(0).upper() for match in BUSINESS_CODE_PATTERN.finditer(query.upper())))


def row_matches_exact_code(row: dict[str, Any], exact_codes: list[str]) -> bool:
    if not exact_codes:
        return False

    candidate_values = [
        str(row.get("title") or ""),
        str(row.get("source_id") or ""),
        str(row.get("content") or "")[:400],
    ]
    metadata = row.get("chunk_metadata") or {}
    if isinstance(metadata, dict):
        candidate_values.extend(str(value) for value in metadata.values() if value not in (None, ""))

    upper_values = [value.upper() for value in candidate_values]
    return any(code in value for code in exact_codes for value in upper_values)


def root_code_match_bonus(*, row: dict[str, Any], exact_codes: list[str]) -> float:
    if not exact_codes:
        return 0.0
    metadata = row.get("chunk_metadata") or {}
    root_codes = [
        str(metadata.get("rootOpportunityCode") or "").upper(),
        str(metadata.get("opportunityCode") or "").upper(),
        str(metadata.get("referenceCode") or "").upper(),
    ]
    root_codes = [code for code in root_codes if code]
    if not root_codes:
        return 0.0
    if any(code in root_codes for code in exact_codes):
        return ROOT_CODE_EXACT_BONUS
    return ROOT_CODE_MISMATCH_PENALTY


def entity_match_bonus(*, row: dict[str, Any], entity_tokens: list[str]) -> float:
    if not entity_tokens:
        return 0.0

    haystacks = [
        str(row["title"] or "").lower(),
        str(row["content"]).lower(),
        " ".join(str(value).lower() for value in (row["chunk_metadata"] or {}).values() if value is not None),
    ]
    matched_count = 0
    for token in entity_tokens:
        lowered = token.lower()
        if any(lowered in haystack for haystack in haystacks):
            matched_count += 1
    return min(matched_count * ENTITY_TOKEN_BONUS, ENTITY_TOKEN_BONUS * 4)


def session_attachment_match_bonus(
    *,
    row: dict[str, Any],
    attachment_session_id: str | None,
    usage_mode: AttachmentUsageMode,
) -> float:
    if not attachment_session_id:
        return 0.0
    metadata = row.get("chunk_metadata") or {}
    if metadata.get("sessionId") != attachment_session_id:
        return 0.0
    if usage_mode == "direct_evidence":
        return SESSION_ATTACHMENT_SCORE_BONUS
    return SESSION_ATTACHMENT_SCORE_BONUS + SESSION_ATTACHMENT_INDIRECT_PENALTY


def source_boost_multiplier(*, row: dict[str, Any], entity_tokens: list[str]) -> float:
    title = str(row.get("title") or "").lower()
    metadata = row.get("chunk_metadata") or {}
    root_name = str(metadata.get("rootOpportunityName") or "").lower()
    customer_name = str(metadata.get("customerName") or metadata.get("rootCustomerName") or "").lower()
    if any(token.lower() in title or token.lower() in root_name or token.lower() in customer_name for token in entity_tokens):
        return 1.35
    return 1.0


def normalize_source_types(source_types: list[str] | None) -> list[str]:
    if not source_types:
        return []
    normalized: list[str] = []
    for source_type in source_types:
        candidate = SOURCE_TYPE_ALIASES.get(source_type.strip().upper(), source_type.strip().upper())
        if candidate and candidate not in normalized:
            normalized.append(candidate)
    return normalized


def resolve_source_types(
    *,
    explicit_source_types: list[str],
    planned_source_types: list[str] | None,
) -> list[str]:
    if explicit_source_types:
        return explicit_source_types

    normalized = normalize_source_types(planned_source_types)
    for fallback_source_type in ("ATTACHMENT", "TEST_DOC"):
        if fallback_source_type not in normalized:
            normalized.append(fallback_source_type)
    return normalized


def build_keyword_query(query: str) -> str:
    keywords = []
    for token in KEYWORD_TOKEN_PATTERN.findall(query):
        normalized = token.strip()
        if not normalized or normalized in ENTITY_TOKEN_STOPWORDS:
            continue
        keywords.append(normalized)
    return " ".join(keywords) or query


def extract_entity_tokens(query: str) -> list[str]:
    tokens = []
    for token in KEYWORD_TOKEN_PATTERN.findall(query):
        normalized = token.strip()
        if len(normalized) < 2 or normalized in ENTITY_TOKEN_STOPWORDS:
            continue
        if normalized not in tokens:
            tokens.append(normalized)
    return tokens[:8]


def classify_attachment_usage(query: str) -> AttachmentUsageMode:
    direct_keywords = ["첨부", "업로드", "파일", "문서", "이 자료", "이 문서"]
    if any(keyword in query for keyword in direct_keywords):
        return "direct_evidence"
    return "query_expansion"


def build_attachment_aware_query(
    *,
    query: str,
    attachment_rows: list[dict[str, Any]],
    usage_mode: AttachmentUsageMode,
) -> str:
    if not attachment_rows:
        return query
    if usage_mode == "direct_evidence":
        snippets = [str(row["content"])[:220] for row in attachment_rows[:2]]
        return "\n".join([query, *snippets])
    titles = [str(row["title"] or "").strip() for row in attachment_rows if str(row["title"] or "").strip()]
    return "\n".join([query, *titles[:2]])


def infer_source_type_boosts(query: str, target: str | None = None) -> dict[str, float]:
    normalized = " ".join(query.lower().split())
    if ("제안서" in normalized or ("제안" in normalized and "전략" in normalized)) and target != "maintenance":
        return SOURCE_TYPE_BOOSTS["proposal_writing"]
    if target == "opportunity" and any(keyword in normalized for keyword in ("상태", "현황", "진행")):
        return SOURCE_TYPE_BOOSTS["opportunity_status"]
    if target == "opportunity" and any(keyword in normalized for keyword in ("요약", "정리", "핵심", "의미있는", "결과")):
        return SOURCE_TYPE_BOOSTS["opportunity_summary"]
    if target == "opportunity":
        return SOURCE_TYPE_BOOSTS["opportunity"]
    if target and target in SOURCE_TYPE_BOOSTS:
        return SOURCE_TYPE_BOOSTS[target]
    if "유지보수" in normalized or "장애" in normalized:
        return SOURCE_TYPE_BOOSTS["maintenance"]
    if "모듈" in normalized:
        return SOURCE_TYPE_BOOSTS["module"]
    if "실주" in normalized:
        return SOURCE_TYPE_BOOSTS["lost"]
    if "계약" in normalized or "수주" in normalized:
        return SOURCE_TYPE_BOOSTS["contract"]
    if "사후영업" in normalized:
        return SOURCE_TYPE_BOOSTS["activity"]
    if "활동" in normalized or "미팅" in normalized:
        return SOURCE_TYPE_BOOSTS["activity"]
    if "제안" in normalized or "risk" in normalized or "리스크" in normalized:
        return SOURCE_TYPE_BOOSTS["risk_analysis"]
    return {}


def apply_attachment_evidence_policy(
    *,
    rows: list[dict[str, Any]],
    attachment_session_id: str | None,
    usage_mode: AttachmentUsageMode,
    limit: int,
) -> list[dict[str, Any]]:
    if not attachment_session_id:
        return rows[:limit]

    if usage_mode == "direct_evidence":
        return rows[:limit]

    attachment_rows = []
    other_rows = []
    for row in rows:
        metadata = row.get("chunk_metadata") or {}
        if metadata.get("sessionId") == attachment_session_id:
            attachment_rows.append(row)
        else:
            other_rows.append(row)

    merged = other_rows[: max(limit - 1, 0)]
    if attachment_rows and len(merged) < limit:
        merged.append(attachment_rows[0])
    return merged[:limit]
