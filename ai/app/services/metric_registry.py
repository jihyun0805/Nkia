from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.models.constants import SourceType

S = SourceType


@dataclass(frozen=True)
class MetricSpec:
    metric_key: str
    metric_label: str
    aliases: tuple[str, ...]
    source_types: tuple[str, ...]
    suffix: str = ""
    default_sort_direction: str = "desc"
    domain: str | None = None
    default_route: str | None = None
    implementability: str | None = None
    priority: str | None = None
    catalog_description: str | None = None


CATALOG_PATH = Path(__file__).resolve().parents[2] / "docs" / "nkia_metric_catalog_v1.json"


MANUAL_SPECS: dict[str, dict[str, Any]] = {
    "estimated_profit": {
        "metric_label": "추정 영업이익",
        "aliases": ("영업 순이익", "영업이익", "추정 영업 이익", "추정영업이익", "순이익"),
        "source_types": ("PRB",),
        "suffix": "원",
        "domain": "bid",
    },
    "estimated_profit_rate": {
        "metric_label": "추정 이익률",
        "aliases": ("이익률", "수익률", "추정 이익율", "추정이익율", "수익성"),
        "source_types": ("PRB",),
        "suffix": "%",
        "domain": "bid",
    },
    "expected_win_rate": {
        "metric_label": "예상 수주율",
        "aliases": ("수주율", "예상 수주율", "승률"),
        "source_types": ("PRB",),
        "suffix": "%",
        "domain": "bid",
    },
    "estimated_revenue": {
        "metric_label": "추정 매출액",
        "aliases": ("추정 매출액", "매출액", "추정 매출", "매출"),
        "source_types": ("PRB",),
        "suffix": "원",
        "domain": "bid",
    },
    "expected_amount": {
        "metric_label": "예상 사업비",
        "aliases": ("예상 사업비", "예상사업비"),
        "source_types": (S.PROJECT_OPPORTUNITY,),
        "suffix": "원",
        "domain": "discovery",
    },
    "contract_amount": {
        "metric_label": "계약 금액",
        "aliases": ("계약 금액", "계약금액", "수주 금액", "수주금액", "총 매출", "전체 매출", "누적 매출"),
        "source_types": (S.WON, S.ORDER_REPORT, S.CONTRACT),
        "suffix": "원",
        "domain": "contract",
    },
    "free_to_paid_conversion_propensity": {
        "metric_label": "유상 전환 가능성",
        "aliases": (
            "유상 유지보수로 전환될 확률",
            "유상유지보수로 전환될 확률",
            "유상 유지보수 전환 확률",
            "유상유지보수 전환 확률",
            "유상 유지보수 전환 가능성",
            "유상유지보수 전환 가능성",
            "유상 전환 가능성",
            "유상 전환 확률",
            "유상 유지보수로 전환될 가능성",
            "유상 유지보수 전환 후보",
            "유상 전환 후보",
        ),
        "source_types": ("MAINTENANCE", "MAINTENANCE_QUOTE", "POST_SALES", "CUSTOMER_SUPPORT"),
        "suffix": "%",
        "domain": "maintenance",
        "default_route": "mixed",
        "implementability": "near_term",
        "priority": "high",
    },
    "activity_recency_gap_days": {
        "metric_label": "활동 공백일수",
        "aliases": (
            "활동 공백일수",
            "활동 공백",
            "접점 공백",
            "마지막 접점 이후",
            "최근 접점이 오래된",
            "방치된 사업기회",
            "방치된 고객사",
        ),
        "source_types": (S.SALES_ACTIVITY, S.POST_SALES, S.PROJECT_OPPORTUNITY),
        "suffix": "일",
        "domain": "activity",
        "default_route": "fast_structured",
        "implementability": "now",
        "priority": "high",
    },
    "pipeline_data_completeness_index": {
        "metric_label": "발굴 정보 완성도",
        "aliases": (
            "발굴 정보 완성도",
            "정보 완성도",
            "데이터 완성도",
            "발굴 완성도",
            "누락 많은 발굴",
            "정보가 비어있는 발굴",
        ),
        "source_types": (S.PROJECT_OPPORTUNITY, S.ATTACHMENT),
        "suffix": "%",
        "domain": "discovery",
        "default_route": "mixed",
        "implementability": "now",
        "priority": "high",
    },
    "proposal_lift_probability": {
        "metric_label": "제안 전환 가능성",
        "aliases": (
            "제안 전환 가능성",
            "제안 전환 확률",
            "제안될 확률",
            "제안으로 올라갈 확률",
            "제안으로 갈 가능성",
            "제안 가능성",
        ),
        "source_types": (S.PROJECT_OPPORTUNITY, S.SALES_ACTIVITY, S.RFP, S.RFP_ANALYSIS, S.PRB),
        "suffix": "%",
        "domain": "bid",
        "default_route": "mixed",
        "implementability": "near_term",
        "priority": "high",
    },
    "risk_exposure_index": {
        "metric_label": "리스크 노출도",
        "aliases": ("리스크", "위험도", "리스크 노출도", "위험 노출도", "리스크가 높은", "리스크 큰", "가장 위험한"),
        "source_types": (S.PRB, S.PRB_RESULT, S.RFP, S.RFP_ANALYSIS, S.BID_RESULT, S.LOST),
        "suffix": "점",
        "domain": "bid",
        "default_route": "fast_structured",
        "implementability": "now",
        "priority": "high",
    },
}


@lru_cache(maxsize=1)
def load_metric_registry() -> dict[str, MetricSpec]:
    catalog_metrics: dict[str, dict[str, Any]] = {}
    if CATALOG_PATH.exists():
        try:
            payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
            for entry in payload.get("metrics", []):
                key = str(entry.get("metric_key") or "").strip()
                if key:
                    catalog_metrics[key] = entry
        except Exception:
            catalog_metrics = {}

    specs: dict[str, MetricSpec] = {}
    for metric_key, manual in MANUAL_SPECS.items():
        catalog_entry = catalog_metrics.get(metric_key, {})
        specs[metric_key] = MetricSpec(
            metric_key=metric_key,
            metric_label=str(manual.get("metric_label") or catalog_entry.get("metric_name_ko") or metric_key),
            aliases=tuple(sorted({alias.lower() for alias in manual.get("aliases", ())}, key=len, reverse=True)),
            source_types=tuple(manual.get("source_types", ()) or tuple(catalog_entry.get("preferred_sources", ()))),
            suffix=str(manual.get("suffix") or ""),
            default_sort_direction=str(manual.get("default_sort_direction") or "desc"),
            domain=str(manual.get("domain") or catalog_entry.get("domain") or "") or None,
            default_route=str(manual.get("default_route") or catalog_entry.get("default_route") or "") or None,
            implementability=str(manual.get("implementability") or catalog_entry.get("implementability") or "") or None,
            priority=str(manual.get("priority") or catalog_entry.get("priority") or "") or None,
            catalog_description=str(catalog_entry.get("description") or "") or None,
        )
    return specs


def get_metric_spec(metric_key: str | None) -> MetricSpec | None:
    if not metric_key:
        return None
    return load_metric_registry().get(metric_key)


def resolve_metric_spec(query: str) -> MetricSpec | None:
    normalized = " ".join(query.lower().split())
    specs = list(load_metric_registry().values())
    for spec in sorted(specs, key=lambda item: max((len(alias) for alias in item.aliases), default=0), reverse=True):
        if any(alias in normalized for alias in spec.aliases):
            return spec
    return None
