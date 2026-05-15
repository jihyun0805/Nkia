"""Orbis 로컬 오토시드 - Phase 1.

흐름:
1. admin 으로 로그인
2. 추가 유저 ~20명을 부서별로 생성 (백엔드 4명 기본 유저는 이미 존재)
3. 영업 담당자 유저 풀에서 로테이션하며:
   - 고객사 50여 곳 + 협력사 8곳 등록
   - 고객사별 담당자(CompanyManager) 1~2명 등록
   - 사업기회 50건 등록 (각각 다른 영업담당자, 다른 expectedBidDate)

이후 단계(활동/RFP/견적/PRB/입찰/수주/계약/프로젝트/유지보수/청구)는 Phase 2~6 로 분리.

실행 가이드는 README.md 참고.
"""

from __future__ import annotations

import logging
import os
import random
import sys
from datetime import date, timedelta
from typing import Any

from data_pool import (
    CUSTOMERS,
    CUSTOMER_MANAGER_CANDIDATES,
    OPPORTUNITIES,
    PARTNERS,
    SEED_USERS,
    SEED_USER_PASSWORD,
    SeedCompany,
    SeedUser,
)
from orbis_client import OrbisApiError, OrbisClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("autoseed")


# 백엔드 UserInitializer 가 생성한 ADMIN 계정.
# Local: admin@admin.com / admin (기본)
# Deploy: 환경변수로 override 가능 (ORBIS_ADMIN_EMAIL, ORBIS_ADMIN_PASSWORD)
ADMIN_EMAIL = os.environ.get("ORBIS_ADMIN_EMAIL", "admin@admin.com")
ADMIN_PASSWORD = os.environ.get("ORBIS_ADMIN_PASSWORD", "admin")


# ──────────────────────────────────────────────────────────────────
# 헬퍼
# ──────────────────────────────────────────────────────────────────

