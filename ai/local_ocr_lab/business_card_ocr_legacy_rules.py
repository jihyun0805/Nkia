# 기존 룰 기반 로직 코드 (현재는 사용하지 않음)
from __future__ import annotations

import re


# Legacy rule-based extraction kept for local reference. The active service
# path uses business_card_field_classifier.py instead.

EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?(?:\d{2,4}[-.\s]?)?\d{3,4}[-.\s]?\d{4}")
POSITION_PATTERN = re.compile(
    r"(대표이사|대표|부사장|사장|전무|상무|이사|실장|본부장|센터장|소장|팀장|부장|차장|과장|대리|주임|매니저|책임|수석|선임|연구원|프로|교수|박사|계장)"
)
RESPONSIBILITY_KEYWORDS = (
    "담당",
    "업무",
    "팀",
    "실",
    "본부",
    "센터",
    "사업",
    "영업",
    "마케팅",
    "기획",
    "개발",
    "기술",
    "운영",
    "인사",
    "재무",
    "총무",
    "구매",
    "품질",
    "생산",
)
ADDRESS_KEYWORDS = (
    "특별시",
    "광역시",
    "도",
    "시",
    "군",
    "구",
    "로",
    "길",
    "번길",
    "동",
    "층",
    "호",
)
COMPANY_HINTS = ("주식회사", "(주)", "corp", "inc", "co.", "company", "ltd", "llc", "경찰서")
NAME_PATTERN = re.compile(r"^[가-힣]{2,4}$|^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$")


def extract_company_name(lines: list[str]) -> str | None:
    candidates: list[str] = []

    for line in lines[:8]:
        if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line):
            continue
        if any(keyword in line for keyword in ADDRESS_KEYWORDS):
            continue
        if POSITION_PATTERN.search(line):
            continue

        lowered = line.lower()
        if any(hint in lowered for hint in COMPANY_HINTS):
            return line

        if not looks_like_name(line):
            candidates.append(line)

    return candidates[-1] if candidates else None


def extract_email(lines: list[str]) -> str | None:
    for line in lines:
        candidate = line.replace(" ", "")
        candidate = candidate.replace("cokr", "co.kr").replace("co kr", "co.kr")
        if "@" not in candidate and "email" in candidate.lower():
            continue
        match = EMAIL_PATTERN.search(candidate)
        if match:
            return match.group(0)
    return None


def extract_phones(lines: list[str]) -> tuple[str | None, str | None]:
    mobile_phone = None
    office_phone = None

    for line in lines:
        for match in PHONE_PATTERN.findall(line):
            normalized = normalize_phone(match)
            if normalized is None:
                continue

            if is_mobile_phone(normalized):
                mobile_phone = mobile_phone or normalized
            else:
                office_phone = office_phone or normalized

    return mobile_phone, office_phone


def normalize_phone(value: str) -> str | None:
    digits = re.sub(r"\D", "", value)
    if len(digits) < 9 or len(digits) > 12:
        return None

    if digits.startswith("82") and len(digits) in {11, 12}:
        digits = "0" + digits[2:]

    if len(digits) == 11:
        return f"{digits[:3]}-{digits[3:7]}-{digits[7:]}"
    if len(digits) == 10:
        if digits.startswith("02"):
            return f"{digits[:2]}-{digits[2:6]}-{digits[6:]}"
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    if len(digits) == 9 and digits.startswith("02"):
        return f"{digits[:2]}-{digits[2:5]}-{digits[5:]}"
    return digits


def is_mobile_phone(phone: str) -> bool:
    digits = re.sub(r"\D", "", phone)
    return digits.startswith(("010", "011", "016", "017", "018", "019"))


def extract_name_and_position(lines: list[str]) -> tuple[str | None, str | None]:
    contact_name = None
    position = None

    for line in lines[:10]:
        if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line):
            continue
        if any(keyword in line for keyword in ADDRESS_KEYWORDS):
            continue
        if any(hint.lower() in line.lower() for hint in COMPANY_HINTS):
            continue

        inline_name, inline_position = split_name_and_position(line)
        if inline_name and contact_name is None:
            contact_name = inline_name
        if inline_position and position is None:
            position = inline_position
        if contact_name and position:
            return contact_name, position

    for line in lines:
        if contact_name is None and looks_like_name(line):
            contact_name = line
        if position is None:
            position_match = POSITION_PATTERN.search(line)
            if position_match:
                position = position_match.group(0)
        if contact_name and position:
            break

    return contact_name, position


def split_name_and_position(line: str) -> tuple[str | None, str | None]:
    compact = re.sub(r"\s+", " ", line).replace("'", "").strip()
    position_match = POSITION_PATTERN.search(compact)

    if position_match:
        name_candidate = compact[: position_match.start()].strip()
        position_candidate = position_match.group(0).strip()
        if looks_like_name(name_candidate):
            return name_candidate, position_candidate

    if looks_like_name(compact):
        return compact, None

    return None, None


def looks_like_name(value: str) -> bool:
    if not value:
        return False
    if len(value) > 20:
        return False
    if any(char.isdigit() for char in value):
        return False
    return bool(NAME_PATTERN.match(value))


def extract_responsibility(
    lines: list[str],
    contact_name: str | None,
    position: str | None,
) -> str | None:
    excluded = {item for item in (contact_name, position) if item}

    for line in lines:
        if line in excluded:
            continue
        if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line):
            continue
        if any(keyword in line for keyword in ADDRESS_KEYWORDS):
            continue
        if any(keyword in line for keyword in RESPONSIBILITY_KEYWORDS):
            return line

    return None


def extract_department_name(
    lines: list[str],
    company_name: str | None,
    contact_name: str | None,
    position: str | None,
) -> str | None:
    excluded = {item for item in (company_name, contact_name, position) if item}

    for line in lines:
        if line in excluded:
            continue
        if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line):
            continue
        if any(keyword in line for keyword in ADDRESS_KEYWORDS):
            continue
        if any(token in line for token in ("팀", "실", "본부", "센터", "사업부", "부서", "계")):
            return line

    return None
