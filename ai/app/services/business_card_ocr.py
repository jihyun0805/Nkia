from __future__ import annotations

import io
import logging
import re
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from app.schemas.ocr import BusinessCardOcrLine, BusinessCardOcrResponse, BusinessCardPaddleOutput
from app.services.business_card_field_classifier import predict_business_card_fields


logger = logging.getLogger(__name__)

EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?(?:\d{2,4}[-.\s]?)?\d{3,4}[-.\s]?\d{4}")
EMAIL_FALLBACK_PATTERN = re.compile(
    r"(?P<local>[a-z0-9._%+-]+)(?P<domain>naver|gmail|daum|kakao|hotmail|outlook|yahoo|korea)(?P<tld>com|net|org|co\.kr|kr)$",
    re.IGNORECASE,
)
EMAIL_LABEL_PATTERN = re.compile(r"^(?:e-?mail|mail)\s*[:：]?\s*", re.IGNORECASE)
PHONE_LABEL_PATTERN = re.compile(
    r"^(?:mobile|cell|m|phone|tel|t|office|direct|fax)\s*[:：]?\s*",
    re.IGNORECASE,
)
CORPORATE_MARKER_PATTERN = re.compile(r"[\(\[]?\s*주\s*[\)\]]?")
HANGUL_NAME_PATTERN = re.compile(r"^[가-힣]{2,4}$")
KOREAN_POSITION_TITLES = (
    "대표이사",
    "부사장",
    "전무",
    "상무",
    "이사",
    "본부장",
    "센터장",
    "실장",
    "부장",
    "차장",
    "과장",
    "팀장",
    "계장",
    "대리",
    "주임",
    "선임",
    "책임",
    "연구원",
    "사원",
    "대표",
    "원장",
    "소장",
    "매니저",
    "PM",
)
DEPARTMENT_KEYWORDS = (
    "department",
    "division",
    "team",
    "center",
    "centre",
    "office",
    "lab",
    "본부",
    "센터",
    "부서",
    "사업부",
    "팀",
    "실",
    "부",
    "과",
    "계",
)


@dataclass(frozen=True)
class OCRLine:
    text: str
    order: int
    top: float | None = None
    left: float | None = None
    width: float | None = None
    height: float | None = None


def extract_business_card_paddle_output(_: str | None, __: str | None, image_bytes: bytes) -> BusinessCardPaddleOutput:
    started_at = time.perf_counter()
    step_started_at = time.perf_counter()
    images = _load_image_variants(image_bytes)
    logger.info("business_card_ocr.timing image_variants count=%s elapsed=%.3fs", len(images), time.perf_counter() - step_started_at)

    step_started_at = time.perf_counter()
    ocr_candidates = _extract_line_candidates(images)
    logger.info("business_card_ocr.timing paddle_ocr lines=%s elapsed=%.3fs", len(ocr_candidates), time.perf_counter() - step_started_at)

    step_started_at = time.perf_counter()
    ocr_candidates = _consolidate_similar_candidates(ocr_candidates)
    logger.info(
        "business_card_ocr.timing consolidate lines=%s elapsed=%.3fs",
        len(ocr_candidates),
        time.perf_counter() - step_started_at,
    )
    ocr_lines = [candidate.text for candidate in ocr_candidates]
    raw_text = "\n".join(ocr_lines).strip() or None

    output = BusinessCardPaddleOutput(
        raw_text=raw_text,
        lines=[
            BusinessCardOcrLine(
                text=candidate.text,
                line_index=index,
                top=candidate.top,
                left=candidate.left,
                width=candidate.width,
                height=candidate.height,
            )
            for index, candidate in enumerate(ocr_candidates)
        ],
    )
    logger.info("business_card_ocr.timing paddle_output_total elapsed=%.3fs", time.perf_counter() - started_at)
    return output


