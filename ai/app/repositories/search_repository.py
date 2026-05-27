# 인수인계 메모: DB 접근 계층입니다. pgvector 검색, 색인 테이블 갱신, 백엔드 조회를 SQL 단위로 캡슐화합니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from typing import Any

import psycopg

from app.models.search import ExactScope


def fetch_vector_candidates(
    *,
    conn: psycopg.Connection,
    embedding: str,
    model_name: str,
    limit: int,
    source_types: list[str] | None,
    attachment_session_id: str | None,
    exact_scope: ExactScope,
    time_from: str | None = None,
    time_to: str | None = None,
    metadata_filters: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    source_type_filter = "AND s.source_type = ANY(%(source_types)s::varchar[])" if source_types else ""
    exact_scope_filter = build_exact_scope_filter(exact_scope)
    attachment_visibility_filter = build_attachment_visibility_filter()
    time_filter = build_time_filter()
    metadata_filter = build_metadata_filter(metadata_filters)
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT
                s.source_type,
                s.source_id,
                s.title,
                c.chunk_index,
                c.content,
                c.metadata AS chunk_metadata,
                c.embedding <=> %(embedding)s::vector AS distance,
                0::double precision AS keyword_score
            FROM ai_knowledge_chunks c
            JOIN ai_knowledge_sources s ON s.id = c.source_pk
            WHERE c.embedding_model = %(model)s
              AND s.is_deleted = false
              {attachment_visibility_filter}
              {source_type_filter}
              {exact_scope_filter}
              {time_filter}
              {metadata_filter}
            ORDER BY c.embedding <=> %(embedding)s::vector
            LIMIT %(limit)s
            """,
            {
                "embedding": embedding,
                "model": model_name,
                "source_types": source_types,
                "attachment_session_id": attachment_session_id,
                "exact_codes": exact_scope.exact_codes,
                "opportunity_codes": exact_scope.opportunity_codes,
                "maintenance_codes": exact_scope.maintenance_codes,
                "project_codes": exact_scope.project_codes,
                "won_report_codes": exact_scope.won_report_codes,
                "time_from": time_from,
                "time_to": time_to,
                "limit": limit,
            } | build_metadata_filter_params(metadata_filters),
        )
        return list(cur.fetchall())


def fetch_keyword_candidates(
    *,
    conn: psycopg.Connection,
    keyword_query: str,
    embedding: str,
    model_name: str,
    limit: int,
    source_types: list[str] | None,
    attachment_session_id: str | None,
    exact_scope: ExactScope,
    time_from: str | None = None,
    time_to: str | None = None,
    metadata_filters: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    source_type_filter = "AND s.source_type = ANY(%(source_types)s::varchar[])" if source_types else ""
    exact_scope_filter = build_exact_scope_filter(exact_scope)
    attachment_visibility_filter = build_attachment_visibility_filter()
    time_filter = build_time_filter()
    metadata_filter = build_metadata_filter(metadata_filters)
    with conn.cursor() as cur:
        cur.execute(
            f"""
            WITH keyword_query AS (
                SELECT websearch_to_tsquery('simple', %(keyword_query)s) AS value
            )
            SELECT
                s.source_type,
                s.source_id,
                s.title,
                c.chunk_index,
                c.content,
                c.metadata AS chunk_metadata,
                c.embedding <=> %(embedding)s::vector AS distance,
                ts_rank_cd(c.content_tsv, keyword_query.value)::double precision AS keyword_score
            FROM ai_knowledge_chunks c
            JOIN ai_knowledge_sources s ON s.id = c.source_pk
            CROSS JOIN keyword_query
            WHERE c.embedding_model = %(model)s
              AND s.is_deleted = false
              {attachment_visibility_filter}
              AND c.content_tsv @@ keyword_query.value
              {source_type_filter}
              {exact_scope_filter}
              {time_filter}
              {metadata_filter}
            ORDER BY keyword_score DESC, c.embedding <=> %(embedding)s::vector
            LIMIT %(limit)s
            """,
            {
                "keyword_query": keyword_query,
                "embedding": embedding,
                "model": model_name,
                "source_types": source_types,
                "attachment_session_id": attachment_session_id,
                "exact_codes": exact_scope.exact_codes,
                "opportunity_codes": exact_scope.opportunity_codes,
                "maintenance_codes": exact_scope.maintenance_codes,
                "project_codes": exact_scope.project_codes,
                "won_report_codes": exact_scope.won_report_codes,
                "time_from": time_from,
                "time_to": time_to,
                "limit": limit,
            } | build_metadata_filter_params(metadata_filters),
        )
        return list(cur.fetchall())


def resolve_exact_code_scope(*, conn: psycopg.Connection, exact_codes: list[str]) -> ExactScope:
    scope = ExactScope(exact_codes=list(exact_codes))
    if not exact_codes:
        return scope

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT
                s.metadata
            FROM ai_knowledge_sources s
            WHERE s.title = ANY(%(exact_codes)s::varchar[])
               OR EXISTS (
                   SELECT 1
                   FROM jsonb_each_text(s.metadata) AS metadata_values(key, value)
                   WHERE metadata_values.value = ANY(%(exact_codes)s::varchar[])
               )
            """,
            {"exact_codes": exact_codes},
        )
        rows = list(cur.fetchall())

    for row in rows:
        metadata = row["metadata"] or {}
        append_scope_value(scope.opportunity_codes, metadata.get("opportunityCode"))
        append_scope_value(scope.maintenance_codes, metadata.get("maintenanceCode"))
        append_scope_value(scope.project_codes, metadata.get("projectCode"))
        append_scope_value(scope.won_report_codes, metadata.get("wonReportCode"))

    return scope