def chunked(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def to_role_name_for_seed_user(user: SeedUser) -> str:
    """SeedUser 의 role 필드를 백엔드 Role 이름으로 매핑."""
    return user.role


def ensure_admin_session(client: OrbisClient) -> None:
    if ADMIN_EMAIL in client.sessions:
        return
    logger.info("admin 로그인 → %s", ADMIN_EMAIL)
    client.login(ADMIN_EMAIL, ADMIN_PASSWORD)


# ──────────────────────────────────────────────────────────────────
# Step 1. 추가 유저 생성
# ──────────────────────────────────────────────────────────────────

def fetch_departments(client: OrbisClient) -> dict[tuple[str, str], int]:
    """부서 목록을 (headquarters, team) → id 로 매핑."""
    departments = client.get("/admin/departments", ADMIN_EMAIL)
    mapping: dict[tuple[str, str], int] = {}
    for d in departments:
        mapping[(d["headquarters"], d["team"])] = d["id"]
    return mapping


def fetch_roles(client: OrbisClient) -> dict[str, int]:
    """Role 이름 → id."""
    roles = client.get("/admin/roles", ADMIN_EMAIL)
    return {r["name"]: r["id"] for r in roles}


def fetch_existing_user_emails(client: OrbisClient) -> set[str]:
    users = client.get("/user", ADMIN_EMAIL)
    return {u["email"] for u in users}


def create_seed_users(client: OrbisClient) -> dict[str, str]:
    """SEED_USERS 를 백엔드에 시드. 이메일 → password 반환 (이후 로그인용)."""
    dept_map = fetch_departments(client)
    role_map = fetch_roles(client)
    existing_emails = fetch_existing_user_emails(client)
    credentials: dict[str, str] = {}

    for user in SEED_USERS:
        if user.email in existing_emails:
            logger.info("이미 존재 - 스킵: %s", user.email)
            credentials[user.email] = SEED_USER_PASSWORD
            continue
        dept_id = dept_map.get((user.dept_headquarters, user.dept_team))
        if not dept_id:
            logger.warning("부서를 못 찾음 - 스킵: %s %s / %s", user.email, user.dept_headquarters, user.dept_team)
            continue
        role_id = role_map.get(to_role_name_for_seed_user(user))
        body = {
            "email": user.email,
            "password": SEED_USER_PASSWORD,
            "employeeNumber": user.employee_number,
            "position": user.position,
            "name": user.name,
            "phone": user.phone,
            "departmentId": dept_id,
            "roleIds": [role_id] if role_id else [],
        }
        try:
            client.post("/user/signup/user", ADMIN_EMAIL, body)
            logger.info("유저 생성: %s (%s/%s, %s)", user.email, user.dept_headquarters, user.dept_team, user.position)
            credentials[user.email] = SEED_USER_PASSWORD
        except OrbisApiError as exc:
            logger.error("유저 생성 실패: %s → %s", user.email, exc)
    return credentials


# ──────────────────────────────────────────────────────────────────
# Step 2. 고객사 / 협력사 생성
# ──────────────────────────────────────────────────────────────────

def fetch_existing_company_codes(client: OrbisClient, actor_email: str) -> set[str]:
    codes: set[str] = set()
    page = 0
    while True:
        body = client.get(
            "/companies", actor_email, params={"page": page, "size": 100}
        )
        items = body.get("content", []) if isinstance(body, dict) else []
        for c in items:
            if c.get("code"):
                codes.add(c["code"])
        if not items or page >= body.get("totalPages", 1) - 1:
            break
        page += 1
    return codes


def create_companies(client: OrbisClient, actor_email: str) -> dict[str, int]:
    """code → id 매핑 반환."""
    existing = fetch_existing_company_codes(client, actor_email)
    mapping: dict[str, int] = {}
    # 이미 존재하는 회사도 매핑 필요 → 전체 다시 페이지 순회
    page = 0
    while True:
        body = client.get(
            "/companies", actor_email, params={"page": page, "size": 100}
        )
        items = body.get("content", []) if isinstance(body, dict) else []
        for c in items:
            if c.get("code"):
                mapping[c["code"]] = c["id"]
        if not items or page >= body.get("totalPages", 1) - 1:
            break
        page += 1

    for company in CUSTOMERS + PARTNERS:
        if company.code in existing:
            logger.info("회사 이미 존재 - 스킵: %s %s", company.code, company.name)
            continue
        body = {
            "companyType": "CUSTOMER" if company in CUSTOMERS else "PARTNER",
            "code": company.code,
            "name": company.name,
            "businessRegistrationNumber": company.business_registration_number,
            "sector": company.sector,
            "category": company.category,
            "address": company.address,
        }
        try:
            company_id = client.post("/companies", actor_email, body)
            mapping[company.code] = company_id
            logger.info("회사 생성: %s %s (id=%s)", company.code, company.name, company_id)
        except OrbisApiError as exc:
            logger.error("회사 생성 실패: %s → %s", company.name, exc)
    return mapping


# ──────────────────────────────────────────────────────────────────
# Step 3. 고객사 담당자
# ──────────────────────────────────────────────────────────────────

def _email_local_for_company(name: str) -> str:
    """회사명에서 이메일 로컬 도메인 추출 (예: 'NH농협은행' → 'nonghyup', 'KB국민은행' → 'kbstar')."""
    table = {
        "KB국민은행": "kbstar.co.kr", "신한은행": "shinhan.com", "우리은행": "wooribank.com",
        "하나은행": "hanabank.com", "IBK기업은행": "ibk.co.kr", "NH농협은행": "nonghyup.com",
        "수협은행": "suhyup-bank.com", "롯데카드": "lottecard.co.kr", "신한카드": "shinhancard.com",
        "하나카드": "hanacard.co.kr", "KG캐피탈": "kgcapital.co.kr", "키움증권": "kiwoom.com",
        "우리투자증권": "wooriib.com", "NH농협생명": "nhlife.co.kr", "KDB생명": "kdblife.co.kr",
        "한국가스공사": "kogas.or.kr", "한국도로공사": "ex.co.kr", "한국남동발전": "koenergy.kr",
        "국가정보자원관리원": "nirs.go.kr", "기상청": "kma.go.kr", "경기도교육청": "goe.go.kr",
        "한국산업기술진흥원": "kiat.or.kr", "대한적십자사": "redcross.or.kr",
        "부산교통공사": "humetro.busan.kr", "한국전력공사": "kepco.co.kr",
        "한국수자원공사": "kwater.or.kr", "국민건강보험공단": "nhis.or.kr",
        "SK텔레콤": "sktelecom.com", "LG유플러스": "lguplus.co.kr", "KT": "kt.com",
        "삼성SDS": "samsungsds.com", "삼성물산 건설부문": "samsungcnt.com",
        "현대오토에버": "hyundai-autoever.com", "포스코ICT": "poscoict.com",
        "카카오엔터프라이즈": "kakaoenterprise.com", "네이버클라우드": "ncloud.com",
        "신세계백화점": "shinsegae.com", "롯데정보통신": "lotteinfocomm.com",
        "한화시스템": "hanwha-systems.com", "KB파트너스": "kbpartners.co.kr",
        "엘지CNS": "lgcns.com", "쿠팡": "coupang.com",
    }
    return table.get(name, "example.com")


def _fetch_company_managers(client: OrbisClient, actor_email: str, company_id: int) -> list[dict[str, Any]]:
    body = client.get(f"/companies/{company_id}/managers", actor_email, params={"size": 100})
    return body.get("content", []) if isinstance(body, dict) else []


def create_company_managers(
    client: OrbisClient,
    actor_email: str,
    company_id_by_code: dict[str, int],
) -> None:
    """각 고객사마다 1~2명의 담당자를 등록. 이미 있으면 스킵."""
    rng = random.Random(20260515)  # 결정론적
    for company in CUSTOMERS:
        company_id = company_id_by_code.get(company.code)
        if not company_id:
            continue
        existing = _fetch_company_managers(client, actor_email, company_id)
        existing_emails = {m.get("email") for m in existing}
        # 1~2명 등록 (이 회사의 결정론적 분포)
        count = rng.choice([1, 1, 2])
        picked_indices = rng.sample(range(len(CUSTOMER_MANAGER_CANDIDATES)), count)
        for seq, idx in enumerate(picked_indices, start=1):
            cand = CUSTOMER_MANAGER_CANDIDATES[idx]
            domain = _email_local_for_company(company.name)
            local = f"{company.code.lower()}-{seq}-{idx:02d}"
            email = f"{local}@{domain}"
            if email in existing_emails:
                logger.info("담당자 이미 존재 - 스킵: %s/%s", company.name, email)
                continue
            body = {
                "name": cand["name"],
                "email": email,
                "mobilePhone": f"010-{rng.randint(2000, 9999)}-{rng.randint(1000, 9999)}",
                "officePhone": f"02-{rng.randint(300, 999)}-{rng.randint(1000, 9999)}",
                "department": cand["department"],
                "position": cand["position"],
                "role": "주담당" if seq == 1 else "부담당",
            }
            try:
                manager_id = client.post(
                    f"/companies/{company_id}/managers", actor_email, body
                )
                logger.info("담당자 생성: %s %s/%s (id=%s)", company.name, cand["name"], cand["position"], manager_id)
            except OrbisApiError as exc:
                logger.error("담당자 생성 실패: %s/%s → %s", company.name, cand["name"], exc)


# ──────────────────────────────────────────────────────────────────
# Step 4. 사업기회 50건 등록
# ──────────────────────────────────────────────────────────────────

def login_seed_users(client: OrbisClient, credentials: dict[str, str]) -> None:
    for email, password in credentials.items():
        if email in client.sessions:
            continue
        try:
            client.login(email, password)
        except OrbisApiError as exc:
            logger.error("시드 유저 로그인 실패: %s → %s", email, exc)


def sales_reps_by_team(team_headquarters: str) -> list[SeedUser]:
    return [u for u in SEED_USERS if u.dept_headquarters == team_headquarters]


def _fetch_existing_opportunity_codes(client: OrbisClient, actor_email: str) -> set[str]:
    codes: set[str] = set()
    page = 0
    while True:
        body = client.get(
            "/project-opportunities", actor_email, params={"page": page, "size": 100}
        )
        items = body.get("content", []) if isinstance(body, dict) else []
        for o in items:
            if o.get("opportunityCode"):
                codes.add(o["opportunityCode"])
        if not items or page >= body.get("totalPages", 1) - 1:
            break
        page += 1
    return codes


def create_project_opportunities(
    client: OrbisClient,
    company_id_by_code: dict[str, int],
) -> None:
    rng = random.Random(20260515)
    today = date(2026, 5, 15)

    # 부서별 영업담당자 풀
    sales_pool_1 = sales_reps_by_team("영업1본부")
    sales_pool_2 = sales_reps_by_team("영업2본부")

    existing_codes = _fetch_existing_opportunity_codes(client, ADMIN_EMAIL)

    for idx, scenario in enumerate(OPPORTUNITIES, start=1):
        company_id = company_id_by_code.get(scenario.customer_code)
        if not company_id:
            logger.warning("고객사 미존재 - 스킵: %s", scenario.customer_code)
            continue
        customer = next(c for c in CUSTOMERS if c.code == scenario.customer_code)

        pool = sales_pool_1 if scenario.sales_team == "영업1본부" else sales_pool_2
        # 팀장은 30%, 팀원은 70% 빈도
        team_member_pool = [u for u in pool if u.position == "TEAM_MEMBER"]
        leader_pool = [u for u in pool if u.position == "TEAM_LEADER"]
        if rng.random() < 0.3 and leader_pool:
            sales_rep = rng.choice(leader_pool)
        else:
            sales_rep = rng.choice(team_member_pool or pool)

        # 단계에 따라 expected_bid_date 분포: 발굴/활동은 미래, BID 이후는 과거
        offset_by_stage = {
            "FINDING":           ( 30, 120),
            "ACTIVITY":          (  7,  60),
            "BID_PROPOSING":     (-30,  14),
            "BID_LOST":          (-180, -45),
            "CONTRACT":          (-90,  -14),
            "PROJECT":           (-180, -60),
            "MAINTENANCE_FREE":  (-365,-180),
            "MAINTENANCE_PAID":  (-730,-365),
            "MAINTENANCE_LONG":  (-2200,-700),
            "MAINTENANCE_JP":    (-900, -300),
        }
        lo, hi = offset_by_stage[scenario.target_stage]
        expected_bid = today + timedelta(days=rng.randint(lo, hi))

        opp_code = f"AUTO-OPP-2026-{100 + idx:03d}"
        if opp_code in existing_codes:
            logger.info("사업기회 이미 존재 - 스킵: %s", opp_code)
            continue
        body: dict[str, Any] = {
            "opportunityCode": opp_code,
            "opportunityName": scenario.name_template.format(customer=customer.name),
            "projectType": scenario.project_type,
            "salesRepresentativeId": client.sessions[sales_rep.email].user_id,
            "expectedBidDate": expected_bid.isoformat(),
            "description": scenario.description,
            "competitionStatus": scenario.competition,
            "customerCompanyId": company_id,
        }
        if scenario.expected_budget_won > 0:
            body["expectedBudget"] = scenario.expected_budget_won

        try:
            created = client.post("/project-opportunities", sales_rep.email, body)
            logger.info(
                "사업기회 생성: [%s] %s (담당:%s, 금액:%s원)",
                opp_code,
                body["opportunityName"],
                sales_rep.name,
                f"{scenario.expected_budget_won:,}" if scenario.expected_budget_won > 0 else "미정",
            )
        except OrbisApiError as exc:
            logger.error("사업기회 생성 실패: %s → %s", opp_code, exc)


# ──────────────────────────────────────────────────────────────────
# main
# ──────────────────────────────────────────────────────────────────

def main() -> int:
    client = OrbisClient()
    logger.info("Base URL: %s", client.base_url)

    try:
        ensure_admin_session(client)
    except OrbisApiError as exc:
        logger.error("admin 로그인 실패. 백엔드가 떠 있고 admin@admin.com / admin 이 정상인지 확인. (%s)", exc)
        return 2

    logger.info("=== Step 1. 시드 유저 ~20명 생성 ===")
    credentials = create_seed_users(client)

    logger.info("=== Step 2. 시드 유저 로그인 ===")
    login_seed_users(client, credentials)

    logger.info("=== Step 3. 고객사/협력사 생성 ===")
    # 회사 등록은 admin 으로 (별다른 권한 표시가 없으므로 admin 으로 안전하게)
    company_id_by_code = create_companies(client, ADMIN_EMAIL)

    logger.info("=== Step 4. 고객사 담당자 등록 ===")
    create_company_managers(client, ADMIN_EMAIL, company_id_by_code)

    logger.info("=== Step 5. 사업기회 50건 등록 ===")
    create_project_opportunities(client, company_id_by_code)

    logger.info("=== 완료 ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