def analyze_business_card(_: str | None, __: str | None, image_bytes: bytes) -> BusinessCardOcrResponse:
    started_at = time.perf_counter()
    step_started_at = time.perf_counter()
    paddle_output = extract_business_card_paddle_output(_, __, image_bytes)
    logger.info("business_card_ocr.timing extract_paddle_output elapsed=%.3fs", time.perf_counter() - step_started_at)
    ocr_lines = [line.text for line in paddle_output.lines]

    if not ocr_lines:
        logger.info("business_card_ocr.timing analyze_total lines=0 elapsed=%.3fs", time.perf_counter() - started_at)
        return BusinessCardOcrResponse(raw_text=paddle_output.raw_text)

    step_started_at = time.perf_counter()
    model_fields = predict_business_card_fields(ocr_lines)
    logger.info(
        "business_card_ocr.timing field_classifier input_lines=%s output_fields=%s elapsed=%.3fs",
        len(ocr_lines),
        len(model_fields),
        time.perf_counter() - step_started_at,
    )

    step_started_at = time.perf_counter()
    response = BusinessCardOcrResponse(
        company_name=model_fields.get("company_name"),
        contact_name=_normalize_contact_name(model_fields.get("contact_name")),
        department=_first_model_field(model_fields, "department", "department_name") or _infer_department(ocr_lines, model_fields),
        role=_first_model_field(model_fields, "role", "responsibility"),
        position=model_fields.get("position") or _infer_position(ocr_lines, model_fields),
        address=model_fields.get("address"),
        email=_normalize_model_email(model_fields.get("email")),
        mobile=_normalize_model_phone(_first_model_field(model_fields, "mobile", "mobile_phone")),
        phone=_normalize_model_phone(_first_model_field(model_fields, "phone", "office_phone")),
        fax=_normalize_model_phone(_first_model_field(model_fields, "fax", "fax_phone")),
        raw_text=paddle_output.raw_text,
    )
    logger.info("business_card_ocr.timing postprocess elapsed=%.3fs", time.perf_counter() - step_started_at)
    logger.info("business_card_ocr.timing analyze_total lines=%s elapsed=%.3fs", len(ocr_lines), time.perf_counter() - started_at)
    return response


def _first_model_field(model_fields: dict[str, str], *field_names: str) -> str | None:
    for field_name in field_names:
        value = model_fields.get(field_name)
        if value:
            return value
    return None


def _normalize_model_email(value: str | None) -> str | None:
    if value is None:
        return None
    return _extract_email([value]) or value


def _normalize_contact_name(value: str | None) -> str | None:
    if value is None:
        return None

    candidate = re.sub(r"\s+", " ", value).strip()
    candidate = _strip_position_from_name(candidate)
    hangul_only = re.sub(r"\s+", "", candidate)
    if HANGUL_NAME_PATTERN.fullmatch(hangul_only):
        return hangul_only
    return candidate or None


def _strip_position_from_name(value: str) -> str:
    compact_value = re.sub(r"\s+", "", value)
    for title in sorted(KOREAN_POSITION_TITLES, key=len, reverse=True):
        if compact_value.startswith(title):
            remainder = compact_value[len(title) :]
            if HANGUL_NAME_PATTERN.fullmatch(remainder):
                return remainder
        if compact_value.endswith(title):
            remainder = compact_value[: -len(title)]
            if HANGUL_NAME_PATTERN.fullmatch(remainder):
                return remainder
    return value


def _infer_position(lines: list[str], model_fields: dict[str, str]) -> str | None:
    contact_name = _normalize_contact_name(model_fields.get("contact_name"))
    for line in lines:
        candidate = _clean_text(line)
        if _is_selected_model_value(candidate, model_fields, exclude_fields={"position"}):
            continue
        position = _extract_position_title(candidate, contact_name)
        if position is not None:
            return position
    return None


def _extract_position_title(value: str, contact_name: str | None = None) -> str | None:
    compact_value = re.sub(r"\s+", "", value)
    for title in sorted(KOREAN_POSITION_TITLES, key=len, reverse=True):
        if compact_value == title:
            return title
        if contact_name and compact_value in {f"{contact_name}{title}", f"{title}{contact_name}"}:
            return title
    return None


def _infer_department(lines: list[str], model_fields: dict[str, str]) -> str | None:
    for line in lines:
        candidate = _clean_text(line)
        if not _looks_like_department(candidate):
            continue
        if _is_selected_model_value(candidate, model_fields, exclude_fields={"department", "department_name"}):
            continue
        return candidate
    return None


def _looks_like_department(value: str) -> bool:
    lowered = value.lower()
    if _extract_email([value]) or _normalize_model_phone(value) is not None:
        return False
    if lowered.startswith("www.") or "://" in lowered:
        return False
    if re.search(r"\d", value):
        return False
    if _extract_position_title(value) is not None:
        return False
    if HANGUL_NAME_PATTERN.fullmatch(re.sub(r"\s+", "", value)):
        return False
    if any(keyword in lowered for keyword in DEPARTMENT_KEYWORDS[:6]):
        return True
    if any(keyword in value for keyword in DEPARTMENT_KEYWORDS[6:]):
        return True
    alpha_count = sum(char.isalpha() for char in value)
    return bool(alpha_count >= 5 and re.search(r"[&/]", value))