def resolve_named_entity_scope(
    *,
    conn: psycopg.Connection,
    entity_terms: list[str],
) -> ExactScope:
    scope = ExactScope()
    filtered_terms = [term.strip() for term in entity_terms if len(term.strip()) >= 2]
    if not filtered_terms:
        return scope

    with conn.cursor() as cur:
        cur.execute(
            """
            WITH terms AS (
                SELECT DISTINCT trim(term) AS term
                FROM unnest(%(terms)s::varchar[]) AS raw(term)
                WHERE char_length(trim(term)) >= 2
            ),
            matched AS (
                SELECT
                    s.metadata->>'opportunityCode' AS opportunity_code,
                    s.metadata->>'maintenanceCode' AS maintenance_code,
                    s.metadata->>'projectCode' AS project_code,
                    s.metadata->>'wonReportCode' AS won_report_code,
                    COUNT(DISTINCT t.term) AS term_hits,
                    SUM(
                        CASE
                            WHEN upper(COALESCE(s.metadata->>'opportunityName', s.title, '')) = upper(t.term) THEN 12
                            WHEN upper(COALESCE(s.metadata->>'opportunityName', s.title, '')) LIKE '%%' || upper(t.term) || '%%' THEN 7
                            ELSE 0
                        END
                        + CASE
                            WHEN upper(COALESCE(s.metadata->>'customerName', '')) = upper(t.term) THEN 10
                            WHEN upper(COALESCE(s.metadata->>'customerName', '')) LIKE '%%' || upper(t.term) || '%%' THEN 5
                            ELSE 0
                        END
                    ) AS match_score
                FROM ai_knowledge_sources s
                JOIN terms t
                  ON upper(COALESCE(s.metadata->>'opportunityName', s.title, '')) LIKE '%%' || upper(t.term) || '%%'
                  OR upper(COALESCE(s.metadata->>'customerName', '')) LIKE '%%' || upper(t.term) || '%%'
                  OR upper(COALESCE(s.title, '')) LIKE '%%' || upper(t.term) || '%%'
                WHERE s.is_deleted = false
                  AND COALESCE(s.metadata->>'origin', '') <> 'chat_session'
                GROUP BY
                    s.metadata->>'opportunityCode',
                    s.metadata->>'maintenanceCode',
                    s.metadata->>'projectCode',
                    s.metadata->>'wonReportCode'
                ORDER BY term_hits DESC, match_score DESC, opportunity_code
                LIMIT 8
            )
            SELECT * FROM matched
            """,
            {"terms": filtered_terms},
        )
        rows = list(cur.fetchall())

    if len(rows) > 6:
        return scope

    for row in rows:
        append_scope_value(scope.opportunity_codes, row.get("opportunity_code"))
        append_scope_value(scope.maintenance_codes, row.get("maintenance_code"))
        append_scope_value(scope.project_codes, row.get("project_code"))
        append_scope_value(scope.won_report_codes, row.get("won_report_code"))

    return scope


