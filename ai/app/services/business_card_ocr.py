from __future__ import annotations

import io
import re
from functools import lru_cache
from typing import Any

import numpy as np
from PIL import Image, ImageOps

from app.schemas.ocr import BusinessCardOcrResponse


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


def analyze_business_card(_: str | None, __: str | None, image_bytes: bytes) -> BusinessCardOcrResponse:
    image = _load_image(image_bytes)
    ocr_lines = _extract_lines(image)
    raw_text = "\n".join(ocr_lines).strip() or None

    if not ocr_lines:
        return BusinessCardOcrResponse(raw_text=raw_text)

    company_name = _extract_company_name(ocr_lines)
    email = _extract_email(ocr_lines)
    mobile_phone, office_phone = _extract_phones(ocr_lines)
    contact_name, position = _extract_name_and_position(ocr_lines)
    department_name = _extract_department_name(ocr_lines, company_name, contact_name, position)
    responsibility = _extract_responsibility(ocr_lines, contact_name, position)

    return BusinessCardOcrResponse(
        company_name=company_name,
        contact_name=contact_name,
        position=position,
        email=email,
        mobile_phone=mobile_phone,
        office_phone=office_phone,
        responsibility=responsibility,
        department_name=department_name,
        raw_text=raw_text,
    )


def _load_image(image_bytes: bytes) -> np.ndarray:
    with Image.open(io.BytesIO(image_bytes)) as image:
        normalized = ImageOps.exif_transpose(image).convert("RGB")
        width, height = normalized.size
        if max(width, height) < 1200:
            scale = 1200 / max(width, height)
            normalized = normalized.resize((int(width * scale), int(height * scale)))
        return np.array(normalized)


@lru_cache(maxsize=1)
def _get_ocr_engine() -> Any:
    try:
        from paddleocr import PaddleOCR
    except ImportError as exc:
        raise RuntimeError("PaddleOCR is not installed. Add paddleocr and paddlepaddle to the AI service.") from exc

    try:
        return PaddleOCR(
            lang="korean",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )
    except TypeError:
        return PaddleOCR(lang="korean", use_angle_cls=True)


def _extract_lines(image: np.ndarray) -> list[str]:
    ocr_engine = _get_ocr_engine()

    try:
        results = ocr_engine.predict(image)
        lines = _parse_predict_results(results)
        if lines:
            return lines
    except AttributeError:
        pass
    except Exception as exc:
        raise RuntimeError(f"PaddleOCR predict() failed: {exc}") from exc

    try:
        legacy_results = ocr_engine.ocr(image, cls=True)
        return _parse_legacy_results(legacy_results)
    except Exception as exc:
        raise RuntimeError(
            "PaddleOCR inference failed in the legacy ocr() path. "
            "This is commonly caused by the local Paddle runtime/environment."
        ) from exc


def _parse_predict_results(results: Any) -> list[str]:
    texts: list[str] = []
    _collect_texts(results, texts)
    return _normalize_lines(texts)


def _collect_texts(node: Any, texts: list[str]) -> None:
    if node is None:
        return

    json_payload = getattr(node, "json", None)
    if json_payload is not None:
        _collect_texts(json_payload, texts)
        return

    if isinstance(node, dict):
        if isinstance(node.get("rec_texts"), list):
            texts.extend(str(item) for item in node["rec_texts"] if str(item).strip())
        elif isinstance(node.get("rec_text"), str):
            texts.append(node["rec_text"])
        elif isinstance(node.get("text"), str):
            texts.append(node["text"])

        for value in node.values():
            _collect_texts(value, texts)
        return

    if isinstance(node, (list, tuple)):
        for item in node:
            _collect_texts(item, texts)


def _parse_legacy_results(results: Any) -> list[str]:
    texts: list[str] = []
    if not isinstance(results, list):
        return texts

    for page in results:
        if not isinstance(page, list):
            continue
        for line in page:
            if not isinstance(line, list) or len(line) < 2:
                continue
            recognition = line[1]
            if isinstance(recognition, (list, tuple)) and recognition:
                texts.append(str(recognition[0]))
    return _normalize_lines(texts)


def _normalize_lines(lines: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()

    for line in lines:
        cleaned = re.sub(r"\s+", " ", str(line)).strip(" |")
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        normalized.append(cleaned)

    return normalized


def _extract_email(lines: list[str]) -> str | None:
    for line in lines:
        candidate = line.replace(" ", "")
        candidate = candidate.replace("cokr", "co.kr").replace("co kr", "co.kr")
        if "@" not in candidate and "email" in candidate.lower():
            continue
        match = EMAIL_PATTERN.search(candidate)
        if match:
            return match.group(0)
    return None


def _extract_company_name(lines: list[str]) -> str | None:
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

        if not _looks_like_name(line):
            candidates.append(line)

    return candidates[-1] if candidates else None


def _extract_phones(lines: list[str]) -> tuple[str | None, str | None]:
    mobile_phone = None
    office_phone = None

    for line in lines:
        for match in PHONE_PATTERN.findall(line):
            normalized = _normalize_phone(match)
            if normalized is None:
                continue

            if _is_mobile_phone(normalized):
                mobile_phone = mobile_phone or normalized
            else:
                office_phone = office_phone or normalized

    return mobile_phone, office_phone


def _normalize_phone(value: str) -> str | None:
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


def _is_mobile_phone(phone: str) -> bool:
    digits = re.sub(r"\D", "", phone)
    return digits.startswith(("010", "011", "016", "017", "018", "019"))


def _extract_name_and_position(lines: list[str]) -> tuple[str | None, str | None]:
    contact_name = None
    position = None

    for line in lines[:10]:
        if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line):
            continue
        if any(keyword in line for keyword in ADDRESS_KEYWORDS):
            continue
        if any(hint.lower() in line.lower() for hint in COMPANY_HINTS):
            continue

        inline_name, inline_position = _split_name_and_position(line)
        if inline_name and contact_name is None:
            contact_name = inline_name
        if inline_position and position is None:
            position = inline_position
        if contact_name and position:
            return contact_name, position

    for line in lines:
        if contact_name is None and _looks_like_name(line):
            contact_name = line
        if position is None:
            position_match = POSITION_PATTERN.search(line)
            if position_match:
                position = position_match.group(0)
        if contact_name and position:
            break

    return contact_name, position


def _split_name_and_position(line: str) -> tuple[str | None, str | None]:
    compact = re.sub(r"\s+", " ", line).replace("'", "").strip()
    position_match = POSITION_PATTERN.search(compact)

    if position_match:
        name_candidate = compact[:position_match.start()].strip()
        position_candidate = position_match.group(0).strip()
        if _looks_like_name(name_candidate):
            return name_candidate, position_candidate

    if _looks_like_name(compact):
        return compact, None

    return None, None


def _looks_like_name(value: str) -> bool:
    if not value:
        return False
    if len(value) > 20:
        return False
    if any(char.isdigit() for char in value):
        return False
    return bool(NAME_PATTERN.match(value))


def _extract_responsibility(
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


def _extract_department_name(
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
