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
        code_column="won_report_code",
        date_column="created_at",
        default_metric="total_amount",
    ),
    "contract": DomainSpec(
        name="contract",
        code_column="contract_code",
        date_column="contract_start_date",
        default_metric="contract_amount",
    ),
    "billing": DomainSpec(
        name="billing",
        date_column="billing_date",
        default_metric="bill_amount",
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
        code_column="bid_result_code",
        date_column="created_at",
        default_metric="bid_amount",
    ),
    "license": DomainSpec(
        name="license",
        code_column="license_code",
        date_column="created_at",
        status_column="license_status",
        default_metric="total_price",
    ),
    "customer_support": DomainSpec(
        name="customer_support",
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
