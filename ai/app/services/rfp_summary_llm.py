# 인수인계 메모: 챗봇 서비스 계층입니다. 색인, 검색, 근거 선별, 답변 생성, 추천/비교 등 실제 업무 로직이 모여 있습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from __future__ import annotations

import http.client
import json
import re
import time
import urllib.error
import urllib.request


MAX_RFP_TEXT_FOR_LLM = 35_000


def generate_rfp_summary_with_gms(
    *,
    api_key: str,
    url: str,
    model: str,
    timeout_seconds: int,
    filename: str,
    text: str,
) -> str:
    payload = {
        "model": model,
        "max_completion_tokens": 1800,
        "messages": [
            {
                "role": "system",
                "content": build_rfp_summary_system_prompt(),
            },
            {
                "role": "user",
                "content": build_rfp_summary_prompt(filename=filename, text=text[:MAX_RFP_TEXT_FOR_LLM]),
            },
        ],
    }
    if supports_temperature(model):
        payload["temperature"] = 0.2
    if supports_reasoning_effort(model):
        payload["reasoning_effort"] = "low"
    return normalize_rfp_summary_markdown(call_gms_chat_completion(
        api_key=api_key,
        url=url,
        timeout_seconds=timeout_seconds,
        payload=payload,
    ))


def supports_temperature(model: str) -> bool:
    normalized = model.strip().lower()
    return not normalized.startswith("gpt-5")


def supports_reasoning_effort(model: str) -> bool:
    normalized = model.strip().lower()
    return normalized.startswith("gpt-5")


def build_rfp_summary_system_prompt() -> str:
    return """
당신은 IT 구축사업 RFP 문서를 요약하는 전문 어시스턴트입니다.

입력된 RFP 문서를 읽고
사업 개요, 사업 목적, 구축 범위, 핵심 요구사항을
빠르게 파악할 수 있도록 간결하게 요약하세요.

복잡한 분석이나 추론보다
문서에 명시된 핵심 정보를 정확하게 정리하는 것이 목적입니다.

다음 규칙을 반드시 준수하세요.

- 문서에 없는 내용을 추측하지 말 것
- 일반적인 IT 구축사업 표현을 반복하지 말 것
- 핵심 키워드 중심으로 작성할 것
- 중복 내용을 제거할 것
- 중요도 높은 정보를 우선 작성할 것
- 경영진이 빠르게 읽을 수 있는 수준으로 간결하게 작성할 것
""".strip()


def build_rfp_summary_prompt(*, filename: str, text: str) -> str:
    return f"""
RFP 파일명
{filename}

RFP 문서를 요약하세요.

다음 항목 중심으로 작성하세요.

사업 개요
- 사업명
- 발주처
- 사업기간
- 사업예산 또는 계약방식

사업 목적
- 사업 추진 배경
- 핵심 추진 목적

주요 구축 범위
- 구축/개선 대상 시스템
- 주요 수행 업무

핵심 요구사항
- 문서에 명시된 주요 요구사항
- 평가 구조 또는 수행 조건 중 중요한 내용

[작성 규칙]
- 전체 10~15줄 내외
- 섹션 제목은 bullet 없이 일반 텍스트로 작성
- 섹션 내용만 bullet("-") 형식으로 작성
- 섹션 제목 앞에는 "-", 숫자, "#", "*" 같은 기호를 붙이지 말 것
- 섹션 제목과 섹션 내용은 반드시 줄바꿈으로 분리
- 핵심 키워드 중심 작성
- 중복 제거
- 문서 기반 내용만 작성
- Markdown heading("#") 사용 금지
- bullet("-") 외 다른 기호 사용 금지
- 각 bullet은 한 문장으로 간결하게 작성
- 사업명, 발주처, 사업기간, 사업예산, 계약방식은 한 줄에 합치지 말고 각각 별도 bullet로 작성
- 한 bullet 안에 쉼표로 여러 정보 항목을 연결하지 말 것

[출력 형식 예시]
사업 개요
- 사업명: 문서에 명시된 사업명
- 발주처: 문서에 명시된 발주처
- 사업기간: 문서에 명시된 기간
- 사업예산: 문서에 명시된 예산
- 계약방식: 문서에 명시된 계약방식

사업 목적
- 추진 배경: 문서에 명시된 배경
- 핵심 목적: 문서에 명시된 목적

[RFP 문서 원문]
{text}
""".strip()

