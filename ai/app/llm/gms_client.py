import json
import re
from dataclasses import dataclass
from time import sleep

import requests
from requests.exceptions import (
    ChunkedEncodingError,
    ConnectionError as RequestsConnectionError,
    ReadTimeout,
    Timeout,
)


@dataclass(frozen=True)
class GmsChatConfig:
    api_key: str
    url: str
    model: str
    timeout_seconds: int = 60


class GmsChatClient:
    RETRYABLE_HTTP_CODES = {408, 425, 429, 500, 502, 503, 504}

    def __init__(self, config: GmsChatConfig):
        self.config = config
        self._session = requests.Session()

    def create_query_plan(self, *, query: str) -> dict:
        payload = {
            "model": self.config.model,
            "reasoning_effort": "low",
            "max_completion_tokens": 2000,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "developer",
                    "content": (
                        "너는 엔키아 영업관리시스템 챗봇의 Query Planner다. "
                        "답변을 작성하지 말고 사용자 질문을 실행 가능한 JSON 계획으로만 변환한다. "
                        "허용된 값 밖의 필드명, 상태값, 작업명은 절대 만들지 않는다. "
                        "질문이 정형 조회로 처리하기 어렵다면 task를 semantic_search로 둔다. "
                        "JSON 외의 설명 문장은 출력하지 않는다."
                    ),
                },
                {
                    "role": "user",
                    "content": build_query_plan_prompt(query=query),
                },
            ],
        }
        data = self._request_chat_completion(payload=payload)
        content = self._extract_message_content(data)
        try:
            return json.loads(strip_json_code_fence(content))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"GMS query planner returned invalid JSON content: {content[:500]}") from exc

    def create_chat_plan(self, *, query: str, normalization_summary: str) -> dict:
        payload = {
            "model": self.config.model,
            "reasoning_effort": "low",
            "max_completion_tokens": 2000,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "developer",
                    "content": (
                        "너는 엔키아 영업관리시스템 챗봇의 질의 오케스트레이터다. "
                        "답변 본문을 작성하지 말고, 사용자 질문을 실행 가능한 JSON 계획으로만 변환한다. "
                        "문서/색인 검색으로 처리 가능한 질문은 semantic_search, timeline_lookup, maintenance_lookup, "
                        "summarize_period 중 하나로 분류하고, 핵심 기준이 빠지면 needs_clarification으로 둔다. "
                        "JSON 외의 문장은 출력하지 않는다."
                    ),
                },
                {
                    "role": "user",
                    "content": build_chat_plan_prompt(query=query, normalization_summary=normalization_summary),
                },
            ],
        }
        data = self._request_chat_completion(payload=payload)
        content = self._extract_message_content(data)
        try:
            return json.loads(strip_json_code_fence(content))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"GMS chat planner returned invalid JSON content: {content[:500]}") from exc

    def create_draft_payload(
        self,
        *,
        query: str,
        document_label: str,
        slot_keys: list[str],
        evidence_context: str,
        conversation_context: str = "",
        reference_context: str | None = None,
    ) -> dict:
        prompt_sections = [
            f"사용자 질문:\n{query}",
            f"문서 종류:\n{document_label}",
        ]
        if conversation_context:
            prompt_sections.append(f"이전 대화:\n{conversation_context}")
        prompt_sections.append(f"근거 문서:\n{evidence_context}")
        if reference_context:
            prompt_sections.append(
                f"[Cross-Reference] 유사 수주 사업기회의 견적서 (슬롯 값 참고용, 사실 확인 후 사용):\n{reference_context}"
            )
        prompt_sections.append(build_draft_payload_prompt(slot_keys=slot_keys))

        payload = {
            "model": self.config.model,
            "reasoning_effort": "low",
            "max_completion_tokens": 3000,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "developer",
                    "content": (
                        "너는 엔키아 영업관리시스템의 문서 초안 작성 보조 AI다. "
                        "근거 문서에서 직접 확인되는 사실만 슬롯에 채우고, "
                        "확인할 수 없는 슬롯은 null 또는 빈 배열로 둔다. "
                        "추측, 외부 지식, 가정은 절대 사용하지 않는다. "
                        "허용된 슬롯 키 외에는 어떤 키도 추가하지 않는다. "
                        "JSON 외의 설명 문장은 출력하지 않는다."
                    ),
                },
                {"role": "user", "content": "\n\n".join(prompt_sections)},
            ],
        }
        data = self._request_chat_completion(payload=payload)
        content = self._extract_message_content(data)
        try:
            return json.loads(strip_json_code_fence(content))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"GMS draft composer returned invalid JSON content: {content[:500]}") from exc

    def create_grounded_answer(
        self,
        *,
        query: str,
        context: str,
        conversation_context: str = "",
        plan_summary: str = "",
    ) -> str:
        prompt_sections = [f"질문:\n{query}"]
        if plan_summary:
            prompt_sections.append(f"질의 계획:\n{plan_summary}")
        if conversation_context:
            prompt_sections.append(f"이전 대화:\n{conversation_context}")
        prompt_sections.append(f"근거 문서:\n{context}")
        prompt_sections.append(build_plain_grounded_answer_prompt())

        payload = {
            "model": self.config.model,
            "reasoning_effort": "low",
            "max_completion_tokens": 4000,
            "messages": [
                {
                    "role": "developer",
                    "content": build_grounded_answer_system_prompt(),
                },
                {
                    "role": "user",
                    "content": "\n\n".join(prompt_sections),
                },
            ],
        }
        data = self._request_chat_completion(payload=payload)
        return self._extract_message_content(data)

    def _request_chat_completion(self, *, payload: dict) -> dict:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.config.api_key}",
        }
        last_error: RuntimeError | None = None

        for attempt in range(1, 4):
            try:
                resp = self._session.post(
                    self.config.url,
                    json=payload,
                    headers=headers,
                    timeout=self.config.timeout_seconds,
                )
            except (ReadTimeout, Timeout) as exc:
                last_error = RuntimeError(f"GMS chat completion request timed out: {exc}")
                break
            except (ChunkedEncodingError, RequestsConnectionError) as exc:
                if attempt < 3:
                    sleep(0.5 * attempt)
                    continue
                last_error = RuntimeError(f"GMS chat completion network error: {exc}")
                break

            if resp.status_code in self.RETRYABLE_HTTP_CODES and attempt < 3:
                sleep(0.35 * attempt)
                continue
            if resp.status_code >= 400:
                last_error = RuntimeError(
                    f"GMS chat completion failed: HTTP {resp.status_code} {resp.text[:300]}"
                )
                break

            response_body = resp.text
            if not response_body.strip():
                if attempt < 3:
                    sleep(0.35 * attempt)
                    continue
                last_error = RuntimeError("GMS chat completion failed: empty response body")
                break

            try:
                return resp.json()
            except json.JSONDecodeError as exc:
                recovered_content = recover_message_content(response_body)
                if recovered_content is not None:
                    return {"choices": [{"message": {"content": recovered_content}}]}
                preview = response_body[:500]
                if attempt < 3:
                    sleep(0.35 * attempt)
                    continue
                last_error = RuntimeError(f"GMS chat completion returned non-JSON response: {preview}")
                break

        if last_error is not None:
            raise last_error
        raise RuntimeError("GMS chat completion failed: unknown error")

    def _extract_message_content(self, data: dict) -> str:
        try:
            return str(data["choices"][0]["message"]["content"]).strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(f"Unexpected GMS chat completion response: {data}") from exc


