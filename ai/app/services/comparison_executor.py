from __future__ import annotations

from typing import Any

from app.repositories.backend_query_repository import (
    fetch_opportunity_resolution_candidates,
    fetch_opportunity_snapshot,
    fetch_maintenance_snapshot_by_opportunity,
    fetch_project_snapshot,
    resolve_primary_opportunity,
)


# 비교 대상 필드 정의 (label, snapshot_key)
_COMPARISON_FIELDS = [
    ("고객사", "customer_name"),
    ("사업유형", "business_type"),
    ("현재상태", "current_status"),
    ("예상금액", "expected_amount"),
    ("PRB", "prb_code"),
    ("RFP", "rfp_analysis_code"),
    ("수주보고", "won_report_code"),
    ("프로젝트", "project_code"),
    ("유지보수", "maintenance_code"),
    ("주요내용", "main_content"),
    ("이슈", "issue_content"),
    ("경쟁상황", "competitor_status"),
]


def _resolve_opportunity_code(term: str) -> str | None:
    """문자열(코드 or 이름/고객)을 opportunity_code로 변환한다.

    비교 컨텍스트에서는 ambiguous (고객사가 여러 사업기회 보유) 한 경우에도
    가장 큰 (예상금액 높은) 사업기회로 fallback. 비교를 거부하지 않음.
    """
    import re
    CODE_PATTERN = re.compile(r"(?<![A-Z0-9-])[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){2,}(?![A-Z0-9-])")
    if CODE_PATTERN.match(term.strip()):
        return term.strip()
    entity = resolve_primary_opportunity(query_terms=[term], exact_codes=[])
    if entity:
        return entity.get("opportunity_code")
    # ambiguity fallback — candidate 중 customer 또는 opportunity_name 에 term 가
    # 포함된 것 중 expected_amount 가 가장 큰 단일 기회를 선택
    term_lower = term.strip().lower()
    if not term_lower:
        return None
    candidates = fetch_opportunity_resolution_candidates(limit=300)
    matches: list[tuple[int, dict]] = []
    for row in candidates:
        cn = (row.get("customer_name") or "").lower()
        on = (row.get("opportunity_name") or "").lower()
        if term_lower in cn or term_lower in on:
            amount = row.get("expected_amount") or 0
            try:
                amount = int(amount)
            except (TypeError, ValueError):
                amount = 0
            matches.append((amount, row))
    if not matches:
        return None
    matches.sort(key=lambda x: -x[0])
    return matches[0][1].get("opportunity_code")


def build_comparison_result(
    pair_a: str,
    pair_b: str,
    metric: str | None = None,
) -> dict[str, Any] | None:
    """두 사업기회 또는 엔티티를 비교한다.

    Returns None if either entity cannot be resolved.
    """
    code_a = _resolve_opportunity_code(pair_a)
    code_b = _resolve_opportunity_code(pair_b)

    if not code_a or not code_b:
        return None

    snap_a = fetch_opportunity_snapshot(opportunity_code=code_a)
    snap_b = fetch_opportunity_snapshot(opportunity_code=code_b)

    if snap_a is None or snap_b is None:
        return None

    rows: list[dict[str, str]] = []
    for label, key in _COMPARISON_FIELDS:
        val_a = snap_a.get(key)
        val_b = snap_b.get(key)
        if val_a is None and val_b is None:
            continue
        rows.append({
            "field": label,
            "a": _fmt(val_a),
            "b": _fmt(val_b),
            "same": _fmt(val_a) == _fmt(val_b),
        })

    return {
        "entityA": {
            "opportunityCode": code_a,
            "opportunityName": snap_a.get("opportunity_name") or code_a,
            "customerName": snap_a.get("customer_name") or "",
        },
        "entityB": {
            "opportunityCode": code_b,
            "opportunityName": snap_b.get("opportunity_name") or code_b,
            "customerName": snap_b.get("customer_name") or "",
        },
        "comparisonRows": rows,
        "metric": metric,
    }


def format_comparison_answer(result: dict[str, Any]) -> str:
    a = result["entityA"]
    b = result["entityB"]
    name_a = a["opportunityName"]
    name_b = b["opportunityName"]

    lines = [
        f"### {name_a} vs {name_b} 비교",
        "",
        f"| 항목 | {name_a} | {name_b} |",
        "|------|------|------|",
    ]
    for row in result["comparisonRows"]:
        diff_marker = "" if row["same"] else " ⚡"
        lines.append(f"| {row['field']}{diff_marker} | {row['a']} | {row['b']} |")

    diff_count = sum(1 for r in result["comparisonRows"] if not r["same"])
    same_count = len(result["comparisonRows"]) - diff_count
    lines += [
        "",
        f"총 {len(result['comparisonRows'])}개 항목 중 **{diff_count}개 차이** / {same_count}개 동일",
    ]
    return "\n".join(lines)


def _fmt(value: Any) -> str:
    if value is None:
        return "—"
    if isinstance(value, (int, float)):
        try:
            return f"{int(value):,}"
        except (ValueError, OverflowError):
            return str(value)
    return str(value)
