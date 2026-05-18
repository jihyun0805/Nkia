"""LangGraph 스타일 agentic tool-use loop.

LLM 이 tool 호출 여부를 결정하고, 결과를 받아 최종 답변을 생성한다.
최대 3회 tool 호출 후 final 답변을 반환하거나 None 을 반환해 caller 가 fallback.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.core.config import settings
from app.embeddings.model import EmbeddingModel
from app.llm.gms_client import GmsChatClient, GmsChatConfig, strip_json_code_fence
from app.models.user_context import UserContext
from app.schemas.answer import AnswerEvidence, AnswerResponse, ConversationMessage
from app.tools.domain_registry import get_domain
from app.tools.executor import execute_tool
from app.tools.specs import all_tool_specs_for_llm

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 진입 조건 키워드
# ---------------------------------------------------------------------------

_TRIGGER_KEYWORDS: tuple[str, ...] = (
    "평균", "합계", "총", "카운트", "몇 건", "몇건",
    "top", "상위", "가장 큰", "가장 작은", "가장 많", "가장 적",
    "최근", "최다", "최소", "건수", "합산", "집계", "통계",
    "얼마", "평균값", "총액", "총합",
)

# 단일 엔티티 코드 패턴 (예: AUTO-OPP-2026-119, CNT-2025-008)
_ENTITY_CODE_RE = re.compile(r"[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){2,}")


def should_try_tool_loop(query: str) -> bool:
    """tool-use loop 진입 여부 판단: 집계/TOP/최근 키워드 또는 단일 엔티티 코드 포함 시 True."""
    low = query.lower()
    if any(kw in low for kw in _TRIGGER_KEYWORDS):
        return True
    if _ENTITY_CODE_RE.search(query.upper()):
        return True
    return False


# ---------------------------------------------------------------------------
# System prompt 빌더
# ---------------------------------------------------------------------------

def _build_tool_loop_system_prompt() -> str:
    tool_specs_json = json.dumps(all_tool_specs_for_llm(), ensure_ascii=False, indent=2)
    return f"""너는 Orbis 영업관리 시스템의 도구 사용 agent 다.
사용 가능한 tool 4개 (각 spec 은 JSON):
<tools>
{tool_specs_json}
</tools>

지침:
- 사용자 질문 처리에 tool 호출이 필요하면 정확히 단일 JSON 객체를 출력한다:
  {{"action": "tool_call", "name": "<tool>", "args": {{...}}}}
- 모든 정보가 모였으면 자연어 답변과 함께 단일 JSON 객체를 출력한다:
  {{"action": "final", "answer": "<자연어 답변>"}}
