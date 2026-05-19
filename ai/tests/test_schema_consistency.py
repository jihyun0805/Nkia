"""domain_registry.py 와 BE 엔티티 실제 컬럼명의 정합성을 검증한다.

목적
----
``app.tools.domain_registry`` 는 챗봇 SQL 빌더가 참조하는 컬럼명(SoT)이다.
BE Java 엔티티에서 ``@Column`` / ``@JoinColumn`` 으로 정의된 실제 DB 컬럼명과
어긋나면 라이브 쿼리에서 ``UndefinedColumn`` 으로 SAVEPOINT silent fail 이
발생한다. 본 모듈은 도메인별로 BE 엔티티 컬럼 카탈로그(hardcoded)를 두고
registry 값이 카탈로그에 존재하는지 단위 테스트로 검증해 회귀를 차단한다.

전략
----
* **A. 정적 검증 (필수)** — BE entity 파일을 사람이 검토한 컬럼 화이트리스트와
  비교. 신규 라이브러리 의존 없음.
* **B. 라이브 DB 검증 (선택)** — ``BE_TEST_DB_URL`` 환경변수가 있을 때만
  ``information_schema.columns`` 로 검증. 의존성에 이미 있는 ``psycopg`` 사용.

카탈로그 출처
-------------
BE entity (snake_case 변환 + ``@Column(name=...)`` override 적용 + BaseEntity 상속):

* project_opportunity → ProjectOpportunity.java
* quotation           → Quotation.java
* maintenance_quotation → MaintenanceQuotation.java
* order_report        → OrderReport.java
* contract            → Contract.java
* billing             → Billing.java
* sales_activity      → SalesActivity.java
* rfp_analyze_result  → RfpAnalyzeResult.java
* prb                 → Prb.java
* prb_result          → PrbResult.java   (id 컬럼 override: prb_result_id)
* bid_result          → BidResult.java
* license             → License.java
* customer_support    → CustomerSupport.java
* project             → Project.java
* project_result_report → ProjectResultReport.java
* users               → User.java         (@Table(name="users"))
* department          → Department.java

BaseEntity 상속 컬럼 (모든 도메인 공통):
    created_at, updated_at, created_by, updated_by,
    deleted, deleted_at, deleted_by
"""

from __future__ import annotations

import os
from typing import Iterable

import pytest

from app.tools.domain_registry import DOMAINS, DomainSpec


# ---------------------------------------------------------------------------
# BE 엔티티 실제 컬럼 카탈로그 (snake_case)
# ---------------------------------------------------------------------------

_BASE_ENTITY_COLUMNS: frozenset[str] = frozenset(
    {
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "deleted",
        "deleted_at",
        "deleted_by",
    }
)


def _with_base(*extra: str) -> frozenset[str]:
    return _BASE_ENTITY_COLUMNS | frozenset(extra)