def _is_selected_model_value(value: str, model_fields: dict[str, str], *, exclude_fields: set[str]) -> bool:
    normalized_value = _normalize_similarity_text(value)
    for field_name, field_value in model_fields.items():
        if field_name in exclude_fields:
            continue
        if normalized_value and normalized_value == _normalize_similarity_text(field_value):
            return True
    return False


def _normalize_model_phone(value: str | None) -> str | None:
    if value is None:
        return None

    normalized_candidate = _normalize_phone_candidate(value)
    normalized = _normalize_phone(normalized_candidate)
    if normalized is not None:
        return normalized

    for match in PHONE_PATTERN.findall(normalized_candidate):
        normalized = _normalize_phone(match)
        if normalized is not None:
            return normalized
    return None


def _load_image_variants(image_bytes: bytes) -> list[np.ndarray]:
    with Image.open(io.BytesIO(image_bytes)) as image:
        normalized = ImageOps.exif_transpose(image).convert("RGB")
        width, height = normalized.size
        max_side = max(width, height)
        if max_side > 960:
            scale = 960 / max_side
            normalized = normalized.resize((int(width * scale), int(height * scale)))
        elif max_side < 720:
            scale = 720 / max_side
            normalized = normalized.resize((int(width * scale), int(height * scale)))

        grayscale = ImageOps.grayscale(normalized)
        high_contrast = ImageOps.autocontrast(grayscale)
        sharpened = high_contrast.filter(ImageFilter.SHARPEN)
        boosted = ImageEnhance.Contrast(high_contrast).enhance(1.5)
        thresholded = boosted.point(lambda value: 255 if value > 170 else 0)

        variants = [
            normalized,
            high_contrast.convert("RGB"),
        ]
        return [np.array(variant) for variant in variants]


@lru_cache(maxsize=1)
def _get_ocr_engine() -> Any:
    try:
        # On some Windows environments PaddleOCR reaches torch through
        # albumentations and fails to load DLLs unless torch is imported first.
        import torch  # noqa: F401
        from paddleocr import PaddleOCR
    except ImportError as exc:
        raise RuntimeError("PaddleOCR is not installed. Add paddleocr and paddlepaddle to the AI service.") from exc

    try:
        return PaddleOCR(
            text_detection_model_name="PP-OCRv5_mobile_det",
            text_recognition_model_name="korean_PP-OCRv5_mobile_rec",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            text_recognition_batch_size=6,
        )
    except TypeError:
        return PaddleOCR(lang="korean", use_angle_cls=True)


def _extract_line_candidates(images: list[np.ndarray]) -> list[OCRLine]:
    started_at = time.perf_counter()
    ocr_engine = _get_ocr_engine()
    logger.info("business_card_ocr.timing get_ocr_engine elapsed=%.3fs", time.perf_counter() - started_at)
    merged_lines: list[OCRLine] = []
    failures: list[str] = []

    for index, image in enumerate(images):
        variant_started_at = time.perf_counter()
        try:
            results = ocr_engine.predict(image)
            parsed_lines = _parse_predict_results(results)
            merged_lines.extend(parsed_lines)
            logger.info(
                "business_card_ocr.timing paddle_variant index=%s method=predict lines=%s elapsed=%.3fs",
                index,
                len(parsed_lines),
                time.perf_counter() - variant_started_at,
            )
            continue
        except AttributeError:
            pass
        except Exception as exc:
            failures.append(f"predict(): {exc}")

        try:
            legacy_results = ocr_engine.ocr(image, cls=True)
            parsed_lines = _parse_legacy_results(legacy_results)
            merged_lines.extend(parsed_lines)
            logger.info(
                "business_card_ocr.timing paddle_variant index=%s method=ocr lines=%s elapsed=%.3fs",
                index,
                len(parsed_lines),
                time.perf_counter() - variant_started_at,
            )
        except Exception as exc:
            failures.append(f"ocr(): {exc}")

    normalize_started_at = time.perf_counter()
    lines = _normalize_candidates(merged_lines)
    logger.info(
        "business_card_ocr.timing normalize_candidates before=%s after=%s elapsed=%.3fs",
        len(merged_lines),
        len(lines),
        time.perf_counter() - normalize_started_at,
    )
    if lines:
        return lines

    if failures:
        raise RuntimeError(
            "PaddleOCR inference failed for all preprocessing variants. "
            + " / ".join(failures[:3])
        )

    return []


def _parse_predict_results(results: Any) -> list[OCRLine]:
    texts: list[str] = []
    _collect_texts(results, texts)
    return _normalize_candidates([OCRLine(text=text, order=index) for index, text in enumerate(texts)])


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


