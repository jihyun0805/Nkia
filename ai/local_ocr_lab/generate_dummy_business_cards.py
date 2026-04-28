# GMS 활용하여 더미데이터 생성하는 코드
from __future__ import annotations

import argparse
import http.client
import json
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from ocr_lab_common import AI_ROOT, write_json


GMS_CHAT_COMPLETIONS_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1/chat/completions"
FIELD_NAMES = (
    "company_name",
    "contact_name",
    "position",
    "address",
    "email",
    "mobile_phone",
    "office_phone",
    "fax_phone",
    "responsibility",
    "department_name",
    "raw_text",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic business-card OCR training data through GMS.")
    parser.add_argument("--count", type=int, default=20, help="Number of synthetic cards to generate.")
    parser.add_argument("--batch-size", type=int, default=5, help="Cards requested per GMS call.")
    parser.add_argument("--start-index", type=int, default=None, help="First synthetic card index. Defaults to next free index.")
    parser.add_argument("--model", default="gpt-4o-mini", help="GMS model name.")
    parser.add_argument("--env-file", type=Path, default=AI_ROOT / ".env.fastapi.dev")
    parser.add_argument("--labels-dir", type=Path, default=AI_ROOT / "local_ocr_lab" / "labels")
    parser.add_argument("--outputs-dir", type=Path, default=AI_ROOT / "local_ocr_lab" / "paddleoutputs")
    parser.add_argument("--dry-run", action="store_true", help="Print planned stems without calling GMS.")
    return parser.parse_args()


def load_env_value(path: Path, key: str) -> str:
    if not path.exists():
        raise FileNotFoundError(f"env file not found: {path}")

    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() == key:
            return value.strip().strip('"').strip("'")

    raise KeyError(f"{key} not found in {path}")


def build_prompt(count: int, start_index: int) -> str:
    return f"""
한국 명함 OCR 후처리 모델 학습용 합성 데이터를 {count}개 생성해줘.

반드시 유효한 JSON 배열만 출력해. 마크다운 코드블록, 설명 문장, 주석은 쓰지 마.

각 배열 원소는 반드시 아래 구조를 따른다.

{{
  "card_id": "card_synth_XXXX",
  "label": {{
    "company_name": "...",
    "contact_name": "...",
    "position": "...",
    "address": "...",
    "email": "...",
    "mobile_phone": "...",
    "office_phone": "...",
    "fax_phone": "...",
    "responsibility": "...",
    "department_name": "...",
    "raw_text": null
  }},
  "ocr_lines": [
    "PaddleOCR이 읽은 것처럼 보이는 줄 단위 텍스트"
  ]
}}

생성 규칙:
- card_id는 "card_synth_{start_index:04d}"부터 순서대로 만든다.
- label은 원본 명함 기준 정답이다.
- ocr_lines는 PaddleOCR 결과처럼 보이는 줄 단위 raw text만 담는다.
- ocr_lines 안에는 company_name, contact_name 같은 필드명을 쓰지 않는다.
- ocr_lines는 구조화 결과가 아니라 OCR 인식 결과다.
- ocr_lines만 보고 label의 정답을 사람이 대략 추론할 수 있어야 한다.
- label.raw_text는 항상 null이다.
- null 가능한 필드는 실제 명함처럼 일부 비워둔다. 특히 fax_phone, responsibility, department_name은 자주 null이어도 된다.
- 전화번호 label은 "010-1234-5678", "02-123-4567"처럼 정규화한다.
- 이메일 label은 소문자 정상 이메일로 쓴다.
- 한국어 문자열은 반드시 정상 유니코드 한글로 출력한다. 깨진 문자(예: �, 媛, ?쒖슱, 留)를 절대 쓰지 않는다.
- 명함 유형은 다양하게 섞는다: 스타트업, 공공기관, 병원, 학원, 제조업, 영업 대리점, 컨설턴트, IT 회사, 연구소.
- ocr_lines에는 약한 OCR 노이즈를 일부 섞는다:
  - 하이픈이 빠진 전화번호
  - 전화번호가 여러 줄로 나뉨
  - E-mail, Mail, TEL, FAX, M 같은 라벨 포함
  - @가 a 또는 at처럼 보임
  - co.kr의 점이 빠짐
  - 대소문자 혼합
  - 회사명/부서/직책/이름 순서가 명함마다 다름
- 단, ocr_lines에 지나치게 심한 깨짐 문자는 넣지 않는다.
""".strip()


def call_gms(*, api_key: str, model: str, prompt: str) -> str:
    payload = {
        "model": model,
        "messages": [
            {
                "role": "developer",
                "content": "You generate strict JSON synthetic OCR datasets. Output JSON only.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.8,
    }
    request = urllib.request.Request(
        GMS_CHAT_COMPLETIONS_URL,
        data=json.dumps(payload, ensure_ascii=True).encode("utf-8"),
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            try:
                response_bytes = response.read()
            except http.client.IncompleteRead as exc:
                response_bytes = exc.partial
            response_text = response_bytes.decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GMS request failed: HTTP {exc.code} {detail}") from exc

    try:
        response_payload = json.loads(response_text)
    except json.JSONDecodeError as exc:
        recovered_content = recover_content_from_partial_response(response_text)
        if recovered_content is not None:
            return recovered_content
        preview = response_text[:500].replace("\n", " ")
        raise RuntimeError(f"GMS returned a non-JSON response: {preview}") from exc

    return str(response_payload["choices"][0]["message"]["content"])


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


def parse_json_array(content: str) -> list[dict[str, Any]]:
    cleaned = content.strip()
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    payload = json.loads(cleaned)
    if not isinstance(payload, list):
        raise ValueError("GMS response must be a JSON array")
    return [item for item in payload if isinstance(item, dict)]


def normalize_label(raw_label: object) -> dict[str, object | None]:
    label = raw_label if isinstance(raw_label, dict) else {}
    normalized: dict[str, object | None] = {}
    for field in FIELD_NAMES:
        value = label.get(field)
        normalized[field] = value if isinstance(value, str) and value.strip() else None
    normalized["raw_text"] = None
    return normalized


def normalize_ocr_lines(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    lines: list[str] = []
    for item in value:
        if isinstance(item, dict):
            text = item.get("text")
        else:
            text = item
        if str(text).strip():
            lines.append(str(text).strip())
    return lines


def next_start_index(labels_dir: Path) -> int:
    max_index = 0
    for path in labels_dir.glob("card_synth_*.json"):
        match = re.fullmatch(r"card_synth_(\d+)", path.stem)
        if match:
            max_index = max(max_index, int(match.group(1)))
    return max_index + 1


def write_card_set(
    *,
    item: dict[str, Any],
    fallback_index: int,
    labels_dir: Path,
    outputs_dir: Path,
) -> str:
    requested_card_id = str(item.get("card_id") or "").strip()
    card_id = requested_card_id if re.fullmatch(r"card_synth_\d{4,}", requested_card_id) else f"card_synth_{fallback_index:04d}"
    label = normalize_label(item.get("label"))
    ocr_lines = normalize_ocr_lines(item.get("ocr_lines"))
    if not ocr_lines:
        ocr_lines = normalize_ocr_lines(item.get("raw_text_lines"))
    if not ocr_lines:
        ocr_lines = build_raw_text_from_label(label)

    raw_text = "\n".join(ocr_lines)
    write_json(labels_dir / f"{card_id}.json", label)
    write_json(
        outputs_dir / f"{card_id}.json",
        {
            "raw_text": raw_text,
            "lines": [
                {
                    "text": line,
                    "line_index": index,
                }
                for index, line in enumerate(ocr_lines)
            ],
        },
    )
    return card_id


def build_raw_text_from_label(label: dict[str, object | None]) -> list[str]:
    lines = [
        label.get("company_name"),
        label.get("department_name"),
        label.get("position"),
        label.get("contact_name"),
        label.get("responsibility"),
        label.get("mobile_phone"),
        label.get("office_phone"),
        label.get("fax_phone"),
        label.get("email"),
        label.get("address"),
    ]
    return [str(line) for line in lines if line]


def main() -> int:
    args = parse_args()
    labels_dir = args.labels_dir.resolve()
    outputs_dir = args.outputs_dir.resolve()
    start_index = args.start_index or next_start_index(labels_dir)

    if args.dry_run:
        for index in range(start_index, start_index + args.count):
            print(f"card_synth_{index:04d}")
        return 0

    api_key = load_env_value(args.env_file.resolve(), "GMS_KEY")
    written: list[str] = []

    remaining = args.count
    current_index = start_index
    while remaining > 0:
        batch_count = min(args.batch_size, remaining)
        content = call_gms(
            api_key=api_key,
            model=args.model,
            prompt=build_prompt(batch_count, current_index),
        )
        items = parse_json_array(content)
        if not items:
            raise RuntimeError("GMS returned no usable items")

        for offset, item in enumerate(items[:batch_count]):
            written.append(
                write_card_set(
                    item=item,
                    fallback_index=current_index + offset,
                    labels_dir=labels_dir,
                    outputs_dir=outputs_dir,
                )
            )

        current_index += batch_count
        remaining -= batch_count

    print(f"Generated {len(written)} synthetic card sets.")
    for card_id in written:
        print(card_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