def call_gms_chat_completion(*, api_key: str, url: str, timeout_seconds: int, payload: dict) -> str:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=True).encode("utf-8"),
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                try:
                    response_bytes = response.read()
                except http.client.IncompleteRead as exc:
                    response_bytes = exc.partial
                response_text = response_bytes.decode("utf-8", errors="replace")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            last_error = RuntimeError(f"GMS request failed: HTTP {exc.code} {detail}")
            if attempt < 3:
                time.sleep(attempt * 2)
                continue
            raise last_error from exc
        except urllib.error.URLError as exc:
            last_error = RuntimeError(f"GMS request failed: {exc}")
            if attempt < 3:
                time.sleep(attempt * 2)
                continue
            raise last_error from exc

        try:
            response_payload = json.loads(response_text)
            return str(response_payload["choices"][0]["message"]["content"]).strip()
        except json.JSONDecodeError as exc:
            recovered_content = recover_content_from_partial_response(response_text)
            if recovered_content is not None:
                return recovered_content.strip()
            preview = response_text[:500].replace("\n", " ")
            last_error = RuntimeError(f"GMS returned a non-JSON response: {preview}")
            if attempt < 3:
                time.sleep(attempt * 2)
                continue
            raise last_error from exc
        except (KeyError, IndexError, TypeError) as exc:
            last_error = RuntimeError(f"Unexpected GMS response shape: {response_text[:500]}")
            if attempt < 3:
                time.sleep(attempt * 2)
                continue
            raise last_error from exc

    raise RuntimeError("GMS request failed after retries") from last_error


SUMMARY_SECTION_TITLES = {
    "사업기회 요약",
    "사업 개요",
    "사업 목적",
    "주요 구축 범위",
    "핵심 요구사항",
    "주요 리스크",
    "제안 전략 포인트",
    "추가 유의사항",
}


def normalize_rfp_summary_markdown(summary: str) -> str:
    normalized_lines: list[str] = []
    current_section: str | None = None

    for raw_line in summary.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        line = re.sub(r"^#{1,6}\s+", "", line).strip()
        title = line.rstrip(":：").strip()
        if title in SUMMARY_SECTION_TITLES:
            if normalized_lines and normalized_lines[-1] != "":
                normalized_lines.append("")
            normalized_lines.append(title)
            current_section = title
            continue

        bullet_match = re.match(r"^[-*]\s+(.+)$", line)
        content = bullet_match.group(1).strip() if bullet_match else line
        for item in split_compound_summary_item(content):
            if current_section:
                normalized_lines.append(f"- {item}")
            else:
                normalized_lines.append(item)

    return "\n".join(normalized_lines).strip()


def split_compound_summary_item(content: str) -> list[str]:
    parts = re.split(r",\s+(?=(?:발주처|사업기간|사업예산|계약방식):)", content)
    return [part.strip() for part in parts if part.strip()]


def recover_content_from_partial_response(response_text: str) -> str | None:
    marker = '"content"'
    marker_index = response_text.find(marker)
    if marker_index < 0:
        return None

    colon_index = response_text.find(":", marker_index + len(marker))
    if colon_index < 0:
        return None

    value_start = response_text.find('"', colon_index + 1)
    if value_start < 0:
        return None

    try:
        content, _ = json.JSONDecoder().raw_decode(response_text[value_start:])
    except json.JSONDecodeError:
        return None
    return str(content)