def merge_exact_scopes(*scopes: ExactScope) -> ExactScope:
    merged = ExactScope()
    for scope in scopes:
        for value in scope.exact_codes:
            append_scope_value(merged.exact_codes, value)
        for value in scope.opportunity_codes:
            append_scope_value(merged.opportunity_codes, value)
        for value in scope.maintenance_codes:
            append_scope_value(merged.maintenance_codes, value)
        for value in scope.project_codes:
            append_scope_value(merged.project_codes, value)
        for value in scope.won_report_codes:
            append_scope_value(merged.won_report_codes, value)
    return merged


def fetch_session_attachment_chunks(
    *,
    conn: psycopg.Connection,
    session_id: str,
    limit: int = 3,
) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                s.title,
                c.content,
                c.chunk_index,
                c.metadata AS chunk_metadata
            FROM ai_knowledge_chunks c
            JOIN ai_knowledge_sources s ON s.id = c.source_pk
            WHERE s.source_type = 'ATTACHMENT'
              AND s.metadata->>'origin' = 'chat_session'
              AND s.metadata->>'sessionId' = %(session_id)s
            ORDER BY c.chunk_index ASC
            LIMIT %(limit)s
            """,
            {
                "session_id": session_id,
                "limit": limit,
            },
        )
        return list(cur.fetchall())


def fetch_searchable_date_range(*, conn: psycopg.Connection) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                MIN(
                    CASE
                        WHEN COALESCE(s.metadata->>'documentStartAt', '') <> '' THEN (s.metadata->>'documentStartAt')::timestamptz
                        WHEN COALESCE(s.metadata->>'businessStartAt', '') <> '' THEN (s.metadata->>'businessStartAt')::timestamptz
                        WHEN COALESCE(s.metadata->>'periodStartAt', '') <> '' THEN (s.metadata->>'periodStartAt')::timestamptz
                        WHEN COALESCE(s.metadata->>'occurredAt', '') <> '' THEN (s.metadata->>'occurredAt')::timestamptz
                        ELSE NULL
                    END
                ) AS start_at,
                MAX(
                    CASE
                        WHEN COALESCE(s.metadata->>'documentEndAt', '') <> '' THEN (s.metadata->>'documentEndAt')::timestamptz
                        WHEN COALESCE(s.metadata->>'businessEndAt', '') <> '' THEN (s.metadata->>'businessEndAt')::timestamptz
                        WHEN COALESCE(s.metadata->>'periodEndAt', '') <> '' THEN (s.metadata->>'periodEndAt')::timestamptz
                        WHEN COALESCE(s.metadata->>'occurredAt', '') <> '' THEN (s.metadata->>'occurredAt')::timestamptz
                        ELSE NULL
                    END
                ) AS end_at
            FROM ai_knowledge_sources s
            WHERE s.is_deleted = false
              AND (
                  s.source_type <> 'ATTACHMENT'
                  OR COALESCE(s.metadata->>'origin', '') <> 'chat_session'
              )
            """
        )
        row = cur.fetchone()
        return dict(row) if row is not None else {"start_at": None, "end_at": None}


