# 인수인계: 1차 검색 후보를 질문과의 텍스트 매칭 기준으로 가볍게 재정렬합니다.
# 핵심 흐름: 새 후보를 조회하지 않고 기존 vector/keyword 결과의 순서와 점수만 조정합니다.
# 같이 확인: 정렬 결과가 이상하면 search_service.py의 merge_candidates 이후 호출 순서를 같이 확인하세요.
import re
from typing import Any

from app.models.constants import SourceType

S = SourceType


TOKEN_PATTERN = re.compile(r"[0-9A-Za-z가-힣][0-9A-Za-z가-힣_.-]*")
STOPWORDS = {
    "알려줘",
    "보여줘",
    "찾아줘",
    "요약해줘",
    "정리해줘",
    "사업",
    "문서",
    "근거",
    "관련",
    "현재",
    "이번",
    "올해",
    "상반기",
    "하반기",
}


def apply_lightweight_reranker(*, query: str, rows: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    if not rows:
        return []

    query_tokens = extract_tokens(query)
    reranked: list[dict[str, Any]] = []
    for row in rows:
        haystacks = [
            str(row.get("title") or "").lower(),
            str(row.get("content") or "").lower(),
            " ".join(str(value).lower() for value in (row.get("chunk_metadata") or {}).values() if value is not None),
        ]
        overlap = 0
        for token in query_tokens:
            if any(token in haystack for haystack in haystacks):
                overlap += 1

        overlap_score = min(overlap * 0.03, 0.18)
        source_priority = lightweight_source_priority(str(row.get("source_type") or ""))
        rerank_score = overlap_score + source_priority
        copied = dict(row)
        copied["rerank_score"] = rerank_score
        copied["final_score"] = float(row["final_score"]) + rerank_score
        matched_by = list(copied.get("matched_by") or [])
        if rerank_score > 0 and "reranker" not in matched_by:
            matched_by.append("reranker")
        copied["matched_by"] = matched_by
        reranked.append(copied)

    reranked.sort(
        key=lambda row: (
            -float(row["final_score"]),
            -float(row.get("rerank_score") or 0.0),
            float(row["distance"]),
            row["source_type"],
            row["source_id"],
            row["chunk_index"],
        )
    )
    return reranked[:limit]


def extract_tokens(text: str) -> list[str]:
    tokens: list[str] = []
    for raw in TOKEN_PATTERN.findall(text.lower()):
        token = raw.strip()
        if len(token) < 2 or token in STOPWORDS:
            continue
        if token not in tokens:
            tokens.append(token)
    return tokens[:12]


def lightweight_source_priority(source_type: str) -> float:
    priority = {
        S.BID_RESULT: 0.05,
        S.LOST: 0.05,
        S.PRB_RESULT: 0.04,
        S.RFP: 0.04,
        S.RFP_ANALYSIS: 0.04,
        S.WON: 0.03,
        S.PRB: 0.03,
        S.PROJECT_RESULT_REPORT: 0.03,
        S.MAINTENANCE_QUOTE: 0.03,
        S.POST_SALES: 0.03,
        S.ORDER_REPORT: 0.02,
        S.CONTRACT: 0.02,
        S.MODULE: 0.02,
    }
    return priority.get(source_type.upper(), 0.0)