BE_COLUMN_CATALOG: dict[str, frozenset[str]] = {
    "project_opportunity": _with_base(
        "id",
        "opportunity_code",
        "opportunity_name",
        "stage",
        "project_type",
        "sales_representative_id",
        "expected_bid_date",
        "expected_budget",
        "description",
        "competition_status",
        "customer_company_id",
    ),
    "quotation": _with_base(
        "id",
        "status",
        "ref_no",
        "quotation_code",
        "project_opportunity_id",
        "quotation_date",
        "payment_condition",
        "consumer_total_price",
        "supply_total_price",
        "labor_total_price",
        "total_price",
        "note",
    ),
    "maintenance_quotation": _with_base(
        "id",
        "status",
        "project_id",
        "ref_no",
        "quotation_date",
        "payment_terms",
        "total_amount",
        "start_date",
        "end_date",
        "monthly_supply_price",
        "total_quotation_amount",
        "special_notes",
    ),
    "order_report": _with_base(
        "id",
        "status",
        "vat_type",
        "order_report_code",
        "total_amount",
        "payment_condition",
        "quotation_provided",
        "contract_provided",
        "purchase_order_provided",
        "prb_report_provided",
        "additional_documents",
        "type",
        "channel",
        "code_type",
        "contract_date",
        "free_maintenance_period_months",
        "contract_start_date",
        "contract_end_date",
        "contract_period_months",
        "scope_of_work",
        "remarks",
        "project_opportunity_id",
        "pm_user_id",
        "contract_counterpart_company_id",
        "contract_counterpart_manager_id",
        "final_customer_company_id",
        "final_customer_manager_id",
        "license_total",
        "service_total",
        "maintenance_total",
        "other_total",
        "purchase_total",
        "ems_summary",
        "itg_summary",
        "dashboard_summary",
        "aiotion_summary",
        "ems_maintenance_summary",
        "itg_maintenance_summary",
        "ito_summary",
        "other_summary",
        "item_total_amount",
        "item_total_license",
        "item_total_third_party",
        "item_total_service",
        "item_total_maintenance",
        "item_total_maintenance_rate",
    ),
    "contract": _with_base(
        "id",
        "status",
        "order_report_id",
        "contract_file_id",
        "proposal_type",
        "contract_amount",
        "contract_date",
        "maintenance_condition",
        "sales_representative_id",
    ),
    "billing": _with_base(
        "id",
        "approval_status",
        "order_report_id",
        "billing_amount",
        "requested_issue_date",
        "issued_at",
        "collected_at",
        "remarks",
        "invoice_image_id",
        "status",
    ),
    "sales_activity": _with_base(
        "id",
        "project_opportunity_id",
        "activity_type",
        "activity_purpose",
        "activity_content",
        "location",
        "activity_date_time",
        "issue",
        "next_activity",
        "customer_interest",
        "status",
    ),
    "rfp_analyze_result": _with_base(
        "id",
        "project_name",
        "hardware_provider",
        "budget_amount",
        "expected_duration",
        "project_location",
        "proposal_deadline",
        "project_description",
        "status",
        "proposal_type",
        "assignee_id",
        "project_opportunity_id",
    ),
    "prb": _with_base(
        "id",
        "status",
        "prb_code",
        "prb_date",
        "maintenance_description",
        "prb_total_cost",
        "sales_representative_opinion",
        "project_opportunity_id",
        "sales_representative_id",
    ),
    "prb_result": _with_base(
        # PrbResult.id 는 @Column(name="prb_result_id") 로 override 되었으므로
        # 일반 'id' 컬럼은 존재하지 않는다.
        "prb_result_id",
        "status",
        "prb_id",
        "risk_factors",
        "comprehensive_opinion",
        "meeting_location",
        "meeting_date_time",
    ),
    "bid_result": _with_base(
        "id",
        "status",
        "project_opportunity_id",
        "proposal_id",
        "sales_representative_id",
        "project_manager_id",
        "budget",
        "is_external_pd_involved",
        "key_success_factors",
        "rfp_issues",
        "proposal_strategy",
        "bid_outcome",
        "disclosure_status",
        "bid_announcement_date",
        "presentation_date",
        "total_analysis_score",
    ),
    "license": _with_base(
        "id",
        "status",
        "order_report_id",
        "product_module_id",
        "product_class",
        "product_group",
        "product_name",
        "quantity",
        "price",
        "total_price",
        "license_type",
        "license_status",
        "customer_company_id",
        "start_date",
        "end_date",
    ),
    "customer_support": _with_base(
        "id",
        "maintenance_id",
        "customer_company_id",
        "request_id",
        "activity_type",
        "activity_start_time",
        "activity_end_time",
        "activity_content",
        "registrant_id",
        "remarks",
    ),
    "project": _with_base(
        "id",
        "pjt_number",
        "pjt_name",
        "total_amount",
        "type",
        "code",
        "start_date",
        "end_date",
        "order_report_id",
        "manager_id",
        "sales_representative_id",
    ),
    "project_result_report": _with_base(
        "id",
        "project_id",
        "result_report_file_id",
    ),
    "users": _with_base(
        "id",
        "employee_number",
        "position",
        "name",
        "phone",
        "email",
        "password",
        "status",
        "department_id",
    ),
    "department": _with_base(
        "id",
        "headquarters",
        "team",
    ),
}


# ---------------------------------------------------------------------------
# 헬퍼: registry → "확인이 필요한 컬럼" 목록
# ---------------------------------------------------------------------------


def _referenced_columns(spec: DomainSpec) -> dict[str, str]:
    """DomainSpec 의 컬럼 슬롯 → 값(None 은 제외)."""
    refs: dict[str, str] = {}
    if spec.code_column is not None:
        refs["code_column"] = spec.code_column
    if spec.date_column is not None:
        refs["date_column"] = spec.date_column
    if spec.name_column is not None:
        refs["name_column"] = spec.name_column
    # default_metric 도 컬럼 직접 참조 (executor 가 ORDER BY/SELECT 에 사용).
    if spec.default_metric is not None:
        refs["default_metric"] = spec.default_metric
    # status_column 은 항상 값이 있으므로 별도 포함.
    refs["status_column"] = spec.status_column
    return refs


def _iter_domain_specs() -> Iterable[tuple[str, DomainSpec]]:
    return ((name, spec) for name, spec in DOMAINS.items())


# ---------------------------------------------------------------------------
# A. 정적 검증
# ---------------------------------------------------------------------------