def fetch_similar_opportunity_candidates(
    *,
    conn: psycopg.Connection,
    opportunity_code: str,
    model_name: str,
    limit: int,
    customer_type_hint: str | None = None,
    since_date: str | None = None,
) -> list[dict[str, Any]]:
    """입력 사업기회 임베딩 평균을 쿼리로 사용해 유사한 다른 사업기회를 검색한다.

    PROJECT_OPPORTUNITY / RFP / RFP_ANALYSIS 청크 임베딩을 avg() 로 집계하고,
    이를 코사인 유사도 기준으로 타 기회와 비교한다. 결과는 opportunity_code 기준으로
    집계되어 min_distance(낮을수록 유사) 순으로 반환된다.
    since_date (ISO 날짜 문자열) 가 제공되면 해당 날짜 이후 발생한 건만 포함한다.
    """
    customer_filter = (
        "AND s.metadata->>'customerType' = %(customer_type_hint)s"
        if customer_type_hint
        else ""
    )
    date_filter = (
        "AND s.occurred_at >= %(since_date)s::timestamptz"
        if since_date
        else ""
    )
    with conn.cursor() as cur:
        cur.execute(
            f"""
            WITH source_emb AS (
                SELECT avg(c.embedding) AS avg_emb
                FROM ai_knowledge_chunks c
                JOIN ai_knowledge_sources s ON s.id = c.source_pk
                WHERE c.embedding_model = %(model)s
                  AND s.is_deleted = false
                  AND s.source_type = ANY(
                      ARRAY['PROJECT_OPPORTUNITY', 'RFP', 'RFP_ANALYSIS', 'SALES_ACTIVITY']::varchar[]
                  )
                  AND s.metadata->>'opportunityCode' = %(opportunity_code)s
            ),
            similar AS (
                SELECT
                    s.metadata->>'opportunityCode'       AS opportunity_code,
                    s.metadata->>'opportunityName'       AS opportunity_name,
                    s.metadata->>'customerName'          AS customer_name,
                    s.metadata->>'customerType'          AS customer_type,
                    s.metadata->>'businessType'          AS business_type,
                    s.metadata->>'bidResult'             AS bid_result,
                    s.metadata->>'orderStatus'           AS order_status,
                    s.metadata->>'contractAmount'        AS contract_amount,
                    MIN(c.embedding <=> source_emb.avg_emb) AS min_distance
                FROM ai_knowledge_chunks c
                JOIN ai_knowledge_sources s ON s.id = c.source_pk
                CROSS JOIN source_emb
                WHERE c.embedding_model = %(model)s
                  AND s.is_deleted = false
                  AND s.source_type = ANY(
                      ARRAY['PROJECT_OPPORTUNITY', 'RFP', 'RFP_ANALYSIS']::varchar[]
                  )
                  AND COALESCE(s.metadata->>'opportunityCode', '') <> %(opportunity_code)s
                  AND COALESCE(s.metadata->>'opportunityCode', '') <> ''
                  AND source_emb.avg_emb IS NOT NULL
                  {customer_filter}
                  {date_filter}
                GROUP BY
                    s.metadata->>'opportunityCode',
                    s.metadata->>'opportunityName',
                    s.metadata->>'customerName',
                    s.metadata->>'customerType',
                    s.metadata->>'businessType',
                    s.metadata->>'bidResult',
                    s.metadata->>'orderStatus',
                    s.metadata->>'contractAmount'
            )
            SELECT * FROM similar
            ORDER BY min_distance ASC
            LIMIT %(limit)s
            """,
            {
                "opportunity_code": opportunity_code,
                "model": model_name,
                "customer_type_hint": customer_type_hint,
                "since_date": since_date,
                "limit": limit,
            },
        )
        return list(cur.fetchall())


