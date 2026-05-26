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
    # 업로드된 이미지 파일을 먼저 검증하고, OCR 서비스가 사용할 원본 바이트를 준비한다.
    image_bytes = await _read_image_file(file)

    try:
        # PaddleOCR/이미지 처리는 CPU 작업이므로 이벤트 루프를 막지 않도록 스레드풀에서 실행한다.
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
    # PaddleOCR 원본 결과 확인용 엔드포인트도 동일한 이미지 검증 절차를 사용한다.
    image_bytes = await _read_image_file(file)

    try:
        # 서비스 함수는 동기 함수이므로 FastAPI의 스레드풀 헬퍼로 감싸 비동기 엔드포인트와 연결한다.
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
    # OCR 대상은 이미지로 제한해 잘못된 파일이 서비스 계층까지 내려가지 않도록 한다.
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="image file only")

    image_bytes = await file.read()
    # 빈 파일과 과도하게 큰 파일은 처리 비용과 오류를 줄이기 위해 API 경계에서 차단한다.
    if not image_bytes:
        raise HTTPException(status_code=400, detail="empty file")
    if MAX_IMAGE_BYTES > 0 and len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="file too large")

    return image_bytes
