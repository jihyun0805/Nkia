"""edit_field intent 감지.

"X 사업 담당자 Y로 수정해줘" 같은 발화에서:
- entity (X 사업) → opportunity / contract / billing / license / project
- field (담당자) → 의미 슬롯 키
- value (Y) → 새 값
을 추출하여 actionGuide 로 응답에 첨부할 수 있도록 구조화한다.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field


# 도메인별 필드 의미 → (UI 폼 필드명, 라벨)
DOMAIN_FIELDS: dict[str, dict[str, tuple[str, str]]] = {
    "opportunity": {
        "담당자": ("sales_representative_name", "영업대표"),
        "영업대표": ("sales_representative_name", "영업대표"),
        "영업담당": ("sales_representative_name", "영업대표"),
        "단계": ("stage", "현재 단계"),
        "현재 단계": ("stage", "현재 단계"),
        "사업단계": ("stage", "현재 단계"),
        "이슈": ("issue_content", "이슈"),
        "예상 사업비": ("expected_amount", "예상 사업비"),
        "예상사업비": ("expected_amount", "예상 사업비"),
        "경쟁상황": ("competitor_status", "경쟁 상황"),
        "메모": ("main_content", "주요 내용"),
        "주요내용": ("main_content", "주요 내용"),
        "고객사": ("customer_name", "고객사"),
        "사업유형": ("business_type", "사업 유형"),
    },
    "contract": {
        "계약상태": ("contract_status", "계약 상태"),
        "메모": ("memo", "메모"),
        "시작일": ("start_date", "시작일"),
        "종료일": ("end_date", "종료일"),
    },
    "billing": {
        "금액": ("billing_amount", "청구 금액"),
        "청구금액": ("billing_amount", "청구 금액"),
        "발행일": ("issued_at", "발행일"),
        "비고": ("remarks", "비고"),
        "메모": ("remarks", "비고"),
    },
    "license": {
        "수량": ("quantity", "수량"),
        "시작일": ("start_date", "시작일"),
        "종료일": ("end_date", "종료일"),
        "상태": ("status", "상태"),
    },
    "project": {
        "프로젝트명": ("pjt_name", "프로젝트명"),
        "타입": ("type", "타입"),
        "유형": ("type", "타입"),
        "시작일": ("start_date", "시작일"),
        "종료일": ("end_date", "종료일"),
    },
}

# 액션 트리거 동사
EDIT_VERBS = (
    "수정해", "수정 해", "수정하", "수정",
    "변경해", "변경 해", "변경", "바꿔", "바꿔줘", "바꾸",
    "업데이트", "갱신",
    "고쳐", "고쳐줘", "고치",
    "설정", "설정해",
)

OPP_CODE_PAT = re.compile(r"(?:AUTO-OPP|OPP)-\d+-\d+", re.IGNORECASE)


@dataclass(frozen=True)
class EditFieldIntent:
    """감지된 수정 의도."""
    entity_type: str  # opportunity / contract / billing / license / project
    entity_hint: str  # 사업명/고객사명 등 자연어 단서 (entity_id 로 resolve 필요)
    entity_code: str | None  # 정확한 코드가 추출되면 채워짐
    field_name: str  # UI 폼 필드명
    field_label: str  # UI 라벨
    new_value: str  # 변경할 값
    matched_verbs: list[str] = field(default_factory=list)
    confidence: float = 0.0


def detect_edit_field_intent(query: str) -> EditFieldIntent | None:
    """발화에서 edit_field 의도를 룰 기반으로 추출.

    예:
      "AUTO-OPP-2026-101 담당자 김철수로 수정해줘"
      "신한은행 운영자동화 사업 단계 BID로 바꿔줘"
      "포스코ICT 계약 메모 '재협상 요청' 으로 변경"
    """
    if not query:
        return None
    text = query.strip()
    text_norm = " " + text + " "  # word boundary 보조

    # 1) edit verb 매칭 필수
    matched_verbs = [v for v in EDIT_VERBS if v in text]
    if not matched_verbs:
        return None

    # 2) entity_type 추론: opportunity 키워드 우선, 그 외 contract/billing/license/project
    entity_type: str | None = None
    if any(kw in text for kw in ("사업기회", "사업 ", " 사업", "오포튜니티")):
        entity_type = "opportunity"
    if any(kw in text for kw in ("계약 ", " 계약", "계약서")):
        entity_type = "contract"
    if any(kw in text for kw in ("청구", "세금계산서", "인보이스")):
        entity_type = "billing"
    if any(kw in text for kw in ("라이선스", "라이센스", "license")):
        entity_type = "license"
    if any(kw in text for kw in ("프로젝트", "project")):
        entity_type = "project"
    if entity_type is None:
        # opportunity code 만 있고 entity_type 미언급이면 opportunity 로 가정
        if OPP_CODE_PAT.search(text):
            entity_type = "opportunity"
        else:
            return None

    field_map = DOMAIN_FIELDS.get(entity_type, {})
    # 3) field 추론 — 키워드를 사전순 길이 내림차순으로 매칭 (긴 키워드 우선)
    field_name: str | None = None
    field_label: str | None = None
    matched_field_kw: str | None = None
    for kw in sorted(field_map.keys(), key=len, reverse=True):
        if kw in text:
            field_name, field_label = field_map[kw]
            matched_field_kw = kw
            break
    if not field_name:
        return None

    # 4) entity hint / code 추출
    entity_code_match = OPP_CODE_PAT.search(text)
    entity_code = entity_code_match.group(0).upper() if entity_code_match else None

    # entity_hint: 자연어로 식별되는 부분 (entity_code 우선)
    entity_hint = entity_code or _extract_entity_hint(text, matched_verbs, matched_field_kw)
    if not entity_hint:
        return None

    # 5) value 추출 — 패턴: "{field} {value}로 {verb}" 또는 따옴표/괄호 안 값
    new_value = _extract_value(text, matched_field_kw, matched_verbs)
    if not new_value:
        return None

    return EditFieldIntent(
        entity_type=entity_type,
        entity_hint=entity_hint,
        entity_code=entity_code,
        field_name=field_name,
        field_label=field_label,
        new_value=new_value,
        matched_verbs=matched_verbs,
        confidence=0.85 if entity_code else 0.70,
    )


def _extract_entity_hint(text: str, verbs: list[str], field_kw: str | None) -> str | None:
    """텍스트에서 entity 식별 hint 추출. 사업명/고객사명 후보."""
    # entity_type 키워드를 기준으로 앞쪽 단어들을 hint 로 본다.
    # 단순 휴리스틱: field_kw 직전까지의 문자열을 hint 로
    if field_kw and field_kw in text:
        before = text.split(field_kw, 1)[0].strip()
        # 종결 조사 제거
        for suf in ("의", "을", "를", "이", "가", "은", "는", "에", "사업기회", "사업"):
            if before.endswith(suf):
                before = before[: -len(suf)].strip()
        return before or None
    return None


_VALUE_QUOTED_PAT = re.compile(r"['\"‘’“”「」]([^'\"‘’“”「」]{1,100})['\"‘’“”「」]")
_VALUE_AFTER_FIELD_PAT = re.compile(r"(\S{1,40})\s*(?:로|으로|에)\s*(?:" + "|".join(map(re.escape, EDIT_VERBS)) + ")")


def _extract_value(text: str, field_kw: str | None, verbs: list[str]) -> str | None:
    """변경할 값 추출."""
    # 우선 따옴표 안 값
    m = _VALUE_QUOTED_PAT.search(text)
    if m:
        return m.group(1).strip()

    # "X로 수정" 또는 "X으로 변경" 패턴
    m = _VALUE_AFTER_FIELD_PAT.search(text)
    if m:
        value = m.group(1).strip()
        # 조사 strip
        for suf in ("로", "으로", "에"):
            if value.endswith(suf):
                value = value[: -len(suf)].strip()
        return value or None

    # field 키워드 다음 토큰
    if field_kw and field_kw in text:
        after = text.split(field_kw, 1)[1].strip()
        # "을/를 X로 수정" 형태
        tokens = after.split()
        for token in tokens[:6]:
            cleaned = token.rstrip("로으에을를")
            if cleaned and not any(v in cleaned for v in verbs):
                return cleaned
    return None
