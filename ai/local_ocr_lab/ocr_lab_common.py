# 로컬 실험용 공통 함수
from __future__ import annotations

import json
from pathlib import Path
import sys


CURRENT_FILE = Path(__file__).resolve()
AI_ROOT = CURRENT_FILE.parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from app.services.business_card_ocr import extract_business_card_paddle_output


SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}


def collect_image_path(input_path: Path) -> Path:
    if not input_path.exists():
        raise FileNotFoundError(f"Input path does not exist: {input_path}")

    if not input_path.is_file():
        raise ValueError(f"Input path must be an image file: {input_path}")

    if input_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported image extension: {input_path.suffix}")

    return input_path


def run_ocr(image_path: Path) -> dict[str, object | None]:
    image_bytes = image_path.read_bytes()
    result = extract_business_card_paddle_output(image_path.name, None, image_bytes)
    return result.model_dump()


def write_json(output_path: Path, payload: dict[str, object]) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return output_path
