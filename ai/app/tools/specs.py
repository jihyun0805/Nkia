# 인수인계 메모: AI 챗봇 공통 코드입니다. 다른 계층에서 재사용하는 설정, 보안, 어댑터, 도구 함수를 담습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from __future__ import annotations
from dataclasses import dataclass
from typing import Any

from app.tools.domain_registry import DOMAIN_NAMES


@dataclass(slots=True)
class ToolSpec:
    name: str
    description: str  # 한국어, 사용 예 1-2개 포함
    json_schema: dict[str, Any]  # OpenAI/Anthropic function-calling 표준 호환

# ---------------------------------------------------------------------------
# Tool specifications
# ---------------------------------------------------------------------------
TOOLS: list[ToolSpec] = [
    ToolSpec(
        name="aggregate_metric",
        description=(
            "지정한 도메인의 숫자 지표를 집계합니다 (sum/avg/min/max/count). "
            "예1: '유지보수 견적 평균 금액' → {domain:'maintenance_quotation', metric:'total_amount', op:'avg'} "
            "예2: '이번 달 계약 건수' → {domain:'contract', metric:'count', op:'count', filters:{time_from:'2026-05-01'}}"
        ),
        json_schema={
            "type": "object",
            "properties": {
                "domain": {
                    "type": "string",
                    "enum": DOMAIN_NAMES,
                    "description": "집계 대상 도메인(테이블)명.",
                },
                "metric": {
                    "type": "string",
                    "description": (
                        "집계할 컬럼명 또는 'count'. "
                        "컬럼 후보: total_price, total_amount, consumer_total_price, "
                        "expected_budget, contract_amount, bill_amount, "
                        "monthly_supply_price, bid_amount."
                    ),
                },
                "op": {
                    "type": "string",
                    "enum": ["sum", "avg", "min", "max", "count"],
                    "description": "집계 연산자.",
                },
                "filters": {
                    "type": "object",
                    "description": (
                        "선택적 필터 조건. "
                        "가능한 키: status, time_from(ISO date), time_to(ISO date), "
                        "customer_name(LIKE), opportunity_code, code."
                    ),
                    "additionalProperties": True,
                },
            },
            "required": ["domain", "metric", "op"],
        },
    ),
    ToolSpec(
        name="list_entities",
        description=(
            "지정한 도메인의 엔티티를 정렬하여 상위 N건을 반환합니다. "
            "예1: '예상 사업비 TOP3 기회' → {domain:'project_opportunity', sort_by:'expected_budget', sort_dir:'desc', top_n:3} "
            "예2: '최근 영업 활동 5건' → {domain:'sales_activity', sort_by:'created_at', sort_dir:'desc', top_n:5}"
        ),
        json_schema={
            "type": "object",
            "properties": {
                "domain": {
                    "type": "string",
                    "enum": DOMAIN_NAMES,
                    "description": "조회 대상 도메인(테이블)명.",
                },
                "sort_by": {
                    "type": "string",
                    "description": (
                        "정렬 기준 컬럼명. "
                        "컬럼 후보: total_price, total_amount, consumer_total_price, "
                        "expected_budget, contract_amount, bill_amount, "
                        "monthly_supply_price, bid_amount, created_at, updated_at."
                    ),
                },
                "sort_dir": {
                    "type": "string",
                    "enum": ["asc", "desc"],
                    "description": "정렬 방향. 'desc' = 내림차순(기본), 'asc' = 오름차순.",
                },
                "top_n": {
                    "type": "integer",
                    "description": "반환할 최대 건수. 기본값 5.",
                    "default": 5,
                    "minimum": 1,
                    "maximum": 100,
                },
                "filters": {
                    "type": "object",
                    "description": (
                        "선택적 필터 조건. "
                        "가능한 키: status, time_from(ISO date), time_to(ISO date), "
                        "customer_name(LIKE), opportunity_code, code."
                    ),
                    "additionalProperties": True,
                },
            },
            "required": ["domain", "sort_by", "sort_dir"],
        },
    ),
    ToolSpec(
        name="lookup_entity",
        description=(
            "코드 또는 ID로 단일 엔티티의 상세 정보를 조회합니다. "
            "예1: 'AUTO-OPP-2026-119 기회 상세' → {domain:'project_opportunity', code:'AUTO-OPP-2026-119'} "
            "예2: '계약 CNT-2025-008 내용 보여줘' → {domain:'contract', code:'CNT-2025-008'}"
        ),
        json_schema={
            "type": "object",
            "properties": {
                "domain": {
                    "type": "string",
                    "enum": DOMAIN_NAMES,
                    "description": "조회 대상 도메인(테이블)명.",
                },
                "code": {
                    "type": "string",
                    "description": "엔티티를 특정하는 코드값 또는 ID (예: 'AUTO-OPP-2026-119', 'CNT-2025-008').",
                },
            },
            "required": ["domain", "code"],
        },
    ),
    ToolSpec(
        name="search_documents",
        description=(
            "자유 텍스트 쿼리로 문서/레코드를 벡터 검색(RAG)합니다. "
            "정형 tool(aggregate_metric, list_entities, lookup_entity)로 처리하기 어려운 자연어 질문에 사용합니다. "
            "예1: '고객사 롯데카드와 관련된 최근 이슈' → {query:'롯데카드 이슈', source_types:['customer_support','prb']} "
            "예2: '클라우드 마이그레이션 관련 RFP 분석 결과' → {query:'클라우드 마이그레이션', source_types:['rfp_analyze_result']}"
        ),
        json_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "벡터 검색에 사용할 자유 텍스트 질의.",
                },
                "source_types": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": DOMAIN_NAMES,
                    },
                    "description": (
                        "검색 범위를 제한할 소스 타입 목록. "
                        "비어 있으면 전체 도메인을 대상으로 검색합니다."
                    ),
                },
            },
            "required": ["query"],
        },
    ),
]

# ---------------------------------------------------------------------------
# Lookup helpers
# ---------------------------------------------------------------------------

def get_tool_by_name(name: str) -> ToolSpec | None:
    """이름으로 ToolSpec 을 반환합니다. 없으면 None."""
    for tool in TOOLS:
        if tool.name == name:
            return tool
    return None


def all_tool_specs_for_llm() -> list[dict[str, Any]]:
    """LLM prompt 에 넣을 [{name, description, parameters}] list 반환."""
    return [
        {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.json_schema,
        }
        for tool in TOOLS
    ]
