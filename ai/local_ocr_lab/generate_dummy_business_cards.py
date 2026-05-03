# GMS 활용하여 더미데이터 생성하는 코드
from __future__ import annotations

import argparse
import http.client
import json
import re
import time
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
한국어 명함 OCR 후처리 모델 학습용 합성 데이터를 {count}개 생성해라.

반드시 유효한 JSON 배열만 출력한다. 설명, 마크다운 코드블록, 주석은 출력하지 않는다.

각 배열 요소는 반드시 아래 구조를 따른다.

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
- department: 부서명, 팀명, 본부명, 센터명, 연구소명. 직책이나 업무 설명이 아니다.
- role: 담당업무 또는 업무 영역. 예: 플랫폼 개발, 전략영업, 고객 기술지원, 영업대표.
- position: 직책 또는 직급. 예: 대표, 이사, 원장, 팀장, 상무, 대리, 사원.
- address: 주소.
- email: 이메일.
- mobile: 개인 휴대전화번호.
- phone: 회사/사무실 대표 전화번호.
- fax: 팩스번호.

기본 생성 규칙:
- card_id는 "card_synth_{start_index:04d}"부터 순차 증가한다.
- label은 정답 기준이며 정규화된 값을 저장한다.
- label key 순서는 company_name, contact_name, department, role, position, address, email, mobile, phone, fax 순서를 지킨다.
- ocr_lines는 구조화 결과가 아니라 PaddleOCR 인식 결과처럼 보이는 줄 단위 raw text다.
- ocr_lines 안에는 company_name, contact_name 같은 필드명을 쓰지 않는다.
- ocr_lines만 보고 label 정답을 사람이 대략 추론할 수 있어야 한다.
- company_name, contact_name은 대부분 존재하게 한다.
- department, role, address, phone, fax는 자연스럽게 null일 수 있다.
- null이 모든 항목에서 같은 필드에만 반복되지 않게 한다.
- 전화번호 label은 "010-1234-5678", "02-1234-5678"처럼 정규화한다.
- email label은 정상 이메일 형식으로 둔다.
- 예시는 모두 더미 값이다. 실제 사람/실제 회사/실제 연락처처럼 보이는 고유 식별 정보는 만들지 않는다.

명함 스타일 다양성:
- 각 데이터는 아래 유형 중 하나를 선택하되, 같은 유형과 같은 레이아웃을 반복하지 않는다.
- IT 스타트업, 대기업, 병원/의원, 공공기관, 제조업, 개인사업자/프리랜서, 교육기관/학원, 외국계 회사, 디자인 스튜디오, 법률/회계 사무소, 안전/관리 서비스, B2B 솔루션 회사.
- 각 데이터 생성 시 반드시 먼저 하나의 스타일을 선택하고, 그 스타일의 특징을 반영하여 생성한다.
- 선택한 스타일은 내부적으로만 유지하고 출력 JSON에는 포함하지 않는다.
- 줄 순서, 줄 개수, 누락 필드, 노이즈 위치를 매번 다르게 한다.
- count가 작으면 아래 비율은 정확한 숫자보다 균형 있게 분산하는 목표로 사용한다.

레이아웃 다양성:
- 각 명함은 서로 다른 레이아웃을 가진 것처럼 보이게 해야 한다.
- 예: 회사명이 맨 아래에 위치, 연락처가 맨 위에 위치, 이름이 중간에 위치, 주소가 먼저 나오는 경우, 회사명과 슬로건이 떨어져 있는 경우.
- 항상 회사명-부서-이름-연락처-주소 순서로 만들지 않는다.
- ocr_lines 개수는 명함마다 다르게 하며 최소 3줄, 최대 12줄 범위로 만든다.
- 일부는 매우 짧고 단순하게, 일부는 정보가 많고 복잡하게 만든다.

PaddleOCR 출력 특성:
- 서비스는 PP-OCRv5_mobile_det와 korean_PP-OCRv5_mobile_rec를 사용한다.
- 이미지는 보통 720~960px 범위로 리사이즈된다.
- 완전히 깨진 mojibake는 만들지 않는다.
- 가벼운 OCR 노이즈만 넣는다: 공백 삽입/누락, 점/하이픈 누락, 대소문자 흔들림, 유사 중복 줄, 주소 줄 분리.
- 한 줄에 여러 정보가 붙을 수 있다. 예: "T:02-1234-5678F:02-1234-5679", "M 010-1234-5678 TEL 02-1234-5678".