def build_query_plan_prompt(*, query: str) -> str:
    return f"""
사용자 질문:
{query}

아래 JSON 스키마만 사용해라. 문자열 값에는 선택지를 섞어 쓰지 말고, 가능한 값 중 정확히 하나만 넣어라.

{{
  "task": "rank_and_explain",
  "target": "opportunity",
  "population_status": ["수주"],
  "conditions": ["difficult_to_win"],
  "filters": {{
    "customer_group": [],
    "customer_type": [],
    "business_type": []
  }},
  "rank_by": "competition_strength",
  "sort_direction": "desc",
  "limit": 5,
  "evidence_sources": ["OPPORTUNITY", "PRB", "PRB_RESULT", "BID_RESULT"],
  "missing_fields": [],
  "clarification_message": null,
  "confidence": 0.9
}}

가능한 값:
- task: rank_metric, list_by_status, rank_and_explain, needs_clarification, semantic_search
- target: opportunity
- population_status: 수주, 발굴, 입찰, 경쟁중, 제안
- conditions: difficult_to_win
- filters.customer_group: 공공, 민간 등 고객군 값
- filters.customer_type: 금융, 국방, 교통, 의료, 제조, 공기업, 지자체 등 고객구분 값
- filters.business_type: EMS, ITSM, AIOps, Security, CloudOps, MES, Dashboard, ITO 등 사업구분 값
- rank_by: estimated_profit, estimated_profit_rate, expected_win_rate, estimated_revenue, expected_amount, contract_amount, risk_severity, competition_strength
- sort_direction: asc, desc
- evidence_sources: OPPORTUNITY, SALES_ACTIVITY, POST_SALES, RFP, RFP_ANALYSIS, PRB, PRB_RESULT, BID_RESULT, LOST, WON, ORDER_REPORT, CONTRACT, ATTACHMENT
- missing_fields: rank_by, population_status, filters
- clarification_message: 사용자에게 다시 물어볼 짧은 한국어 문장

판단 규칙:
- "수주가 어려웠던", "어렵게 수주", "수주 난이도"는 conditions에 difficult_to_win을 넣고 population_status는 ["수주"]로 둔다.
- "공공기관", "공공"은 filters.customer_group에 "공공"을 넣는다.
- "민간"은 filters.customer_group에 "민간"을 넣는다.
- "금융권", "금융"은 filters.customer_type에 "금융"을 넣는다.
- "국방", "교통", "의료", "제조"는 filters.customer_type에 각각 같은 값을 넣는다.
- "EMS", "ITSM", "AIOps", "Security", "CloudOps", "MES"는 filters.business_type에 넣는다.
- "리스크가 큰", "위험한", "문제가 큰"은 rank_by를 risk_severity, sort_direction을 desc로 둔다.
- "수주율이 낮은"은 rank_by를 expected_win_rate, sort_direction을 asc로 둔다.
- "경쟁사 우위가 큰", "경쟁이 불리한"은 rank_by를 competition_strength, sort_direction을 desc로 둔다.
- "가장 높은/큰/많은"은 desc, "가장 낮은/작은/적은"은 asc다.
- 사업/영업기회 랭킹 요청인데 비교 기준이 없으면 task를 needs_clarification으로 두고 missing_fields에 rank_by를 넣는다.
- 이 경우 clarification_message에는 가능한 비교 기준 예시를 짧게 적는다.
- 정형 필드로 확정하기 어렵거나 단순 문서 검색이면 task를 semantic_search로 둔다.
- evidence_sources는 필요한 근거 문서 타입만 넣는다.
- JSON 객체 하나만 출력한다.
""".strip()


