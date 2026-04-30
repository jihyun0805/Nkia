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
    "department",
    "role",
    "position",
    "address",
    "email",
    "mobile",
    "phone",
    "fax",
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
한국어 명함 OCR 후처리 모델 학습용 합성 데이터를 {count}개 생성해줘.

반드시 유효한 JSON 배열만 출력해. 마크다운 코드블록, 설명 문장, 주석은 출력하지 마.
각 배열 원소는 반드시 아래 구조를 따른다.

{{
  "card_id": "card_synth_XXXX",
  "label": {{
    "company_name": "...",
    "contact_name": "...",
    "department": "...",
    "role": "...",
    "position": "...",
    "address": "...",
    "email": "...",
    "mobile": "...",
    "phone": "...",
    "fax": "..."
  }},
  "ocr_lines": [
    "PaddleOCR가 반환한 것처럼 보이는 줄 단위 raw text"
  ]
}}

필드 의미:
- company_name: 기업명, 기관명, 병원명, 매장명, 단체명.
- contact_name: 담당자명 또는 명함 소유자 이름.
- department: 부서명, 팀명, 본부명, 센터명, 연구소명.
- role: 담당업무 또는 업무 영역. 예: 플랫폼 개발, 전략영업, 고객 기술지원.
- position: 직책 또는 직급. 예: 대표, 원장, 팀장, 상무, 대리.
- address: 주소.
- email: 이메일.
- mobile: 개인 휴대전화번호.
- phone: 기업/사무실 대표 전화번호.
- fax: 팩스번호.

생성 규칙:
- card_id는 "card_synth_{start_index:04d}"부터 순서대로 만든다.
- label은 원본 명함 기준의 정답이다.
- label key 순서는 company_name, contact_name, department, role, position, address, email, mobile, phone, fax 순서를 지킨다.
- ocr_lines는 구조화 결과가 아니라 PaddleOCR 인식 결과처럼 보이는 줄 단위 raw text다.
- ocr_lines 안에는 company_name, contact_name 같은 필드명을 쓰지 않는다.
- ocr_lines만 보고 label 정답을 사람이 대략 추론할 수 있어야 한다.
- 줄 순서는 명함마다 다르게 섞는다.
- null 값은 명함마다 랜덤하게 발생한다.
- company_name, contact_name은 대부분 존재하게 한다.
- address, phone, fax, role, department는 일부 명함에서 null일 수 있다.
- 전화번호 label은 "010-1234-5678", "02-1234-5678"처럼 정규화한다.
- email label은 정상 이메일 형식으로 둔다.
- 예시에는 실제 개인 또는 실제 회사로 보일 수 있는 식별 정보를 쓰지 말고 홍길동, 김민수, 010-1234-5678, example.com 같은 더미 값을 사용한다.

현재 PaddleOCR 출력 특성:
- 서비스는 PP-OCRv5_mobile_det와 korean_PP-OCRv5_mobile_rec를 사용한다.
- 이미지는 긴 변이 보통 720~960px 범위가 되도록 리사이즈된다.
- 심하게 깨진 문자보다 가벼운 OCR 노이즈가 주로 발생한다고 가정한다.
- 읽을 수 없는 깨진 문자나 mojibake를 과하게 넣지 않는다.
- 한글 이름 표기는 다양해야 한다. 공백 없는 이름, 음절 공백 이름, 직책+이름, 이름+직책, 이름과 직책이 분리된 줄을 골고루 섞는다.
- 이름 표기 예: "홍길동", "홍 길 동", "팀장 홍길동", "홍길동 팀장", "홍 길 동 대표".
- 라벨 문자가 값에 붙을 수 있다. 예: "m (010) 1234 5678", "e hong.gildong@example.com", "TEL 02 1234 5678".
- 전화번호는 중복 또는 근사 중복 라인이 생길 수 있다. 예: "m (010) 1234 5678"와 "m(010) 1234 5678".
- 주소는 1~2줄로 분리될 수 있다.
- OCR lines에는 짧은 로고 텍스트, 웹사이트, 우편번호, 슬로건, 건물명/층 정보가 포함될 수 있다.

어려운 케이스 생성 규칙:
- 이름과 직책 형태는 한 가지 패턴으로 고정하지 않는다.
- 전체 생성 데이터 중 일부만 이름+직책을 한 줄에 결합한다.
- 나머지는 이름만 한 줄에 있거나, 직책만 별도 줄에 있거나, 직책이 이름 앞에 오는 형태를 섞는다.
- 예시:
  - "홍길동" + 별도 줄 "대표" -> label.contact_name: "홍길동", label.position: "대표"
  - "홍 길 동" + 별도 줄 "대표" -> label.contact_name: "홍길동", label.position: "대표"
  - "홍길동 대표" -> label.contact_name: "홍길동", label.position: "대표"
  - "홍 길 동 대표" -> label.contact_name: "홍길동", label.position: "대표"
  - "팀장 김민수" -> label.contact_name: "김민수", label.position: "팀장"
  - "김 민 수 팀장" -> label.contact_name: "김민수", label.position: "팀장"
  - "원장 이영희" -> label.contact_name: "이영희", label.position: "원장"
