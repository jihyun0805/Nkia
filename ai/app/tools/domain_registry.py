# 인수인계: 도구 호출이 사용할 수 있는 ERP 도메인과 필드 정의 registry입니다.
# 핵심 흐름: LLM/tool planner가 허용된 도메인 밖으로 나가지 않게 하는 목록입니다.
# 같이 확인: 도메인 추가 시 executor와 specs의 schema를 같이 맞추세요.
"""Orbis 백엔드 도메인(테이블) 메타데이터 단일 출처.

신규 도메인 추가 시 본 파일 한 곳만 수정하면
- tool spec JSON enum
- executor 의 SQL 컬럼 매핑
- tool_loop fast-path 의 default metric / sort
가 모두 갱신된다.
"""

from __future__ import annotations

from dataclasses import dataclass
from types import MappingProxyType
from typing import Mapping


@dataclass(frozen=True, slots=True)
class DomainSpec:
    name: str
    code_column: str | None = None
    date_column: str | None = None
    status_column: str = "status"
    default_metric: str | None = None
    is_public: bool = False
    has_opportunity_fk: bool = True
    # code_column 이 없는 도메인에서 LIKE 조회에 사용할 표시명 컬럼 (선택).
    name_column: str | None = None


_REGISTRY: dict[str, DomainSpec] = {
    "project_opportunity": DomainSpec(
        name="project_opportunity",
        code_column="opportunity_code",
        date_column="created_at",
        status_column="current_status",
        default_metric="expected_budget",
        has_opportunity_fk=False,
    ),
    "quotation": DomainSpec(
        name="quotation",
        code_column="quotation_code",
        date_column="quotation_date",
        default_metric="total_price",
    ),
    "maintenance_quotation": DomainSpec(
        name="maintenance_quotation",
        code_column="ref_no",
        date_column="start_date",
        default_metric="total_amount",
    ),
    "order_report": DomainSpec(
        name="order_report",
        # BE: OrderReport.java#L52-53 → @Column private String orderReportCode → DB: order_report_code
        code_column="order_report_code",
        date_column="created_at",
        default_metric="total_amount",
    ),
    "contract": DomainSpec(
        name="contract",
        code_column=None,  # contract 에 별도 code 컬럼 없음 (id PK 사용)
        date_column="contract_date",
        default_metric="contract_amount",
    ),
    "billing": DomainSpec(
        name="billing",
        # BE: Billing.java#L41-45 에 billing_date 없음. 청구 발행 시점 → issued_at 채택
        # 대안 컬럼: requested_issue_date(L41), collected_at(L45).
        date_column="issued_at",
        default_metric="billing_amount",  # 실제 컬럼은 billing_amount
    ),
    "sales_activity": DomainSpec(
        name="sales_activity",
        date_column="activity_date_time",
    ),
    "rfp_analyze_result": DomainSpec(
        name="rfp_analyze_result",
        code_column="rfp_analysis_code",
        date_column="created_at",
    ),
    "prb": DomainSpec(
        name="prb",
        code_column="prb_code",
        date_column="meeting_date",
    ),
    "prb_result": DomainSpec(
        name="prb_result",
        code_column="prb_result_code",
        date_column="created_at",
    ),
    "bid_result": DomainSpec(
        name="bid_result",
        # BE: BidResult.java 에 *_code 컬럼 없음 (id PK + project_opportunity_id FK)
        code_column=None,
        date_column="created_at",
        default_metric="bid_amount",
    ),
    "license": DomainSpec(
        name="license",
        # BE: License.java 에 license_code 컬럼 없음. product_name 으로 LIKE fallback.
        code_column=None,
        name_column="product_name",
        date_column="created_at",
        status_column="license_status",
        default_metric="total_price",
    ),
    "customer_support": DomainSpec(
        name="customer_support",
        date_column="created_at",
    ),
    "project": DomainSpec(
        name="project",
        # BE: Project.java#L42-43 → @Column unique String pjtNumber → DB: pjt_number
        # 기존 "code" 는 ProjectCode enum(L57-58) 으로 단건 키가 아님.
        code_column="pjt_number",
        name_column="pjt_name",
        date_column="start_date",
        default_metric="total_amount",
    ),
    "project_result_report": DomainSpec(
        name="project_result_report",
        date_column="created_at",
    ),
    "users": DomainSpec(
        name="users",
        code_column="id",
        is_public=True,
        has_opportunity_fk=False,
    ),
    "department": DomainSpec(
        name="department",
        code_column="id",
        is_public=True,
        has_opportunity_fk=False,
    ),
}


DOMAINS: Mapping[str, DomainSpec] = MappingProxyType(_REGISTRY)
DOMAIN_NAMES: list[str] = list(_REGISTRY.keys())


def get_domain(name: str) -> DomainSpec | None:
    return _REGISTRY.get(name)


def is_allowed_domain(name: str) -> bool:
    return name in _REGISTRY