def build_chat_plan_prompt(*, query: str, normalization_summary: str) -> str:
    return f"""
사용자 질문:
{query}

정규화 힌트:
{normalization_summary or '없음'}

아래 JSON 스키마만 사용해라.

{{
  "task": "semantic_search",
  "target": "general",
  "source_types": ["ATTACHMENT"],
  "filters": {{}},
  "time_label": null,
  "time_from": null,
  "time_to": null,
  "rewritten_query": null,
  "answer_style": "direct_answer",
  "missing_fields": [],
  "clarification_message": null,
  "confidence": 0.8
}}

가능한 값:
- task: semantic_search, timeline_lookup, maintenance_lookup, summarize_period, needs_clarification
- target: general, document, activity, maintenance, contract, project, opportunity, user, customer
- answer_style: direct_answer, timeline, bullet_summary, ranked_list
- source_types:
  PROJECT_OPPORTUNITY, SALES_ACTIVITY, QUOTATION, RFP, RFP_ANALYSIS, PRB, PRB_RESULT,
  BID_RESULT, LOST, WON, ORDER_REPORT, CONTRACT, PROJECT, PROJECT_RESULT_REPORT,
  POST_SALES, MAINTENANCE, MAINTENANCE_QUOTE, CUSTOMER_SUPPORT, COMPANY, CONTACT,
  MODULE, LICENSE, BILLING, ATTACHMENT
- missing_fields: rank_by, period, person, customer, project

판단 규칙:
- '언제', '이력', '타임라인', '누가 뭐 했는지' 성격이면 timeline_lookup을 우선 검토한다.
- '유지보수', '장애', '조치', '지원' 중심이면 maintenance_lookup을 우선 검토한다.
- '상반기 결과 요약', '의미있는 것 정리'는 summarize_period로 둔다.
- '가장 우수한 사업', 'top 3'처럼 비교 기준이 빠진 순위 질문은 needs_clarification으로 둔다.
- 문서/색인 검색으로 처리 가능한 질문은 semantic_search로 둔다.
- time_from, time_to는 정규화 힌트에 기간이 있으면 최대한 반영한다.
- rewritten_query는 검색 성능 향상을 위해 필요한 경우에만 쓴다.
- JSON 객체 하나만 출력한다.
""".strip()


