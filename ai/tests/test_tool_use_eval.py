"""
Tool-use regression eval suite for Orbis AI chatbot.

Usage:
    python test_tool_use_eval.py

Requires the backend to be running at http://localhost:8080/api/v1.
No pytest needed — runs standalone.
"""

from __future__ import annotations

import json
import sys
import time
from dataclasses import dataclass, field
from typing import List

import requests

BASE_URL = "http://localhost:8080/api/v1"
EMAIL = "admin@admin.com"
PASSWORD = "admin"
TIMEOUT = 60  # seconds per case


# ---------------------------------------------------------------------------
# Eval case definition
# ---------------------------------------------------------------------------

@dataclass
class EvalCase:
    category: str
    query: str
    expected_keywords: List[str]  # PASS if ANY keyword is found in answer
    notes: str = ""


# ---------------------------------------------------------------------------
# 20 eval cases — 5 categories × 4
# ---------------------------------------------------------------------------

CASES: List[EvalCase] = [
    # ── 1. 집계 (aggregate_metric tool) ─────────────────────────────────────
    EvalCase(
        category="집계",
        query="유지보수 견적 평균 금액은?",
        expected_keywords=["86,254,545", "86,254", "평균", "천만"],
        notes="aggregate_metric → maintenance estimate average",
    ),
    EvalCase(
        category="집계",
        query="청구 합계 알려줘",
        expected_keywords=["합계", "총", "원"],
        notes="aggregate_metric → billing total sum",
    ),
    EvalCase(
        category="집계",
        query="사업기회는 총 몇 건?",
        expected_keywords=["50", "56", "건"],
        notes="aggregate_metric → opportunity count",
    ),
    EvalCase(
        category="집계",
        query="수주보고서 평균 금액",
        expected_keywords=["평균", "원"],
        notes="aggregate_metric → sales report average amount",
    ),

    # ── 2. 단건 (lookup_entity tool) ─────────────────────────────────────────
    EvalCase(
        category="단건",
        query="AUTO-OPP-2026-119 사업기회 알려줘",
        expected_keywords=["국가정보자원관리원"],
        notes="lookup_entity → specific opportunity by code",
    ),
    EvalCase(
        category="단건",
        query="AUTO-OPP-2026-101 상태",
        expected_keywords=["KB국민은행"],
        notes="lookup_entity → opportunity status / customer",
    ),
    EvalCase(
        category="단건",
        query="박유신 부서",
        expected_keywords=["영업1", "영업 1"],
        notes="lookup_entity → employee department lookup",
    ),
    EvalCase(
        category="단건",
        query="한지훈 직책",
        expected_keywords=["TEAM_LEADER", "팀장", "리더"],
        notes="lookup_entity → employee title lookup",
    ),

    # ── 3. 상위 N (list_entities tool) ───────────────────────────────────────
    EvalCase(
        category="상위 N",
        query="예상 사업비 TOP3",
        expected_keywords=["2,400,000,000", "2.4", "국가정보"],
        notes="list_entities → top 3 by expected_amount",
    ),
    EvalCase(
        category="상위 N",
        query="견적 금액 큰 순으로 5건",
        expected_keywords=["원", "견적"],
        notes="list_entities → top 5 estimates by amount",
    ),
    EvalCase(
        category="상위 N",
        query="최근 사업기회 5건",
        expected_keywords=["최근", "AUTO-OPP"],
        notes="list_entities → 5 most recent opportunities",
    ),
    EvalCase(
        category="상위 N",
        query="계약 금액 가장 큰 사업",
        expected_keywords=["원", "계약"],
        notes="list_entities → highest contract amount opportunity",
    ),

    # ── 4. 도메인 다양성 ────────────────────────────────────────────────────
    EvalCase(
        category="도메인",
        query="솔루션컨설팅팀 직원 알려줘",
        expected_keywords=["솔루션컨설팅"],
        notes="employee list by team name",
    ),
    EvalCase(
        category="도메인",
        query="유지보수 견적 중 가장 큰 금액",
        expected_keywords=["원", "유지보수"],
        notes="maintenance estimate max amount",
    ),
    EvalCase(
        category="도메인",
        query="미수금 있는 사업 알려줘",
        expected_keywords=["미수", "원"],
        notes="opportunities with outstanding receivables",
    ),
    EvalCase(
        category="도메인",
        query="진행중인 사업기회",
        expected_keywords=["진행", "PROGRESSING"],
        notes="filter opportunities by PROGRESSING status",
    ),

    # ── 5. 멀티 step (여러 tool 호출 가능) ──────────────────────────────────
    EvalCase(
        category="멀티 step",
        query="AUTO-OPP-2026-119 사업의 견적 평균은?",
        expected_keywords=["원", "평균"],
        notes="lookup opportunity then aggregate its estimates",
    ),
    EvalCase(
        category="멀티 step",
        query="지난달 청구 합계",
        expected_keywords=["합계", "원"],
        notes="time-scoped aggregate — last month billing total",
    ),
    EvalCase(
        category="멀티 step",
        query="예상 사업비 TOP3 의 각 견적은?",
        expected_keywords=["견적", "원"],
        notes="rank opportunities then fetch estimates for each",
    ),
    EvalCase(
        category="멀티 step",
        query="공공 고객 사업기회 카운트",
        expected_keywords=["공공", "건"],
        notes="filter by customer group then count",
    ),
]


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------

