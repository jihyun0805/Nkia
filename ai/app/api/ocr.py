from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.ocr import BusinessCardOcrResponse
from app.services.business_card_ocr import analyze_business_card


router = APIRouter(prefix="/ocr", tags=["OCR"])


@router.post("/business-card", response_model=BusinessCardOcrResponse)
async def analyze_business_card_endpoint(file: UploadFile = File(...)) -> BusinessCardOcrResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="image file only")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="empty file")

    try:
        return analyze_business_card(file.filename, file.content_type, image_bytes)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
