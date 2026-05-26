# 인수인계 메모: FastAPI 엔드포인트 계층입니다. 백엔드에서 들어온 요청을 서비스 계층으로 넘기고 응답 스키마로 감쌉니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