def fetch_similar_opportunity_candidates_by_vector(
    *,
    conn: psycopg.Connection,
    query_vector: list[float],
    model_name: str,
    limit: int,
    customer_type_hint: str | None = None,
    since_date: str | None = None,
) -> list[dict[str, Any]]:
    """쿼리 임베딩 벡터를 직접 사용해 유사한 수주 사업기회를 검색한다.

    opportunity_code 없이 쿼리 텍스트를 임베딩하여 직접 코사인 유사도 검색을 수행한다.
    '비슷한 수주 사례를 참고해서' 처럼 출처 기회 코드가 없는 vague cross-reference 쿼리에 사용.
    """
    customer_filter = (
        "AND s.metadata->>'customerType' = %(customer_type_hint)s"
        if customer_type_hint
        else ""
    )
    date_filter = (
        "AND s.occurred_at >= %(since_date)s::timestamptz"
        if since_date
        else ""
    )
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT
                s.metadata->>'opportunityCode'       AS opportunity_code,
                s.metadata->>'opportunityName'       AS opportunity_name,
                s.metadata->>'customerName'          AS customer_name,
                s.metadata->>'customerType'          AS customer_type,
                s.metadata->>'businessType'          AS business_type,
                s.metadata->>'bidResult'             AS bid_result,
                s.metadata->>'orderStatus'           AS order_status,
                s.metadata->>'contractAmount'        AS contract_amount,
                MIN(c.embedding <=> %(query_vector)s::vector) AS min_distance
            FROM ai_knowledge_chunks c
            JOIN ai_knowledge_sources s ON s.id = c.source_pk
            WHERE c.embedding_model = %(model)s
              AND s.is_deleted = false
              AND s.source_type = ANY(
                  ARRAY['PROJECT_OPPORTUNITY', 'RFP', 'RFP_ANALYSIS']::varchar[]
              )
              AND COALESCE(s.metadata->>'opportunityCode', '') <> ''
              {customer_filter}
              {date_filter}
            GROUP BY
                s.metadata->>'opportunityCode',
                s.metadata->>'opportunityName',
                s.metadata->>'customerName',
                s.metadata->>'customerType',
                s.metadata->>'businessType',
                s.metadata->>'bidResult',
                s.metadata->>'orderStatus',
                s.metadata->>'contractAmount'
            ORDER BY min_distance ASC
            LIMIT %(limit)s
            """,
            {
                "query_vector": str(query_vector),
                "model": model_name,
                "customer_type_hint": customer_type_hint,
                "since_date": since_date,
                "limit": limit,
            },
        )
        return list(cur.fetchall())


def fetch_quotation_evidence_for_opportunities(
    *,
    conn: psycopg.Connection,
    opportunity_codes: list[str],
    model_name: str,
    limit_per_opportunity: int = 3,
) -> list[dict[str, Any]]:
    """주어진 사업기회 코드 목록에 연결된 견적서·BID_RESULT·WON·ORDER_REPORT 청크를 반환한다."""
    if not opportunity_codes:
        return []
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                s.source_type,
                s.source_id,
                s.title,
                c.chunk_index,
                c.content,
                c.metadata AS chunk_metadata
            FROM ai_knowledge_chunks c
            JOIN ai_knowledge_sources s ON s.id = c.source_pk
            WHERE c.embedding_model = %(model)s
              AND s.is_deleted = false
              AND s.source_type = ANY(
                  ARRAY['QUOTATION', 'BID_RESULT', 'WON', 'ORDER_REPORT']::varchar[]
              )
              AND s.metadata->>'opportunityCode' = ANY(%(opportunity_codes)s::varchar[])
            ORDER BY s.metadata->>'opportunityCode', c.chunk_index ASC
            LIMIT %(limit)s
            """,
            {
                "model": model_name,
                "opportunity_codes": opportunity_codes,
                "limit": limit_per_opportunity * len(opportunity_codes),
            },
        )
        return list(cur.fetchall())


def append_scope_value(target: list[str], value: Any) -> None:
    if isinstance(value, str) and value and value not in target:
        target.append(value)