현재 실패 케이스를 반영하되, 여기에 매몰되지 마라:
- 전체 중 일부만 이름+직책을 한 줄에 넣는다. 나머지는 이름만, 직책만, 직책+이름, 이름과 직책 분리 형태를 섞는다.
- 한글 이름은 "홍길동", "홍 길 동", "홍  길  동", "대표 홍길동", "홍길동 대표", "홍 길 동 대표"처럼 다양하게 만든다.
- label.contact_name은 공백 제거된 이름이다. label.position은 직책이다.
- "영업대표/ 이사", "기술영업 / 부장", "마케팅 총괄 이사"처럼 role과 position이 한 줄에 섞이는 케이스를 일부 포함한다.
  - 이 경우 department가 아니라 role과 position에 나누어 저장한다.
  - 단 이런 케이스만 반복하지 말고 전체의 일부로만 섞는다.
- 영어 직급과 영어/혼합 부서명이 한 줄에 같이 나오는 케이스를 일부 포함한다.
  - 예: "Manager | Sample Platform Team 2", "Director / Demo Cloud Team", "Lead Engineer · Sample Data Lab", "Senior Consultant | Demo Strategy Unit".
  - 이 경우 label.position에는 영어 직급 또는 직무 타이틀을 저장하고, label.department에는 팀/본부/랩/디비전/그룹명을 저장한다.
  - position 후보는 다양하게 만든다: Manager, Senior Manager, Director, Lead, Lead Engineer, Staff Engineer, Principal Engineer, Product Manager, Project Manager, Consultant, Senior Consultant, Specialist, Analyst, Coordinator, Head, VP.
  - department 후보도 다양하게 만든다: Sample Platform Team, Sample Platform Team 2, Demo Cloud Team, Sample Data Lab, Demo Strategy Unit, Demo Innovation Group, Sample Sales Team, Demo Digital Division, Sample Experience Team, Demo Success Team, R&D Center, Security Lab, Sample Service Team.
  - 구분자는 "|", "/", "·", "-", 줄바꿈을 섞는다. 직급이 앞에 올 수도 있고 부서가 앞에 올 수도 있다.
  - 단, 이런 영어 케이스만 반복하지 말고 전체의 일부로만 섞는다.
- department, role, position이 헷갈리는 케이스를 포함하되 균형 있게 만든다.
  - department 예: "AI플랫폼팀", "전략영업팀", "Digital & Innovation", "SAFETY & CARE", "진료지원팀", "범죄예방계"
  - role 예: "플랫폼 개발", "전략영업", "고객 기술지원", "영업대표", "안전관리 컨설팅", "Product Planning", "Technical Sales", "Customer Success"
  - position 예: "대표", "이사", "팀장", "원장", "부장", "사원", "Manager", "Director", "Lead Engineer", "Product Manager"
- role처럼 보이는 영어 슬로건이나 서비스 설명은 department로 넣지 않는다.
- "AI Service Provider", "Global Business Partner", "The Most Trustable Safety Service Planners" 같은 문구는 role 또는 none/noise로 둔다.
- 영문 부서명은 department가 될 수 있다. 예: "Digital & Innovation", "SAFETY & CARE".

극단 케이스:
- 전체 데이터 중 일부는 다음과 같은 극단 케이스를 포함한다.
- 연락처가 전혀 없는 명함.
- 이름만 존재하고 회사/연락처 정보가 거의 없는 명함.
- 회사명과 홈페이지만 있는 매우 단순한 명함.
- 정보가 3~4줄뿐인 명함.
- 단, 이런 극단 케이스만 반복하지 말고 전체의 일부로만 섞는다.

연락처/이메일/주소 다양성:
- 일부 명함은 한 줄에 mobile, phone, fax가 같이 나온다.
- 일부 명함은 phone과 fax가 붙어서 나온다. 예: "T:02-1234-5678F:02-1234-5679".
- 일부 명함은 mobile 또는 fax가 없다.
- 이메일 OCR 라인은 "E-mail hong.gildong@example com", "E. hong.gildong@example.com", "mail hong.gildong at example.com"처럼 흔들릴 수 있다.
- label.email은 항상 정규화된 정상 이메일이다.
- 주소는 한 줄, 두 줄 분리, 빌딩명/층수 분리, 유사 중복 줄을 섞는다.
- 우편번호만 있는 줄, 홈페이지, 슬로건, 약어 같은 none/noise 줄을 일부 포함한다.

