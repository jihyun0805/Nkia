# 인수인계 메모: 챗봇 서비스 계층입니다. 색인, 검색, 근거 선별, 답변 생성, 추천/비교 등 실제 업무 로직이 모여 있습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from __future__ import annotations

import datetime
from dataclasses import dataclass
from typing import Any

from app.core.database import pool
from app.embeddings.model import EmbeddingModel
from app.repositories.search_repository import (
    fetch_quotation_evidence_for_opportunities,
    fetch_similar_opportunity_candidates,
    fetch_similar_opportunity_candidates_by_vector,
)


@dataclass
class SimilarOpportunityResult:
    opportunity_code: str
    opportunity_name: str | None
    customer_name: str | None
    customer_type: str | None
    business_type: str | None
    bid_result: str | None        # 수주 / 실주 / None
    order_status: str | None
    contract_amount: str | None
    similarity_score: float       # 1.0 - min_distance, 높을수록 유사


def find_similar_opportunities(
    *,
    opportunity_code: str,
    embedder: EmbeddingModel,
    top_k: int = 10,
    customer_type_hint: str | None = None,
    years_back: int | None = None,
) -> list[SimilarOpportunityResult]:
    """입력 사업기회와 임베딩 기반 유사 사업기회 목록을 반환한다.

    입력 opportunity의 PROJECT_OPPORTUNITY/RFP/RFP_ANALYSIS/SALES_ACTIVITY 청크 평균
    임베딩을 쿼리로 사용하여 DB에서 코사인 유사도 검색을 수행한다.
    years_back 이 지정되면 해당 연수 이내의 건만 검색한다.
    결과는 유사도 내림차순으로 정렬된다.
    """
    since_date: str | None = None
    if years_back and years_back > 0:
        cutoff = datetime.date.today() - datetime.timedelta(days=years_back * 365)
        since_date = cutoff.isoformat()

    with pool.connection() as conn:
        rows = fetch_similar_opportunity_candidates(
            conn=conn,
            opportunity_code=opportunity_code,
            model_name=embedder.config.model_name,
            limit=top_k,
            customer_type_hint=customer_type_hint,
            since_date=since_date,
        )
    return [
        SimilarOpportunityResult(
            opportunity_code=str(row["opportunity_code"]),
            opportunity_name=row.get("opportunity_name"),
            customer_name=row.get("customer_name"),
            customer_type=row.get("customer_type"),
            business_type=row.get("business_type"),
            bid_result=row.get("bid_result"),
            order_status=row.get("order_status"),
            contract_amount=row.get("contract_amount"),
            similarity_score=max(0.0, 1.0 - float(row["min_distance"])),
        )
        for row in rows
        if row.get("opportunity_code")
    ]


def find_similar_won_opportunities(
    *,
    opportunity_code: str,
    embedder: EmbeddingModel,
    top_k: int = 5,
    customer_type_hint: str | None = None,
    years_back: int | None = None,
) -> list[SimilarOpportunityResult]:
    """유사 사업기회 중 수주 성공 건만 필터링하여 반환한다.

    bid_result / order_status 필드에 '수주'가 포함된 건만 통과시키고,
    계약 금액(contract_amount) 내림차순 → 유사도 내림차순으로 정렬한다.
    years_back 이 지정되면 해당 연수 이내의 수주 건만 검색한다.
    DB에 수주 여부가 없는 경우에는 유사 기회 전체를 그대로 반환한다(폴백).
    """
    pool_size = top_k * 4
    candidates = find_similar_opportunities(
        opportunity_code=opportunity_code,
        embedder=embedder,
        top_k=pool_size,
        customer_type_hint=customer_type_hint,
        years_back=years_back,
    )

    won = [r for r in candidates if _is_won(r)]

    # bidResult 정보가 없는 환경(mock 데이터)에서는 전체를 반환
    if not won and candidates:
        return candidates[:top_k]

    won.sort(
        key=lambda r: (_parse_amount(r.contract_amount), r.similarity_score),
        reverse=True,
    )
    return won[:top_k]


def find_similar_won_opportunities_by_query(
    *,
    query: str,
    embedder: EmbeddingModel,
    top_k: int = 5,
    customer_type_hint: str | None = None,
    years_back: int | None = None,
) -> list[SimilarOpportunityResult]:
    """쿼리 텍스트를 직접 임베딩하여 유사 수주 사업기회를 검색한다.

    출처 opportunity_code 없이 쿼리 자체의 임베딩 벡터로 검색한다.
    '비슷한 수주 사례를 참고해서' 처럼 vague cross-reference 쿼리에 사용.
    """
    since_date: str | None = None
    if years_back and years_back > 0:
        cutoff = datetime.date.today() - datetime.timedelta(days=years_back * 365)
        since_date = cutoff.isoformat()

    query_vector = embedder.encode_query(query)

    with pool.connection() as conn:
        rows = fetch_similar_opportunity_candidates_by_vector(
            conn=conn,
            query_vector=query_vector,
            model_name=embedder.config.model_name,
            limit=top_k * 4,
            customer_type_hint=customer_type_hint,
            since_date=since_date,
        )

    candidates = [
        SimilarOpportunityResult(
            opportunity_code=str(row["opportunity_code"]),
            opportunity_name=row.get("opportunity_name"),
            customer_name=row.get("customer_name"),
            customer_type=row.get("customer_type"),
            business_type=row.get("business_type"),
            bid_result=row.get("bid_result"),
            order_status=row.get("order_status"),
            contract_amount=row.get("contract_amount"),
            similarity_score=max(0.0, 1.0 - float(row["min_distance"])),
        )
        for row in rows
        if row.get("opportunity_code")
    ]

    won = [r for r in candidates if _is_won(r)]
    if not won and candidates:
        return candidates[:top_k]

    won.sort(
        key=lambda r: (_parse_amount(r.contract_amount), r.similarity_score),
        reverse=True,
    )
    return won[:top_k]


def fetch_reference_evidences_for_opportunities(
    *,
    opportunity_codes: list[str],
    embedder: EmbeddingModel,
) -> list[dict[str, Any]]:
    """유사 수주 사업기회들의 견적서·BID_RESULT·WON·ORDER_REPORT 청크를 반환한다.

    cross-reference 초안 작성 시 reference_evidences 로 주입하기 위해 사용된다.
    """
    if not opportunity_codes:
        return []
    with pool.connection() as conn:
        return fetch_quotation_evidence_for_opportunities(
            conn=conn,
            opportunity_codes=opportunity_codes,
            model_name=embedder.config.model_name,
            limit_per_opportunity=3,
        )


def _is_won(result: SimilarOpportunityResult) -> bool:
    for field in (result.bid_result, result.order_status):
        if field and "수주" in str(field):
            return True
    return False


def _parse_amount(amount_str: str | None) -> float:
    if not amount_str:
        return 0.0
    try:
        cleaned = "".join(c for c in amount_str if c.isdigit() or c == ".")
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0