def build_metadata_filter(metadata_filters: dict[str, Any] | None) -> str:
    if not metadata_filters:
        return ""

    conditions: list[str] = []
    if metadata_filters.get("customerGroup"):
        # NOTE: 의미상 customerGroup ≈ BE company.sector (공공/민간/해외).
        # 색인 정규화로 sector → customerGroup canonical 키가 채워지지만,
        # 과거 데이터가 customerType / sector 키로 직접 들어간 경우를 폴백한다.
        conditions.append(
            """
            upper(coalesce(
                nullif(s.metadata->>'customerGroup', ''),
                nullif(s.metadata->>'sector', ''),
                nullif(s.metadata->>'customerType', ''),
                nullif(c.metadata->>'customerGroup', ''),
                nullif(c.metadata->>'sector', ''),
                nullif(c.metadata->>'customerType', '')
            )) = ANY(%(metadata_customer_groups)s::varchar[])
            """
        )

    if metadata_filters.get("businessTypes"):
        conditions.append(
            """
            upper(coalesce(
                nullif(s.metadata->>'rootBusinessType', ''),
                nullif(s.metadata->>'businessType', ''),
                nullif(s.metadata->>'projectType', ''),
                nullif(c.metadata->>'rootBusinessType', ''),
                nullif(c.metadata->>'businessType', ''),
                nullif(c.metadata->>'projectType', '')
            )) = ANY(%(metadata_business_types)s::varchar[])
            """
        )

    if metadata_filters.get("statuses"):
        conditions.append(
            """
            upper(coalesce(
                nullif(s.metadata->>'rootOpportunityStatus', ''),
                nullif(s.metadata->>'currentStatus', ''),
                nullif(s.metadata->>'opportunityStatus', ''),
                nullif(s.metadata->>'documentStage', ''),
                nullif(c.metadata->>'rootOpportunityStatus', ''),
                nullif(c.metadata->>'currentStatus', ''),
                nullif(c.metadata->>'opportunityStatus', ''),
                nullif(c.metadata->>'documentStage', '')
            )) = ANY(%(metadata_statuses)s::varchar[])
            """
        )

    if not conditions:
        return ""
    return "AND " + "\nAND ".join(f"({condition})" for condition in conditions)


def build_metadata_filter_params(metadata_filters: dict[str, Any] | None) -> dict[str, Any]:
    if not metadata_filters:
        return {}
    params: dict[str, Any] = {}
    if customer_group := metadata_filters.get("customerGroup"):
        params["metadata_customer_groups"] = expand_customer_group_values(str(customer_group))
    if business_types := metadata_filters.get("businessTypes"):
        params["metadata_business_types"] = expand_business_type_values([str(value) for value in business_types])
    if statuses := metadata_filters.get("statuses"):
        params["metadata_statuses"] = expand_status_values([str(value) for value in statuses])
    return params


def expand_customer_group_values(value: str) -> list[str]:
    aliases = {
        "PUBLIC": ["PUBLIC", "공공", "공공기관"],
        "PRIVATE": ["PRIVATE", "민간", "기업"],
        "OVERSEAS": ["OVERSEAS", "해외", "글로벌"],
    }
    normalized = value.upper()
    return aliases.get(normalized, [normalized, value])


def expand_business_type_values(values: list[str]) -> list[str]:
    aliases = {
        "EMS": ["EMS"],
        "ITSM": ["ITSM", "ITG", "ITSM/ITG"],
        "DASHBOARD": ["DASHBOARD", "대시보드"],
        "DATACENTER": ["DATACENTER", "AIOTION"],
        "RCA": ["RCA", "AIOTION"],
        "DCA": ["DCA", "AIOTION"],
        "ITAM": ["ITAM", "ITO"],
        "SUPPORTING_TOOLS": ["SUPPORTING_TOOLS", "보조도구"],
        "CLOUD": ["CLOUD"],
        "BSM": ["BSM"],
        "E2E": ["E2E"],
        "ETC": ["ETC", "기타"],
        "AUTOMATION": ["AUTOMATION", "Automation", "자동화"],
        "WSS": ["WSS"],
    }
    expanded: list[str] = []
    for value in values:
        candidates = aliases.get(value.upper(), [value.upper(), value])
        for candidate in candidates:
            if candidate not in expanded:
                expanded.append(candidate)
    return expanded