def build_grounded_answer_system_prompt() -> str:
    return (
        "너는 엔키아 영업관리시스템의 사내 AI 어시스턴트다. "
        "반드시 제공된 근거 문서만 사용해서 한국어로 답변한다. "
        "일본어, 중국어, 영어 문장을 섞지 말고 자연스러운 한국어만 사용한다. "
        "근거에 없는 내용은 추측하지 말고 '제공된 근거만으로는 확인하기 어렵습니다'라고 말한다. "
        "답변은 일반 직원도 바로 이해할 수 있게 쉬운 말로 쓴다. "
        "전문 용어, 약어, 코드명은 필요하면 그대로 쓰되 괄호로 짧게 풀어 설명한다. "
        "첫 문단에서 결론을 먼저 말하고, 그 다음에 이유와 근거를 짧게 나눈다. "
        "한 문장은 길게 이어 쓰지 말고 45자 안팎으로 끊는다. "
        "숫자, 금액, 기간이 있으면 값만 나열하지 말고 의미를 한 문장으로 덧붙인다. "
        "질의 계획에 timeline이 있으면 날짜 흐름대로 정리하고, "
        "bullet_summary면 핵심 포인트만 3개 안팎으로 요약한다. "
        # UX 강화: 액션 안내 + 친근체
        "톤은 정중한 존댓말로 일관되게 유지하고, 무미건조한 보고서 문체 대신 사용자 시각으로 자연스럽게 말한다. "
        "답변 마지막에는 '다음에 볼 것:'에서 1개의 구체 후속 조치를 제안한다. "
        "사용자가 수정/등록/작성을 명시한 경우 답변 본문에서 '아래의 [수정/작성] 액션 버튼을 눌러 폼에 자동 채워진 값을 확인하세요'처럼 액션 사용을 안내한다. "
        "데이터가 부족할 때도 무뚝뚝하게 거절하지 말고, 어떤 정보를 더 주면 답할 수 있는지 한 줄로 알려준다."
    )


def build_plain_grounded_answer_prompt() -> str:
    return """
위 근거만 사용해서 답변을 작성해라.

출력 형식:
결론: 질문에 대한 답을 한 문장으로 먼저 말한다.

왜냐하면:
- 근거에서 확인한 이유를 쉬운 말로 쓴다.
- 숫자나 상태가 중요하면 그 의미까지 짧게 설명한다.
- 근거가 여러 개면 가장 중요한 것부터 2~4개만 쓴다.

참고 문서:
- 사용한 근거 제목이나 코드를 1~3개만 적는다.

다음에 볼 것: 사용자가 이어서 확인하면 좋은 항목을 1개만 제안한다.

규칙:
- 위 형식의 섹션 이름을 그대로 사용한다.
- 마크다운 제목(#)과 굵게(**)는 사용하지 않는다.
- 표는 순위나 비교 질문처럼 표가 더 쉬운 경우에만 사용한다.
- 근거가 부족하면 결론에서 부족하다고 말하고, 어떤 정보가 더 필요한지 알려준다.
""".strip()


def build_draft_payload_prompt(*, slot_keys: list[str]) -> str:
    slot_lines = "\n".join(f"- {key}" for key in slot_keys)
    return f"""
당신이 채워야 할 슬롯 키 목록 (다른 키는 절대 사용하지 말 것):
{slot_lines}

규칙:
- 위 슬롯 키만 사용한다. 새로운 키를 추가하지 않는다.
- 근거 문서에서 직접 확인되는 사실만 채운다. 확인 불가능하면 null 또는 빈 배열로 둔다.
- 배열형 슬롯(items, key_requirements 등)은 가능하면 객체 배열로 작성한다.
- 금액/날짜는 근거에 표기된 형태를 그대로 두거나 ISO 8601 형태로 둔다.
- summary 는 사용자에게 보여줄 2~3문장 한국어 요약이다.
- notes 는 사용자에게 안내할 주의사항/누락 항목 메모이다. 없으면 빈 배열로 둔다.

출력 JSON 스키마(객체 하나):
{{
  "summary": "한국어 2~3문장 요약 또는 null",
  "slots": {{ /* 위 슬롯 키만 사용 */ }},
  "notes": ["..."]
}}

JSON 객체 하나만 출력한다.
""".strip()


def strip_json_code_fence(content: str) -> str:
    stripped = content.strip()
    if not stripped.startswith("```"):
        return stripped

    lines = stripped.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def recover_message_content(response_body: str) -> str | None:
    matches = re.findall(r'"content"\s*:\s*("(?:(?:\\.)|[^"\\])*")', response_body, flags=re.DOTALL)
    if not matches:
        return None

    recovered_values: list[str] = []
    for quoted_value in matches:
        try:
            recovered_values.append(json.loads(quoted_value))
        except json.JSONDecodeError:
            continue

    if not recovered_values:
        return None
    return max(recovered_values, key=len).strip()