반복 방지:
- 같은 이름/회사명/도메인/전화번호/주소 패턴을 반복하지 않는다.
- 예시의 값을 그대로 복사하지 않는다.
- 모든 데이터가 "이름 직책" 또는 "회사-부서-이름-연락처-주소" 같은 동일 순서가 되면 안 된다.
- 어려운 케이스, 중간 난이도 케이스, 쉬운 케이스를 섞는다.
- 한 번의 응답 JSON 배열 안에서 같은 contact_name을 반복하지 않는다.
- 한 번의 응답 JSON 배열 안에서 같은 company_name을 반복하지 않는다.
- 한 번의 응답 JSON 배열 안에서 같은 mobile, phone, fax 번호를 반복하지 않는다.
- 한 번의 응답 JSON 배열 안에서 같은 email 도메인을 반복하지 않는다.
- "홍길동", "김철수", "김민수", "이영희", "박영수", "최민수", "이준호", "이수진" 같은 예시형 이름은 실제 생성 데이터에서 사용하지 않는다.
- contact_name은 매번 새로 만든 더미 한국어 이름을 사용한다. 흔한 예시 이름을 복사하지 말고 성과 이름 음절을 다양하게 조합한다.
- 같은 성씨가 연속으로 과도하게 반복되지 않게 한다. 김/이/박/최뿐 아니라 정, 강, 조, 윤, 장, 임, 한, 오, 서, 신, 권, 황, 안, 송, 류, 문, 배, 백, 남, 하, 노, 민, 주, 구, 심, 양, 전, 유, 고, 곽, 차, 도, 라, 우, 진, 천, 방 등을 섞는다.
- 이름의 마지막 두 음절도 반복하지 않는다. 예: "민수", "영희", "준호", "수진" 같은 조합을 반복하지 말고, 서윤, 도현, 하린, 지안, 태오, 유나, 은재, 시온, 나겸, 다온, 재율, 세아, 로운, 하람처럼 다양한 더미 조합을 만든다.
- 한 번의 응답 JSON 배열 안에서는 contact_name의 성씨도 가능한 한 분산한다.
- 실제 유명인, 실제 팀원, 실제 고객처럼 보이는 고유 인물명을 만들지 말고, 학습용 더미 이름처럼 보이되 다양하게 만든다.
- "010-1234-5678", "010-9876-5432", "02-1234-5678", "02-9876-5432" 같은 예시형 번호는 실제 생성 데이터에서 사용하지 않는다.
- example.com은 few-shot 전용 도메인이다. 실제 생성 데이터의 email이나 홈페이지에는 example.com을 사용하지 않는다.
- 이메일 도메인은 회사명 또는 스타일에 맞게 매번 다르게 만든다. 예: dummy-a.kr, sample-care.co.kr처럼 더미 도메인을 다양화한다.
- 전화번호는 실제성이 낮은 더미 번호를 쓰되, 각 데이터마다 숫자 조합을 다르게 만든다.
- 이름도 예시 이름을 복사하지 말고, 매 데이터마다 서로 다른 더미 한국어 이름을 만든다.

Few-shot example:

{{
  "card_id": "card_synth_EXAMPLE_0001",
  "label": {{
    "company_name": "더미소프트개발",
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
    "더미소프트개발",
    "팀장 김 민 수 / AI플랫폼팀",
    "플랫폼 개발",
    "M 010 1234 5678 TEL. 02-1234-5678",
    "E-mail minsu.kim@example com",
    "서울특별시 강남구 테헤란로 123",
    "8층",
    "www.example.com"
  ]
}}

위 예시는 형식 참고용이다. 실제 출력에서는 EXAMPLE card_id를 쓰지 말고 요청된 card_synth 번호만 사용한다.
예시의 줄 순서, 필드 구성, 연락처 표현, 이름/직책 배치를 반복하지 않는다.
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

    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
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

        try:
            response_payload = json.loads(response_text)
            return str(response_payload["choices"][0]["message"]["content"])
        except json.JSONDecodeError as exc:
            recovered_content = recover_content_from_partial_response(response_text)
            if recovered_content is not None:
                return recovered_content
            preview = response_text[:500].replace("\n", " ")
            last_error = RuntimeError(f"GMS returned a non-JSON response: {preview}")
            if attempt < 3:
                time.sleep(attempt * 2)
                continue
            raise last_error from exc

    raise RuntimeError("GMS request failed after retries") from last_error


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