- 최대 2번까지 tool 호출 가능하나, **첫 tool 결과로 답변 가능하면 즉시 final 로 끝낸다** (latency 절감).
- 같은 의미의 tool 을 반복 호출하지 않는다. 결과가 ok=False 라도 한 번 더 시도하지 말고 final 로 사용자에게 알린다.
- 답변은 한국어로 작성하고, 결론을 먼저 말한다.
- 수치는 천단위 콤마를 사용한다. 예: 1,234,567원
- 출처는 도구 결과의 summary 를 인용한다.
- JSON 외의 설명 문장을 섞지 않는다. 오직 JSON 객체 하나만 출력한다.
- tool 실행 결과에 ok=False 가 있으면 실패 사실을 LLM 판단에 반영해 다음 행동을 결정한다."""


# ---------------------------------------------------------------------------
# JSON 파싱
# ---------------------------------------------------------------------------

def _parse_llm_json(content: str) -> dict[str, Any] | None:
    """LLM 응답에서 JSON 파싱. ```json``` fence 또는 plain JSON 처리."""
    try:
        cleaned = strip_json_code_fence(content)
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        pass

    # JSON 객체 블록만 추출 시도
    match = re.search(r"\{.*\}", content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except (json.JSONDecodeError, ValueError):
            pass

    return None


# ---------------------------------------------------------------------------
# Tool 결과 → evidence 변환
# ---------------------------------------------------------------------------

def _tool_results_to_evidences(
    tool_results: list[dict[str, Any]],
) -> list[AnswerEvidence]:
    """tool 실행 결과를 AnswerEvidence 목록으로 변환 (최대 5개)."""
    evidences: list[AnswerEvidence] = []
    for result in tool_results[:5]:
        name = result.get("name", "unknown_tool")
        tool_out = result.get("result", {})
        summary = tool_out.get("summary", "")
        rows = tool_out.get("rows") or []

        # rows 를 content 로 직렬화 (최대 3건)
        try:
            content_rows = json.dumps(rows[:3], ensure_ascii=False, default=str)
        except Exception:
            content_rows = str(rows[:3])

        content = f"summary: {summary}\nrows(최대3): {content_rows}"

        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType=name.upper(),
                sourceId=name,
                title=summary[:80] if summary else name,
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["tool_use"],
                content=content,
                metadata={"tool_name": name, "ok": str(tool_out.get("ok", False))},
            )
        )
    return evidences


# ---------------------------------------------------------------------------
# Tool result → message 내용 빌더
# ---------------------------------------------------------------------------

def _build_tool_result_message(name: str, result: dict[str, Any]) -> str:
    ok = result.get("ok", False)
    summary = result.get("summary", "")
    rows = result.get("rows") or []
    error = result.get("error")

    # rows truncate: 최대 10건만 prompt 에 전달
    truncated_rows = rows[:10]
    try:
        rows_json = json.dumps(truncated_rows, ensure_ascii=False, default=str)
    except Exception:
        rows_json = str(truncated_rows)

    lines = [
        f"[tool {name} 결과]",
        f"ok={ok}",
        f"summary={summary}",
    ]
    if error:
        lines.append(f"error={error}")
    lines.append(f"rows={rows_json}")
    if len(rows) > 10:
        lines.append(f"(전체 {len(rows)}건 중 10건만 표시)")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Fast-path: rule-based dispatch (LLM 우회)
# ---------------------------------------------------------------------------

_DOMAIN_KEYWORDS: dict[str, str] = {
    "유지보수 견적": "maintenance_quotation",
    "유지보수": "maintenance",
    "견적": "quotation",
    "수주보고": "order_report",
    "수주": "order_report",
    "계약": "contract",
    "청구": "billing",
    "수금": "billing",
    "미수금": "billing",
    "사업기회": "project_opportunity",
    "사업비": "project_opportunity",
    "예산": "project_opportunity",
    "영업활동": "sales_activity",
    "활동": "sales_activity",
    "rfp": "rfp_analyze_result",
    "prb 결과": "prb_result",
    "prb": "prb",
    "제안서": "proposal",
    "입찰": "bid_result",
    "라이선스": "license",
    "고객지원": "customer_support",
}

def _default_metric_for(domain: str) -> str | None:
    """fast-path 에서 사용할 default metric 컬럼 (op=avg/sum/max/min)."""
    spec = get_domain(domain)
    return spec.default_metric if spec else None


_AGG_KEYWORDS: dict[str, str] = {
    "평균": "avg", "평균값": "avg",
    "합계": "sum", "총액": "sum", "총합": "sum", "합산": "sum",
    "최대": "max", "가장 큰": "max", "가장 많은": "max", "최다": "max", "가장 높은": "max",
    "최소": "min", "가장 작은": "min", "가장 적은": "min", "가장 낮은": "min",
    "카운트": "count", "건수": "count", "몇 건": "count", "몇건": "count", "총 몇": "count",
}

_TOPN_RE = re.compile(r"(?:top|상위)\s*(\d{1,2})|(\d{1,2})\s*건", re.IGNORECASE)


def _detect_domain(query: str) -> str | None:
    low = query.lower()
    for kw, dom in _DOMAIN_KEYWORDS.items():
        if kw in low:
            return dom
    return None


def _detect_agg_op(query: str) -> str | None:
    low = query.lower()
    for kw, op in _AGG_KEYWORDS.items():
        if kw in low:
            return op
    return None


# 도메인 자연어 라벨
_DOMAIN_LABEL: dict[str, str] = {
    "quotation": "견적", "maintenance_quotation": "유지보수 견적",
    "order_report": "수주보고서", "contract": "계약", "billing": "청구",
    "project_opportunity": "사업기회", "sales_activity": "영업활동",
    "rfp_analyze_result": "RFP 분석", "prb": "PRB", "prb_result": "PRB 결과",
    "proposal": "제안서", "bid_result": "입찰결과", "license": "라이선스",
    "customer_support": "고객지원", "maintenance": "유지보수",
}

_OP_LABEL: dict[str, str] = {
    "avg": "평균", "sum": "합계", "max": "최댓값", "min": "최솟값", "count": "건수",
}

# lookup_entity 답변에서 노출할 의미있는 컬럼 (도메인 무관 우선순위 순)
_USER_FRIENDLY_FIELDS: tuple[tuple[str, str], ...] = (
    ("opportunity_code", "사업기회 코드"), ("opportunity_name", "사업명"),
    ("customer_name", "고객사"), ("stage", "단계"), ("current_status", "상태"),
    ("expected_budget", "예상 사업비"), ("expected_bid_date", "예상 입찰일"),
    ("project_type", "사업 유형"), ("competition_status", "경쟁 상황"),
    ("quotation_code", "견적 코드"), ("quotation_date", "견적일자"),
    ("total_price", "공급가 합계"), ("consumer_total_price", "소비자가 합계"),
    ("payment_condition", "지급 조건"),
    ("total_amount", "총액"), ("contract_amount", "계약 금액"),
    ("bill_amount", "청구 금액"), ("bid_amount", "입찰 금액"),
    ("status", "상태"), ("ref_no", "참조번호"),
    ("contract_code", "계약 코드"), ("contract_start_date", "계약 시작일"),
    ("contract_end_date", "계약 종료일"),
    ("name", "이름"), ("position", "직책"),
)


def _format_value(key: str, val: Any) -> str:
    from decimal import Decimal
    if val is None:
        return "-"
    # 금액성 컬럼은 정수 + 천단위 콤마 + '원' (Decimal 포함)
    if isinstance(val, (int, float, Decimal)) and any(s in key for s in ("amount", "price", "budget")):
        try:
            return f"{int(val):,}원"
        except (TypeError, ValueError):
            return str(val)
    return str(val)


def _format_tool_result_as_answer(name: str, args: dict, result: dict) -> str:
    """fast-path 결과를 사용자 답변 텍스트로 포맷 (LLM 안 거침)."""
    if not result.get("ok"):
        return f"결론: 요청을 처리하지 못했습니다. {result.get('summary') or result.get('error') or ''}"
    rows = result.get("rows") or []

    if name == "aggregate_metric":
        domain = args.get("domain", "")
        op = args.get("op", "")
        dlabel = _DOMAIN_LABEL.get(domain, domain)
        oplabel = _OP_LABEL.get(op, op)
        # metric value 추출
        val = result.get("metric_value")
        count_row = rows[0] if rows else {}
        n = count_row.get("_count_n") or count_row.get("count")
        unit = "원" if op != "count" else "건"
        if val is None and op == "count":
            val = n or 0
        try:
            val_str = f"{int(val):,}{unit}" if val is not None else "—"
        except (TypeError, ValueError):
            val_str = f"{val}{unit}"
        n_str = f" (대상 {n}건)" if (n and op != "count") else ""
        # count 답변은 더 자연스럽게
        if op == "count":
            return f"결론: {dlabel}는 총 {val_str}입니다."
        return f"결론: {dlabel} {oplabel}은 {val_str}입니다{n_str}."

    if name == "lookup_entity":
        if not rows:
            return f"결론: 해당 항목을 찾을 수 없습니다. (코드: {args.get('code')})"
        row = rows[0]
        domain = args.get("domain", "")
        dlabel = _DOMAIN_LABEL.get(domain, domain)
        # 헤드라인: name 또는 code
        head_name = row.get("opportunity_name") or row.get("name") or row.get("ref_no") or row.get("id")
        head_code = row.get("opportunity_code") or row.get("quotation_code") or row.get("contract_code") or row.get("ref_no") or args.get("code")
        lines = [f"결론: [{head_code}] {head_name} ({dlabel})", ""]
        for key, label in _USER_FRIENDLY_FIELDS:
            if key in row and row[key] is not None and key not in ("opportunity_name", "opportunity_code"):
                lines.append(f"- {label}: {_format_value(key, row[key])}")
            if len(lines) >= 11:
                break
        return "\n".join(lines)

    if name == "list_entities":
        if not rows:
            return "결론: 조건에 맞는 결과가 없습니다."
        domain = args.get("domain", "")
        dlabel = _DOMAIN_LABEL.get(domain, domain)
        top_n = len(rows)
        lines = [f"결론: {dlabel} 상위 {top_n}건은 다음과 같습니다.", ""]
        for i, r in enumerate(rows, 1):
            code_keys = ("opportunity_code","quotation_code","contract_code","bid_result_code","won_report_code","rfp_analysis_code","prb_code","prb_result_code","license_code","ref_no","id")
            code = next((str(r.get(k)) for k in code_keys if r.get(k) is not None), "-")
            name_keys = ("opportunity_name","customer_name","product_name","title","project_name","name")
            name_v = next((str(r.get(k)) for k in name_keys if r.get(k) is not None), "")
            metric_keys = ("expected_budget","total_price","total_amount","contract_amount","bill_amount","bid_amount","monthly_supply_price")
            metric_v = next((r.get(k) for k in metric_keys if r.get(k) is not None), None)
            metric_str = ""
            if metric_v is not None:
                try:
                    metric_str = f" — {int(metric_v):,}원"
                except (TypeError, ValueError):
                    pass
            lines.append(f"{i}. [{code}] {name_v}{metric_str}")
        return "\n".join(lines)

    return f"결론: {result.get('summary', '')}"


def _try_fast_path(
    *,
    query: str,
    user_context: UserContext | None,
    embedder: EmbeddingModel | None,
) -> AnswerResponse | None:
    """LLM 거치지 않고 명백한 패턴 → tool 직접 호출."""
    # 1) 단일 entity code → lookup_entity
    code_match = _ENTITY_CODE_RE.search(query.upper())
    if code_match:
        code = code_match.group(0)
        # 코드 prefix 로 도메인 추정 (AUTO-OPP / CNT / Q / NKIA-MA 등)
        # 실패 시 project_opportunity 기본
        dom = "project_opportunity"
        upper = code.upper()
        if upper.startswith("CNT"):
            dom = "contract"
        elif upper.startswith("QT") or upper.startswith("Q-"):
            dom = "quotation"
        elif upper.startswith("NKIA-MA"):
            dom = "maintenance_quotation"
        result = execute_tool("lookup_entity", {"domain": dom, "code": code}, user_context)
        if result.get("ok") and result.get("rows"):
            return _build_fast_response(query, "lookup_entity", {"domain": dom, "code": code}, result, embedder)

    dom = _detect_domain(query)
    op = _detect_agg_op(query)
    topn_match = _TOPN_RE.search(query)

    # 2) TOP N 우선 (TOPN 키워드가 있으면 list. "가장 큰 TOP3" 같이 agg op 와 충돌 시 list 가 자연스러움)
    if topn_match and dom:
        n_str = topn_match.group(1) or topn_match.group(2)
        try:
            top_n = max(1, min(int(n_str), 20))
        except (TypeError, ValueError):
            top_n = 5
        # 정렬 방향: "작은/적은/낮은" 등 ASC 키워드 우선
        sort_dir = "asc" if op == "min" else "desc"
        sort_by = _default_metric_for(dom) or "id"
        args = {"domain": dom, "sort_by": sort_by, "sort_dir": sort_dir, "top_n": top_n, "filters": {}}
        result = execute_tool("list_entities", args, user_context)
        if result.get("ok"):
            return _build_fast_response(query, "list_entities", args, result, embedder)

    # 3) 집계 (TOPN 없을 때만 — 단일 max/min/avg/sum/count)
    if op and dom:
        metric = _default_metric_for(dom) if op != "count" else None
        args = {"domain": dom, "op": op, "filters": {}}
        if metric:
            args["metric"] = metric
        result = execute_tool("aggregate_metric", args, user_context)
        if result.get("ok"):
            return _build_fast_response(query, "aggregate_metric", args, result, embedder)

    return None


def _build_fast_response(
    query: str,
    name: str,
    args: dict,
    result: dict,
    embedder: EmbeddingModel | None,
) -> AnswerResponse:
    answer = _format_tool_result_as_answer(name, args, result)
    evidences = _tool_results_to_evidences([{"name": name, "result": result}])
    model_name = embedder.config.model_name if embedder else "fast-path"
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=model_name,
        chatModel="tool-fast-path",
        route="tool_use",
        evidences=evidences,
        excludedSourceTypes=[],
    )


# ---------------------------------------------------------------------------
# 메인 루프
# ---------------------------------------------------------------------------

def run_tool_loop(
    *,
    query: str,
    user_context: UserContext | None,
    history: list[ConversationMessage] | None = None,
    max_iterations: int = 2,
    embedder: EmbeddingModel | None = None,
) -> AnswerResponse | None:
    """LLM agentic loop.

    1) Fast-path: 명백한 패턴 (TOP N / X 평균/합계/카운트 / AUTO-OPP 단건) 은
       LLM 거치지 않고 직접 tool 호출 + 정형 답변 (1-2초 안 종료).
    2) Fast-path 미매치 → LLM agentic loop:
       - system prompt 에 tool list 주입
       - LLM → tool_call → execute → LLM → final
       - max_iterations=2 (불필요한 추가 step 차단)
    조건 안 맞으면 None 반환 (caller 가 fallback).
    """
    # === Fast-path (rule-based dispatch) ===
    fast_response = _try_fast_path(query=query, user_context=user_context, embedder=embedder)
    if fast_response is not None:
        return fast_response

    if not settings.gms_key:
        logger.info("tool_loop: gms_key 없음, skip")
        return None

    client = GmsChatClient(
        GmsChatConfig(
            api_key=settings.gms_key,
            url=settings.gms_chat_completions_url,
            model=settings.gms_chat_model,
            timeout_seconds=settings.gms_timeout_seconds,
        )
    )

    system_prompt = _build_tool_loop_system_prompt()

    # 초기 messages 구성
    messages: list[dict[str, str]] = [
        {"role": "developer", "content": system_prompt},
        {"role": "user", "content": query},
    ]

    tool_results: list[dict[str, Any]] = []
    final_answer: str | None = None

    for iteration in range(1, max_iterations + 1):
        logger.info("tool_loop iteration=%d query=%r", iteration, query[:80])

        # LLM 호출
        try:
            payload: dict[str, Any] = {
                "model": client.config.model,
                "reasoning_effort": "low",
                "max_completion_tokens": 2000,
                "response_format": {"type": "json_object"},
                "messages": messages,
            }
            data = client._request_chat_completion(payload=payload)  # noqa: SLF001
            content = client._extract_message_content(data)  # noqa: SLF001
        except RuntimeError as exc:
            logger.warning("tool_loop: LLM 호출 실패 iteration=%d: %s", iteration, exc)
            return None

        logger.info("tool_loop iteration=%d LLM 응답: %s", iteration, content[:200])

        # JSON 파싱 (1회 재시도)
        parsed = _parse_llm_json(content)
        if parsed is None:
            logger.warning("tool_loop: JSON 파싱 실패, 재시도 메시지 추가")
            messages.append({
                "role": "assistant",
                "content": content,
            })
            messages.append({
                "role": "user",
                "content": "응답이 JSON 형식이 아닙니다. {\"action\": ...} 형태의 JSON 객체 하나만 다시 출력하세요.",
            })
            # 재시도 LLM 호출
            try:
                data = client._request_chat_completion(payload={**payload, "messages": messages})  # noqa: SLF001
                content = client._extract_message_content(data)  # noqa: SLF001
            except RuntimeError as exc:
                logger.warning("tool_loop: 재시도 LLM 호출 실패: %s", exc)
                return None
            parsed = _parse_llm_json(content)
            if parsed is None:
                logger.warning("tool_loop: 재시도 후에도 JSON 파싱 실패")
                return AnswerResponse(
                    query=query,
                    answer="도구 응답 파싱 실패로 답변을 생성하지 못했습니다.",
                    embeddingModel=embedder.config.model_name if embedder else "tool-loop",
                    chatModel="tool-use-loop",
                    route="tool_use",
                    evidences=[],
                    excludedSourceTypes=[],
                )

        action = parsed.get("action")

        # ── final 응답 ──────────────────────────────────────────────────────
        if action == "final":
            final_answer = str(parsed.get("answer") or "").strip()
            if not final_answer:
                logger.warning("tool_loop: action=final 이지만 answer 없음")
                return None
            logger.info("tool_loop: final answer 수신 iteration=%d", iteration)
            break

        # ── tool_call ────────────────────────────────────────────────────────
        if action == "tool_call":
            tool_name = str(parsed.get("name") or "").strip()
            tool_args = parsed.get("args") or {}

            if not tool_name:
                logger.warning("tool_loop: tool_call 에 name 없음")
                return None

            logger.info("tool_loop: tool 호출 name=%r args=%r", tool_name, tool_args)

            # tool 실행
            tool_result = execute_tool(
                name=tool_name,
                args=tool_args if isinstance(tool_args, dict) else {},
                user_context=user_context,
            )

            logger.info(
                "tool_loop: tool 결과 name=%r ok=%s summary=%r",
                tool_name,
                tool_result.get("ok"),
                tool_result.get("summary", "")[:100],
            )

            # 결과 기록
            tool_results.append({"name": tool_name, "args": tool_args, "result": tool_result})

            # messages 에 assistant + tool result 추가
            messages.append({"role": "assistant", "content": content})
            messages.append({
                "role": "system",
                "content": _build_tool_result_message(tool_name, tool_result),
            })
            continue

        # ── 알 수 없는 action ────────────────────────────────────────────────
        logger.warning("tool_loop: 알 수 없는 action=%r parsed=%r", action, parsed)
        return None

    # max_iterations 도달 후에도 final 없으면 마지막 LLM 응답에서 final 시도
    if final_answer is None:
        logger.warning("tool_loop: max_iterations=%d 도달, final 없음", max_iterations)
        return None

    # AnswerResponse 작성
    evidences = _tool_results_to_evidences(tool_results)
    return AnswerResponse(
        query=query,
        answer=final_answer,
        embeddingModel=embedder.config.model_name if embedder else "tool-loop",
        chatModel="tool-use-loop",
        route="tool_use",
        answerStatus="good_answer",
        confidenceBand="high",
        confidenceReasons=["tool_use_agentic"],
        evidences=evidences,
        excludedSourceTypes=[],
    )