def _parse_legacy_results(results: Any) -> list[OCRLine]:
    texts: list[OCRLine] = []
    if not isinstance(results, list):
        return texts

    order = 0
    for page in results:
        if not isinstance(page, list):
            continue
        for line in page:
            if not isinstance(line, list) or len(line) < 2:
                continue
            recognition = line[1]
            if isinstance(recognition, (list, tuple)) and recognition:
                geometry = line[0] if line else None
                left, top, width, height = _extract_box_metrics(geometry)
                texts.append(
                    OCRLine(
                        text=str(recognition[0]),
                        order=order,
                        top=top,
                        left=left,
                        width=width,
                        height=height,
                    )
                )
                order += 1
    return _normalize_candidates(texts)


def _normalize_candidates(lines: list[OCRLine]) -> list[OCRLine]:
    normalized: list[OCRLine] = []
    seen: set[str] = set()

    for line in sorted(lines, key=_candidate_sort_key):
        cleaned = _clean_text(line.text)
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        normalized.append(
            OCRLine(
                text=cleaned,
                order=len(normalized),
                top=line.top,
                left=line.left,
                width=line.width,
                height=line.height,
            )
        )

    return normalized



def _consolidate_similar_candidates(candidates: list[OCRLine]) -> list[OCRLine]:
    consolidated: list[OCRLine] = []

    for candidate in candidates:
        merged = False
        for index, existing in enumerate(consolidated):
            if not _should_merge_candidates(existing.text, candidate.text):
                continue
            preferred = _prefer_candidate_text(existing.text, candidate.text)
            consolidated[index] = OCRLine(
                text=preferred,
                order=min(existing.order, candidate.order),
                top=min(_safe_metric(existing.top, existing.order), _safe_metric(candidate.top, candidate.order)),
                left=min(_safe_metric(existing.left, 0), _safe_metric(candidate.left, 0)),
                width=max(_safe_metric(existing.width, 0), _safe_metric(candidate.width, 0)) or None,
                height=max(_safe_metric(existing.height, 0), _safe_metric(candidate.height, 0)) or None,
            )
            merged = True
            break
        if not merged:
            consolidated.append(candidate)

    return sorted(consolidated, key=_candidate_sort_key)


def _safe_metric(value: float | None, fallback: float) -> float:
    return value if value is not None else fallback


def _should_merge_candidates(left: str, right: str) -> bool:
    left_normalized = _normalize_similarity_text(left)
    right_normalized = _normalize_similarity_text(right)
    if not left_normalized or not right_normalized:
        return False
    if left_normalized.isdigit() and right_normalized.isdigit():
        return False
    if _looks_like_phone_like_text(left) and _looks_like_phone_like_text(right):
        return False
    if left_normalized == right_normalized:
        return True
    if min(len(left_normalized), len(right_normalized)) < 3:
        return False
    distance = _levenshtein_distance(left_normalized, right_normalized)
    return distance <= 1


def _looks_like_phone_like_text(value: str) -> bool:
    digits = re.sub(r"\D", "", value)
    return 9 <= len(digits) <= 12


def _normalize_similarity_text(value: str) -> str:
    text = re.sub(r"[\s\[\]\(\)'`:.,\-_/]", "", value.lower())
    return text


def _prefer_candidate_text(left: str, right: str) -> str:
    left_score = _candidate_text_quality_score(left)
    right_score = _candidate_text_quality_score(right)
    if right_score > left_score:
        return right
    return left


def _candidate_text_quality_score(value: str) -> int:
    score = len(value)
    if CORPORATE_MARKER_PATTERN.search(value):
        score += 8
    if HANGUL_NAME_PATTERN.fullmatch(value):
        score += 4
    if re.search(r"\d", value):
        score -= 4
    if len(value.strip()) <= 1:
        score -= 10
    return score


def _levenshtein_distance(left: str, right: str) -> int:
    if left == right:
        return 0
    if not left:
        return len(right)
    if not right:
        return len(left)

    previous = list(range(len(right) + 1))
    for i, left_char in enumerate(left, start=1):
        current = [i]
        for j, right_char in enumerate(right, start=1):
            insert_cost = current[j - 1] + 1
            delete_cost = previous[j] + 1
            replace_cost = previous[j - 1] + (left_char != right_char)
            current.append(min(insert_cost, delete_cost, replace_cost))
        previous = current
    return previous[-1]


def _candidate_sort_key(line: OCRLine) -> tuple[float, float, int]:
    top = line.top if line.top is not None else float(line.order)
    left = line.left if line.left is not None else 0.0
    return (top, left, line.order)


