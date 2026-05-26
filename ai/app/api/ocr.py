# 인수인계: 명함 OCR 테스트/운영 엔드포인트입니다. 이미지 파일을 읽어 OCR 결과와 필드 분류 결과를 반환합니다.
# 핵심 흐름: 파일 크기와 이미지 여부를 먼저 검증한 뒤 business_card_ocr 서비스로 넘깁니다.
# 같이 확인: OCR 모델 교체 시 services/business_card_ocr.py와 business_card_field_classifier.py를 같이 확인하세요.
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import UnidentifiedImageError

from app.schemas.ocr import BusinessCardOcrResponse, BusinessCardPaddleOutput
from app.services.business_card_ocr import analyze_business_card, extract_business_card_paddle_output


router = APIRouter(prefix="/ocr", tags=["OCR"])
MAX_IMAGE_BYTES = 50 * 1024 * 1024


@router.post("/business-card", response_model=BusinessCardOcrResponse)
async def analyze_business_card_endpoint(file: UploadFile = File(...)) -> BusinessCardOcrResponse:
    image_bytes = await _read_image_file(file)

    try:
        return await run_in_threadpool(
            analyze_business_card,
            file.filename,
            file.content_type,
            image_bytes,
        )
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="invalid image file") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/business-card/paddle-output", response_model=BusinessCardPaddleOutput)
async def extract_business_card_paddle_output_endpoint(file: UploadFile = File(...)) -> BusinessCardPaddleOutput:
    image_bytes = await _read_image_file(file)

    try:
        return await run_in_threadpool(
            extract_business_card_paddle_output,
            file.filename,
            file.content_type,
            image_bytes,
        )
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="invalid image file") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _read_image_file(file: UploadFile) -> bytes:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="image file only")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="empty file")
    if MAX_IMAGE_BYTES > 0 and len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="file too large")

    return image_bytes