- 일부 명함에는 한 줄에 여러 연락처 값을 넣는다.
  예: "M 010-1234-5678 TEL 02-1234-5678"
  예: "T 02 1234 5678 F 02 1234 5679"
  label에서는 mobile, phone, fax, email을 분리해서 저장한다.
- 일부 명함에는 이메일 라벨 노이즈를 넣는다.
  예: "e hong.gildong@example.com", "E-mail hong.gildong@example com", "mail hong.gildong at example.com"
  label에는 정규화된 이메일을 저장한다.
- 일부 명함에는 주소가 여러 OCR 줄로 분리되게 한다.
  예: "서울특별시 강남구 테헤란로", "123 8층"
  label에는 완성된 주소를 저장한다.
- department, role, position을 헷갈리기 쉬운 케이스를 포함한다.
  department 예: "AI플랫폼팀", "전략영업팀", "디지털혁신센터"
  role 예: "플랫폼 개발", "전략영업", "고객 기술지원"
  position 예: "팀장", "대표", "상무", "원장", "대리"
- none/noise 줄을 일부 포함한다. 예: "ABC", "NK", "D-Lab", "www.example.com", "(우)06234", "Global Business Partner", "Since 2012"
- 어려운 케이스만 과하게 만들지 말고 쉬운 명함, 중간 난이도 명함, 어려운 명함을 섞는다.

Few-shot examples:

예시 1:
{{
  "card_id": "card_synth_EXAMPLE_0001",
  "label": {{
    "company_name": "한국소프트웨어개발",
    "contact_name": "김민수",
    "department": "AI플랫폼팀",
    "role": "플랫폼 개발",
    "position": "팀장",
    "address": "서울특별시 강남구 테헤란로 123 8층",
    "email": "minsu.kim@example.com",
    "mobile": "010-1234-5678",
    "phone": "02-1234-5678",
    "fax": null
  }},
  "ocr_lines": [
    "한국소프트웨어개발",
    "팀장 김민수 / AI플랫폼팀",
    "플랫폼 개발",
    "M 010 1234 5678 TEL. 02-1234-5678",
    "E-mail minsu.kim@example com",
    "서울특별시 강남구 테헤란로 123",
    "8층",
    "www.example.com"
  ]
}}

예시 2:
{{
  "card_id": "card_synth_EXAMPLE_0002",
  "label": {{
    "company_name": "더미메디컬센터",
    "contact_name": "이영희",
    "department": "진료지원팀",
    "role": null,
    "position": "원장",
    "address": "경기도 성남시 분당구 중앙로 45",
    "email": "younghee.lee@example.com",
    "mobile": "010-1234-5678",
    "phone": "031-123-4567",
    "fax": "031-123-4568"
  }},
  "ocr_lines": [
    "더미메디컬센터",
    "이영희",
    "원장",
    "진료지원팀",
    "031-123-4567",
    "FAX 031 123 4568",
    "01012345678 younghee.lee at example.com",
    "경기도 성남시 분당구 중앙로",
    "45",
    "Global Care Partner"
  ]
}}

예시 3:
{{
  "card_id": "card_synth_EXAMPLE_0003",
  "label": {{
    "company_name": "더미플래너스",
    "contact_name": "홍길동",
    "department": null,
    "role": "전략영업",
    "position": "대표",
    "address": "서울특별시 강남구 테헤란로 123",
    "email": "hong.gildong@example.com",
    "mobile": "010-1234-5678",
    "phone": "02-1234-5678",
    "fax": null
  }},
  "ocr_lines": [
    "더미플래너스",
    "홍 길 동 대표",
    "전략영업",
    "M 010-1234-5678",
    "m(010) 1234 5678",
    "TEL 02 1234 5678",
    "e hong.gildong@example.com",
    "서울특별시 강남구 테헤란로",
    "123",
    "Since 2012"
  ]
}}

위 예시는 형식과 다양성 참고용이다. 실제 출력에는 EXAMPLE card_id를 쓰지 말고 요청된 card_synth 번호만 사용한다.
""".strip()

def call_gms(*, api_key: str, model: str, prompt: str) -> str:
    payload = {
        "model": model,
        "messages": [
            {
                "role": "developer",
                "content": "너는 엄격한 JSON 형식의 합성 OCR 학습 데이터를 생성한다. JSON만 출력한다.",
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
        value = _read_label_value(label, field)
        normalized[field] = value if isinstance(value, str) and value.strip() else None
    return normalized


def _read_label_value(label: dict[str, Any], field: str) -> object | None:
    aliases = {
        "mobile": ("mobile", "mobile_phone"),
        "phone": ("phone", "office_phone"),
        "fax": ("fax", "fax_phone"),
        "role": ("role", "responsibility"),
        "department": ("department", "department_name"),
    }
    for key in aliases.get(field, (field,)):
        value = label.get(key)
        if value is not None:
            return value
    return None


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
        label.get("contact_name"),
        label.get("department"),
        label.get("role"),
        label.get("position"),
        label.get("address"),
        label.get("email"),
        label.get("mobile"),
        label.get("phone"),
        label.get("fax"),
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