def expand_status_values(values: list[str]) -> list[str]:
    aliases = {
        "FINDING": ["FINDING", "발굴"],
        "ACTIVITY": ["ACTIVITY", "활동", "영업활동"],
        "BID": ["BID", "입찰", "경쟁중", "제안"],
        "CONTRACT": ["CONTRACT", "계약", "수주"],
        "PROJECT": ["PROJECT", "사업", "프로젝트"],
        "MAINTENANCE": ["MAINTENANCE", "유지보수"],
        "POST_SALES": ["POST_SALES", "사후영업"],
    }
    expanded: list[str] = []
    for value in values:
        candidates = aliases.get(value.upper(), [value.upper(), value])
        for candidate in candidates:
            if candidate not in expanded:
                expanded.append(candidate)
    return expanded


def build_exact_scope_filter(exact_scope: ExactScope) -> str:
    if not exact_scope.has_filters():
        return ""

    return """
      AND (
          s.title = ANY(%(exact_codes)s::varchar[])
          OR EXISTS (
              SELECT 1
              FROM jsonb_each_text(s.metadata) AS metadata_values(key, value)
              WHERE metadata_values.value = ANY(%(exact_codes)s::varchar[])
          )
          OR s.metadata->>'opportunityCode' = ANY(%(opportunity_codes)s::varchar[])
          OR s.metadata->>'maintenanceCode' = ANY(%(maintenance_codes)s::varchar[])
          OR s.metadata->>'projectCode' = ANY(%(project_codes)s::varchar[])
          OR s.metadata->>'wonReportCode' = ANY(%(won_report_codes)s::varchar[])
      )
    """


def build_attachment_visibility_filter() -> str:
    return """
      AND (
          s.source_type <> 'ATTACHMENT'
          OR COALESCE(s.metadata->>'origin', '') <> 'chat_session'
          OR s.metadata->>'sessionId' = %(attachment_session_id)s
      )
    """


def build_time_filter() -> str:
    return """
      AND (
          %(time_from)s::timestamptz IS NULL
          OR COALESCE(
              NULLIF(s.metadata->>'documentEndAt', '')::timestamptz,
              NULLIF(s.metadata->>'businessEndAt', '')::timestamptz,
              NULLIF(s.metadata->>'periodEndAt', '')::timestamptz,
              NULLIF(s.metadata->>'occurredAt', '')::timestamptz,
              NULLIF(s.metadata->>'documentStartAt', '')::timestamptz,
              NULLIF(s.metadata->>'businessStartAt', '')::timestamptz,
              NULLIF(s.metadata->>'periodStartAt', '')::timestamptz,
              s.last_event_at,
              s.updated_at
          ) >= %(time_from)s::timestamptz
      )
      AND (
          %(time_to)s::timestamptz IS NULL
          OR COALESCE(
              NULLIF(s.metadata->>'documentStartAt', '')::timestamptz,
              NULLIF(s.metadata->>'businessStartAt', '')::timestamptz,
              NULLIF(s.metadata->>'periodStartAt', '')::timestamptz,
              NULLIF(s.metadata->>'occurredAt', '')::timestamptz,
              NULLIF(s.metadata->>'documentEndAt', '')::timestamptz,
              NULLIF(s.metadata->>'businessEndAt', '')::timestamptz,
              NULLIF(s.metadata->>'periodEndAt', '')::timestamptz,
              s.last_event_at,
              s.updated_at
          ) <= %(time_to)s::timestamptz
      )
    """