def _clean_text(value: str) -> str:
    cleaned = str(value).replace("\u200b", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" |")
    return cleaned.replace(" ,", ",").replace(" .", ".").replace(" :", ":")


def _extract_box_metrics(geometry: Any) -> tuple[float | None, float | None, float | None, float | None]:
    if not isinstance(geometry, (list, tuple)) or not geometry:
        return None, None, None, None

    points: list[tuple[float, float]] = []
    for point in geometry:
        if not isinstance(point, (list, tuple)) or len(point) < 2:
            continue
        try:
            x = float(point[0])
            y = float(point[1])
        except (TypeError, ValueError):
            continue
        points.append((x, y))

    if not points:
        return None, None, None, None

    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    left = min(xs)
    top = min(ys)
    width = max(xs) - left
    height = max(ys) - top
    return left, top, width, height


def _extract_email(lines: list[str]) -> str | None:
    best_match: str | None = None
    best_score: tuple[int, int] | None = None

    for line in lines:
        candidate = _normalize_email_candidate(line)
        if "@" not in candidate and "email" in candidate.lower():
            continue
        match = EMAIL_PATTERN.search(candidate)
        if match:
            email = match.group(0)
            local_part = email.split("@", 1)[0]
            score = (len(local_part), len(email))
            if best_score is None or score > best_score:
                best_match = email
                best_score = score
    return best_match


def _normalize_phone(value: str) -> str | None:
    digits = re.sub(r"\D", "", value)

    if digits.startswith("820") and len(digits) in {12, 13}:
        digits = "0" + digits[3:]
    elif digits.startswith("82") and len(digits) in {11, 12, 13}:
        digits = "0" + digits[2:]

    if len(digits) < 9 or len(digits) > 11:
        return None

    if len(digits) == 11:
        return f"{digits[:3]}-{digits[3:7]}-{digits[7:]}"
    if len(digits) == 10:
        if digits.startswith("02"):
            return f"{digits[:2]}-{digits[2:6]}-{digits[6:]}"
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    if len(digits) == 9 and digits.startswith("02"):
        return f"{digits[:2]}-{digits[2:5]}-{digits[5:]}"
    return digits


def _normalize_email_candidate(value: str) -> str:
    candidate = EMAIL_LABEL_PATTERN.sub("", value.strip())
    candidate = candidate.replace(" ", "")
    candidate = candidate.replace("짤", "@").replace("(a)", "@")
    candidate = candidate.replace("co,kr", "co.kr").replace("cokr", "co.kr").replace("co kr", "co.kr")
    candidate = candidate.replace("[", "").replace("]", "").replace("|", "").replace("!", "")
    candidate = re.sub(
        r"(?i)([a-z0-9._%+-]{3,})(?:to|ta|tn)(?=(naver|gmail|daum|kakao|hotmail|outlook|yahoo)(com|net|org|co\.kr|kr)$)",
        r"\1@",
        candidate,
    )
    candidate = re.sub(
        r"(?i)@(?P<domain>naver|gmail|daum|kakao|hotmail|outlook|yahoo)(?P<tld>com|net|org|co\.kr|kr)$",
        lambda match: f"@{match.group('domain').lower()}.{'co.kr' if match.group('tld').lower() == 'kr' else match.group('tld').lower()}",
        candidate,
    )
    candidate = candidate.replace("agmailcom", "@gmail.com").replace("agmail", "@gmail")
    candidate = candidate.replace("akoreakr", "@korea.kr").replace("koreakr", "@korea.kr")
    candidate = candidate.replace("dnavercom", "@naver.com").replace("anavercom", "@naver.com")
    candidate = candidate.replace("gnavercom", "@naver.com").replace("navercom", "@naver.com")
    candidate = candidate.replace("gmailcom", "@gmail.com").replace("daumcom", "@daum.net")
    fallback_match = EMAIL_FALLBACK_PATTERN.search(candidate.lower())
    if "@" not in candidate and fallback_match:
        tld = fallback_match.group("tld")
        if tld == "kr":
            tld = "co.kr"
        candidate = f"{fallback_match.group('local')}@{fallback_match.group('domain')}.{tld}"
    return candidate


def _normalize_phone_candidate(value: str) -> str:
    candidate = PHONE_LABEL_PATTERN.sub("", value.strip())
    candidate = candidate.replace("O", "0").replace("o", "0")
    candidate = candidate.replace("[", "").replace("]", "").replace("(", "").replace(")", "")
    candidate = candidate.replace("|", "1")
    return candidate


