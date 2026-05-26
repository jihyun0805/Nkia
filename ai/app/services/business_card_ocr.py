# 인수인계 메모: 챗봇 서비스 계층입니다. 색인, 검색, 근거 선별, 답변 생성, 추천/비교 등 실제 업무 로직이 모여 있습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
EMAIL_LABEL_PATTERN = re.compile(
    r"^(?:(?:e-?mail|mail)\s*[.:：]?\s*|e\s*[.:：]\s*|e\s+(?=[a-z0-9._%+-]+\s*@?))",
    re.IGNORECASE,
)
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
ENGLISH_POSITION_TITLES = (
    "Senior Product Manager",
    "Senior Project Manager",
    "Principal Engineer",
    "Senior Consultant",
    "Senior Manager",
    "Product Manager",
    "Project Manager",
    "Staff Engineer",
    "Lead Engineer",
    "Consultant",
    "Specialist",
    "Coordinator",
    "Director",
    "Engineer",
    "Analyst",
    "Manager",
    "Lead",
    "Head",
    "VP",
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
ADDRESS_DETAIL_KEYWORDS = (
    "동",
    "로",
    "길",
    "빌딩",
    "타워",
    "층",
    "호",
    "센터",
    "단지",
)
ROLE_MARKETING_KEYWORDS = (
    "provider",
    "partner",
    "planner",
    "planners",
    "trustable",
    "global",
)


@dataclass(frozen=True)
class OCRLine:
    # 내부 후처리에서 쓰는 OCR 라인 모델로, 텍스트와 정렬용 좌표를 함께 보관한다.
    text: str
    order: int
    top: float | None = None
    left: float | None = None
    width: float | None = None
    height: float | None = None


def extract_business_card_paddle_output(_: str | None, __: str | None, image_bytes: bytes) -> BusinessCardPaddleOutput:
    # 이미지 전처리, OCR 실행, 중복 라인 병합까지만 수행해 PaddleOCR 관찰용 응답을 만든다.
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
    # OCR 결과를 BERT 필드 분류와 규칙 기반 보정 로직으로 명함 필드 응답에 매핑한다.
    started_at = time.perf_counter()
    step_started_at = time.perf_counter()
    paddle_output = extract_business_card_paddle_output(_, __, image_bytes)
    logger.info("business_card_ocr.timing extract_paddle_output elapsed=%.3fs", time.perf_counter() - step_started_at)
    ocr_lines = [line.text for line in paddle_output.lines]

    if not ocr_lines:
        # OCR 텍스트가 없으면 후처리 없이 원문만 담아 반환한다.
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
    contact_name = _normalize_contact_name(model_fields.get("contact_name")) or _infer_contact_name(ocr_lines, model_fields)
    split_position, split_department = _infer_split_position_department(ocr_lines)
    # 모델 결과가 비어 있거나 애매한 필드는 명함 레이아웃/문자 패턴 기반 추론으로 보완한다.
    department = _normalize_department(model_fields.get("department")) or split_department or _infer_department(ocr_lines, model_fields)
    mobile, phone = _normalize_contact_phones(
        mobile_value=model_fields.get("mobile"),
        phone_value=model_fields.get("phone"),
    )
    fallback_mobile, fallback_phone = _extract_contact_phones(ocr_lines)
    mobile = mobile or fallback_mobile
    phone = phone or fallback_phone
    response = BusinessCardOcrResponse(
        company_name=_normalize_company_name(model_fields.get("company_name")) or _infer_company_name(ocr_lines, model_fields),
        contact_name=contact_name,
        department=department,
        role=_normalize_role(model_fields.get("role")),
        position=model_fields.get("position") or split_position or _infer_position(ocr_lines, model_fields, contact_name),
        address=model_fields.get("address"),
        email=_normalize_model_email(model_fields.get("email")) or _extract_email(ocr_lines),
        mobile=mobile,
        phone=phone,
        fax=_normalize_model_phone(model_fields.get("fax")) or _extract_labeled_phone(ocr_lines, labels=("fax", "facsimile", "f", "팩스")),
        raw_text=paddle_output.raw_text,
    )
    logger.info("business_card_ocr.timing postprocess elapsed=%.3fs", time.perf_counter() - step_started_at)
    logger.info("business_card_ocr.timing analyze_total lines=%s elapsed=%.3fs", len(ocr_lines), time.perf_counter() - started_at)
    return response


def _normalize_model_email(value: str | None) -> str | None:
    if value is None:
        return None
    return _extract_email([value]) or value


def _normalize_company_name(value: str | None) -> str | None:
    if value is None:
        return None
    candidate = _clean_text(value)
    if not candidate:
        return None
    lowered = candidate.lower()
    if lowered.startswith("www.") or "://" in lowered:
        return None
    if _extract_email([candidate]) or _normalize_model_phone(candidate) is not None:
        return None
    meaningful_count = len(re.findall(r"[A-Za-z0-9가-힣]", candidate))
    if meaningful_count < 2:
        return None
    special_count = sum(not char.isalnum() and not char.isspace() for char in candidate)
    if special_count / max(len(candidate), 1) > 0.4 and not CORPORATE_MARKER_PATTERN.search(candidate):
        return None
    return candidate


def _infer_company_name(lines: list[str], model_fields: dict[str, str]) -> str | None:
    # 모델이 놓친 회사명은 법인 표기나 이미 선택된 필드와의 중복 여부를 기준으로 추론한다.
    corporate_pattern = re.compile(r"(?i)(주식회사|\(주\)|㈜|inc\.?|corp\.?|co\.?|ltd\.?|company)")
    for line in lines:
        candidate = _normalize_company_name(line)
        if candidate is None:
            continue
        if not corporate_pattern.search(candidate):
            continue
        if _is_selected_model_value(candidate, model_fields, exclude_fields={"company_name"}):
            continue
        return candidate
    return None


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
    name, _ = _split_korean_name_position(value)
    if name is not None:
        return name
    return value


def _infer_contact_name(lines: list[str], model_fields: dict[str, str]) -> str | None:
    # 이름 후보는 직책/연락처/이메일로 이미 선택된 라인을 제외하고 짧은 한글 이름 패턴에서 찾는다.
    for line in lines:
        candidate = _clean_text(line)
        if _is_selected_model_value(candidate, model_fields, exclude_fields={"contact_name", "position"}):
            continue
        name, _ = _split_korean_name_position(candidate)
        if name is not None:
            return name
        compact_candidate = re.sub(r"\s+", "", candidate)
        if HANGUL_NAME_PATTERN.fullmatch(compact_candidate) and not _extract_position_title(compact_candidate):
            return compact_candidate
    return None


def _infer_position(lines: list[str], model_fields: dict[str, str], contact_name: str | None = None) -> str | None:
    # 직책은 한글 직급명, 영문 title, 이름+직책 결합 라인을 순서대로 검사한다.
    contact_name = contact_name or _normalize_contact_name(model_fields.get("contact_name"))
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
    _, split_position = _split_korean_name_position(value)
    if split_position is not None:
        return split_position
    english_position = _extract_english_position_title(value)
    if english_position is not None:
        return english_position
    for title in sorted(KOREAN_POSITION_TITLES, key=len, reverse=True):
        if compact_value == title:
            return title
        if compact_value.endswith(title) and len(compact_value) > len(title):
            prefix = compact_value[: -len(title)]
            if prefix and not HANGUL_NAME_PATTERN.fullmatch(prefix):
                return title
        if contact_name and compact_value in {f"{contact_name}{title}", f"{title}{contact_name}"}:
            return title
    return None


def _extract_english_position_title(value: str) -> str | None:
    normalized = re.sub(r"\s+", " ", value).strip()
    for title in ENGLISH_POSITION_TITLES:
        if re.fullmatch(re.escape(title), normalized, re.IGNORECASE):
            return title
    return None


def _split_korean_name_position(value: str) -> tuple[str | None, str | None]:
    compact_value = re.sub(r"\s+", "", value)
    for title in sorted(KOREAN_POSITION_TITLES, key=len, reverse=True):
        if compact_value.startswith(title):
            remainder = compact_value[len(title) :]
            if HANGUL_NAME_PATTERN.fullmatch(remainder):
                return remainder, title
        if compact_value.endswith(title):
            remainder = compact_value[: -len(title)]
            if HANGUL_NAME_PATTERN.fullmatch(remainder):
                return remainder, title
    return None, None


def _infer_split_position_department(lines: list[str]) -> tuple[str | None, str | None]:
    for line in lines:
        split = _split_position_department_line(_clean_text(line))
        if split is not None:
            return split
    return None, None


def _split_position_department_line(value: str) -> tuple[str, str] | None:
    parts = [part.strip() for part in re.split(r"\s*[|/·]\s*", value) if part.strip()]
    if len(parts) < 2:
        return None

    for index, part in enumerate(parts):
        position = _extract_english_position_title(_strip_contact_name_from_segment(part))
        if position is None:
            continue
        for department_part in parts[:index] + parts[index + 1 :]:
            department = _normalize_department(_strip_contact_name_from_segment(department_part))
            if department is not None:
                return position, department
    return None


def _strip_contact_name_from_segment(value: str) -> str:
    candidate = re.sub(r"\s+", " ", value).strip()
    tokens = candidate.split()
    if len(tokens) <= 1:
        return candidate
    without_hangul_name = [token for token in tokens if not HANGUL_NAME_PATTERN.fullmatch(re.sub(r"\s+", "", token))]
    if without_hangul_name and len(without_hangul_name) != len(tokens):
        return " ".join(without_hangul_name).strip()
    return candidate


def _infer_department(lines: list[str], model_fields: dict[str, str]) -> str | None:
    # 부서 후보는 주소/직책/연락처처럼 다른 필드로 보이는 라인을 제외하고 고른다.
    for line in lines:
        candidate = _clean_text(line)
        if not _looks_like_department(candidate):
            continue
        if _is_selected_model_value(candidate, model_fields, exclude_fields={"department"}):
            continue
        return candidate
    return None


def _normalize_department(value: str | None) -> str | None:
    if value is None:
        return None
    candidate = _clean_text(value)
    if not _looks_like_department(candidate):
        return None
    return candidate


def _normalize_role(value: str | None) -> str | None:
    if value is None:
        return None
    candidate = _clean_text(value)
    if not candidate:
        return None
    if _extract_email([candidate]) or _normalize_model_phone(candidate) is not None:
        return None
    if _looks_like_address_detail(candidate):
        return None
    if _looks_like_marketing_phrase(candidate):
        return None
    if _extract_position_title(candidate) is not None:
        return None
    return candidate


def _looks_like_department(value: str) -> bool:
    lowered = value.lower()
    if _extract_email([value]) or _normalize_model_phone(value) is not None:
        return False
    if lowered.startswith("www.") or "://" in lowered:
        return False
    if _looks_like_address_detail(value):
        return False
    if _looks_like_marketing_phrase(value):
        return False
    if _extract_position_title(value) is not None:
        return False
    if HANGUL_NAME_PATTERN.fullmatch(re.sub(r"\s+", "", value)):
        return False
    if re.search(r"(?i)\b(product|platform|strategy|innovation|sales|success|security|service|cloud|data|dx|ax|ai|r&d)\b", value):
        return True
    if re.search(r"\d", value):
        return False
    if any(keyword in lowered for keyword in DEPARTMENT_KEYWORDS[:6]):
        return True
    if any(keyword in value for keyword in DEPARTMENT_KEYWORDS[6:]):
        return True
    alpha_count = sum(char.isalpha() for char in value)
    return bool(alpha_count >= 5 and re.search(r"[&/]", value))


def _looks_like_address_detail(value: str) -> bool:
    candidate = value.strip()
    compact = re.sub(r"\s+", "", candidate)
    is_wrapped = (
        (candidate.startswith("(") and candidate.endswith(")"))
        or (candidate.startswith("[") and candidate.endswith("]"))
    )
    has_address_marker = any(keyword in compact for keyword in ADDRESS_DETAIL_KEYWORDS)
    return bool(is_wrapped and has_address_marker and ("," in candidate or "·" in candidate or "-" in candidate))


def _looks_like_marketing_phrase(value: str) -> bool:
    lowered = value.lower()
    if not re.fullmatch(r"[a-z0-9&/+\-\s.]+", value, re.IGNORECASE):
        return False
    words = re.findall(r"[a-z]+", lowered)
    return bool(len(words) >= 2 and any(keyword in words for keyword in ROLE_MARKETING_KEYWORDS))


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


def _normalize_contact_phones(*, mobile_value: str | None, phone_value: str | None) -> tuple[str | None, str | None]:
    # 모델이 mobile/phone을 서로 바꿔 예측한 경우 국내 휴대폰 prefix 기준으로 재배치한다.
    mobile = _normalize_model_phone(mobile_value)
    phone = _normalize_model_phone(phone_value)

    if phone is not None and _is_mobile_phone(phone):
        if mobile is None:
            mobile = phone
        phone = None

    if mobile is not None and not _is_mobile_phone(mobile):
        if phone is None:
            phone = mobile
        mobile = None

    return mobile, phone


def _extract_contact_phones(lines: list[str]) -> tuple[str | None, str | None]:
    # 라벨이 붙은 번호를 우선 사용하고, 없으면 전체 번호 후보에서 mobile/phone을 분리한다.
    mobile = _extract_labeled_phone(lines, labels=("mobile", "cell", "cellphone", "m", "휴대폰", "휴대전화", "휴대", "핸드폰"))
    phone = _extract_labeled_phone(lines, labels=("phone", "tel", "telephone", "office", "direct", "t", "전화", "대표전화"))

    for phone_number in _extract_all_phones(lines):
        if _is_mobile_phone(phone_number):
            mobile = mobile or phone_number
        else:
            phone = phone or phone_number

    if phone is not None and mobile is not None and phone == mobile:
        phone = None

    return mobile, phone


def _extract_all_phones(lines: list[str]) -> list[str]:
    phones: list[str] = []
    seen: set[str] = set()
    for line in lines:
        if re.search(r"(?i)\b(fax|facsimile)\b|팩스", line):
            continue
        for match in PHONE_PATTERN.findall(_normalize_phone_candidate(line)):
            normalized = _normalize_phone(match)
            if normalized is None:
                continue
            digits = re.sub(r"\D", "", normalized)
            if digits in seen:
                continue
            seen.add(digits)
            phones.append(normalized)
    return phones


def _is_mobile_phone(value: str) -> bool:
    return re.sub(r"\D", "", value).startswith("010")


def _extract_labeled_phone(lines: list[str], *, labels: tuple[str, ...]) -> str | None:
    label_pattern = "|".join(re.escape(label) for label in labels)
    pattern = re.compile(rf"(?:^|[^A-Za-z가-힣])(?:{label_pattern})\s*[.:：]?\s*({PHONE_PATTERN.pattern})", re.IGNORECASE)
    for line in lines:
        match = pattern.search(line)
        if not match:
            continue
        normalized = _normalize_model_phone(match.group(1))
        if normalized is not None:
            return normalized
    return None


def _load_image_variants(image_bytes: bytes) -> list[np.ndarray]:
    # 원본, 확대, 대비 강화, 샤프닝 버전을 만들어 작은 명함 글자 인식률을 높인다.
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
    # PaddleOCR 초기화 비용이 크므로 한 번 생성한 엔진을 캐시한다.
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
    # 전처리 이미지들을 차례로 OCR에 넣고, 하나라도 충분한 라인을 얻으면 그 결과를 사용한다.
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
    # PaddleOCR 3.x predict 결과처럼 중첩 dict/list로 반환되는 텍스트를 평탄화한다.
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
    # PaddleOCR 2.x ocr 결과 형식의 좌표와 텍스트를 내부 OCRLine으로 변환한다.
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
    # 공백/기호를 정리하고 빈 문자열과 완전 중복 라인을 제거한다.
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
    # 여러 전처리 이미지에서 반복 인식된 유사 라인을 하나로 합친다.
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
    # 일반 이메일 패턴을 먼저 찾고, OCR이 @나 점을 누락한 흔한 케이스를 보정한다.
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
    # 국내 전화번호 형태로 정규화하고, 너무 짧거나 긴 숫자열은 연락처 후보에서 제외한다.
    digits = re.sub(r"\D", "", value)

    if digits.startswith("820") and len(digits) in {12, 13}:
        digits = "0" + digits[3:]
    elif digits.startswith("82") and len(digits) in {11, 12, 13}:
        digits = "0" + digits[2:]

    if len(digits) < 9 or len(digits) > 11:
        if len(digits) == 12 and re.search(r"(?<!\d)\d{4}[-.\s]\d{4}[-.\s]\d{4}(?!\d)", value):
            return f"{digits[:4]}-{digits[4:8]}-{digits[8:]}"
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