def login() -> str:
    """Return an access token."""
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("result") != "SUCCESS":
        raise RuntimeError(f"Login failed: {data}")
    return data["data"]["accessToken"]


def create_session(token: str, title: str = "eval") -> str:
    """Create a new chatbot session and return its id."""
    resp = requests.post(
        f"{BASE_URL}/chatbot/sessions",
        json={"title": title},
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("result") != "SUCCESS":
        raise RuntimeError(f"Session creation failed: {data}")
    return data["data"]["id"]


def ask(token: str, thread_id: str, query: str) -> str:
    """Send a query and return the answer text."""
    payload = {
        "query": query,
        "threadId": thread_id,
        "limit": 5,
        "history": [],
        "attachmentSessionId": None,
    }
    resp = requests.post(
        f"{BASE_URL}/chatbot/answer",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("result") != "SUCCESS":
        return f"[ERROR] {data.get('message', data)}"
    return data["data"].get("answer", "")


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run_eval() -> None:
    # ── connectivity check ────────────────────────────────────────────────
    try:
        ping = requests.get(f"{BASE_URL}/chatbot/date-range", timeout=5)
        # 401 is fine — it means the server is up
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Backend not reachable at {BASE_URL}. Skipping eval.")
        sys.exit(1)

    print("========== Tool-use Eval ==========")

    token = login()

    results: list[tuple[EvalCase, bool, str]] = []

    for i, case in enumerate(CASES, 1):
        # Fresh session per case keeps conversation history isolated
        sid = create_session(token, title=f"eval-case-{i}")

        try:
            ans = ask(token, sid, case.query)
        except Exception as exc:  # noqa: BLE001
            ans = f"[EXCEPTION] {exc}"

        passed = any(kw in ans for kw in case.expected_keywords)
        results.append((case, passed, ans))

        tag = "PASS" if passed else "FAIL"
        ans_preview = ans.replace("\n", " ")[:100]
        print(f"[{tag}] ({case.category}) Q: {case.query} | ANS: {ans_preview}")

    print_report(results)


def print_report(results: list[tuple[EvalCase, bool, str]]) -> None:
    print("\n======= 결과 =======")

    # Collect categories in order of first appearance
    seen: list[str] = []
    for case, _, _ in results:
        if case.category not in seen:
            seen.append(case.category)

    cat_totals: dict[str, list[int]] = {cat: [0, 0] for cat in seen}  # [pass, total]
    for case, passed, _ in results:
        cat_totals[case.category][1] += 1
        if passed:
            cat_totals[case.category][0] += 1

    total_pass = 0
    total_all = len(results)

    for cat in seen:
        p, t = cat_totals[cat]
        total_pass += p
        print(f"{cat}: {p}/{t}")

    pct = int(total_pass / total_all * 100) if total_all else 0
    print(f"총: {total_pass}/{total_all} ({pct}%)")


if __name__ == "__main__":
    run_eval()
