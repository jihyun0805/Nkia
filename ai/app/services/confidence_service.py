# 인수인계: 검색 후보 점수와 매칭 사유를 기반으로 high/medium/low 신뢰도를 계산합니다.
# 핵심 흐름: 낮은 신뢰도면 LangGraph가 답변 생성을 멈추고 근거 부족 메시지로 바꿀 수 있습니다.
# 같이 확인: threshold 변경은 answer_service.py의 low confidence 가드와 사용자 경험을 같이 확인하세요.
from typing import Any


def compute_confidence_assessment(rows: list[dict[str, Any]]) -> tuple[float | None, str | None, list[str]]:
    if not rows:
        return 0.0, "low", ["no_results"]

    top_score = float(rows[0]["final_score"])
    second_score = float(rows[1]["final_score"]) if len(rows) > 1 else max(top_score - 0.12, 0.0)
    margin = max(0.0, top_score - second_score)
    # 1.2: hybrid score rarely exceeds this in practice; 1.4 made good matches look weak
    normalized_top = min(top_score / 1.2, 1.0)
    # 0.12: typical margin between relevant vs. fallback; 0.22 meant clear_margin almost never fired
    normalized_margin = min(margin / 0.12, 1.0)

    reasons: list[str] = []
    if normalized_top >= 0.75:
        reasons.append("strong_top_match")
    if normalized_margin >= 0.5:
        reasons.append("clear_margin")

    source_types = {str(row.get("source_type") or "") for row in rows[:5]}
    if len(source_types) >= 3:
        reasons.append("multi_source_support")
        source_diversity_bonus = 0.05
    elif len(source_types) == 2:
        reasons.append("multi_source_support")
        source_diversity_bonus = 0.02
    elif len(source_types) == 1:
        reasons.append("single_source_cluster")
        source_diversity_bonus = 0.0
    else:
        source_diversity_bonus = 0.0

    # 60/40 weighting: margin gap is a strong signal; 70/30 underweighted it
    base = (normalized_top * 0.6) + (normalized_margin * 0.4)
    confidence = round(max(0.0, min(base + source_diversity_bonus, 1.0)), 3)
    if confidence >= 0.75:
        return confidence, "high", reasons
    if confidence >= 0.5:
        return confidence, "medium", reasons
    return confidence, "low", reasons