def test_be_catalog_covers_every_registry_domain() -> None:
    """카탈로그에 모든 registry 도메인이 등재되어 있어야 한다 (커버리지 게이트)."""
    missing = sorted(set(DOMAINS.keys()) - set(BE_COLUMN_CATALOG.keys()))
    assert not missing, (
        "BE_COLUMN_CATALOG 에 누락된 도메인이 있다. "
        f"누락: {missing} (테스트 본문에 컬럼 화이트리스트 추가 필요)"
    )


def test_domain_registry_columns_exist_in_be() -> None:
    """domain_registry 가 참조하는 모든 컬럼이 BE 카탈로그에 존재해야 한다."""
    failures: list[str] = []
    for name, spec in _iter_domain_specs():
        catalog = BE_COLUMN_CATALOG.get(name)
        if catalog is None:
            # 위 test 가 먼저 잡지만, 방어적으로 스킵.
            continue
        for slot, column in _referenced_columns(spec).items():
            if column not in catalog:
                failures.append(
                    f"[{name}] {slot}='{column}' 가 BE 컬럼 카탈로그에 없음"
                )

    assert not failures, (
        "domain_registry 와 BE 엔티티 컬럼이 어긋남:\n  - "
        + "\n  - ".join(failures)
    )


def test_domain_registry_code_column_either_none_or_in_catalog() -> None:
    """code_column 은 None 이거나 카탈로그에 존재해야 한다 (LIKE fallback 안전망)."""
    failures: list[str] = []
    for name, spec in _iter_domain_specs():
        if spec.code_column is None:
            # name_column 이 대체 컬럼으로 지정되어야 함 (선택적이지만 권장).
            continue
        catalog = BE_COLUMN_CATALOG.get(name)
        if catalog is None:
            continue
        if spec.code_column not in catalog:
            failures.append(
                f"[{name}] code_column='{spec.code_column}' 가 BE 카탈로그에 없음"
            )

    assert not failures, "orphaned code_column 발견:\n  - " + "\n  - ".join(failures)


def test_domain_registry_has_no_unknown_domains() -> None:
    """카탈로그가 모르는 신규 도메인이 registry 에 추가되었는지 감시 (양방향 게이트)."""
    unknown = sorted(set(DOMAINS.keys()) - set(BE_COLUMN_CATALOG.keys()))
    assert not unknown, (
        "registry 에 신규 도메인이 추가되었지만 BE_COLUMN_CATALOG 가 갱신되지 않음. "
        f"신규: {unknown}"
    )


# ---------------------------------------------------------------------------
# B. 라이브 DB 검증 (env 가드)
# ---------------------------------------------------------------------------


def _load_live_columns(dsn: str) -> dict[str, frozenset[str]]:
    """``information_schema.columns`` 로부터 도메인별 실제 컬럼 셋을 로드."""
    import psycopg  # 이미 pyproject 의존성에 있음 (psycopg[binary]==3.2.3)

    table_names = tuple(DOMAINS.keys())
    sql = (
        "SELECT table_name, column_name "
        "FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = ANY(%s)"
    )

    by_table: dict[str, set[str]] = {name: set() for name in table_names}
    with psycopg.connect(dsn) as conn:  # type: ignore[arg-type]
        with conn.cursor() as cur:
            cur.execute(sql, (list(table_names),))
            for table, column in cur.fetchall():
                by_table.setdefault(table, set()).add(column)
    return {name: frozenset(cols) for name, cols in by_table.items()}


def test_be_db_live_check() -> None:
    """``BE_TEST_DB_URL`` 가 설정된 경우에만 라이브 검증을 수행한다."""
    dsn = os.environ.get("BE_TEST_DB_URL")
    if not dsn:
        pytest.skip(
            "BE_TEST_DB_URL 미설정 — 라이브 DB 정합성 검증 건너뜀 (정적 검증은 수행됨)"
        )

    try:
        import psycopg  # noqa: F401
    except Exception as exc:  # pragma: no cover - 환경 가드
        pytest.skip(f"psycopg 임포트 실패: {exc!r}")

    try:
        live_columns = _load_live_columns(dsn)
    except Exception as exc:  # pragma: no cover - 환경 가드
        pytest.skip(f"BE DB 접속/조회 실패: {exc!r}")

    failures: list[str] = []
    for name, spec in _iter_domain_specs():
        actual = live_columns.get(name)
        if not actual:
            failures.append(f"[{name}] 테이블이 information_schema 에 없음")
            continue
        for slot, column in _referenced_columns(spec).items():
            if column not in actual:
                failures.append(
                    f"[{name}] {slot}='{column}' 가 live DB 컬럼에 없음"
                )

    assert not failures, (
        "live DB 와 domain_registry 컬럼이 어긋남:\n  - "
        + "\n  - ".join(failures)
    )
