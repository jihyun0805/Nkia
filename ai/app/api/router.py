from fastapi import APIRouter
from app.api.ocr import router as ocr_router

api_router = APIRouter()
api_router.include_router(ocr_router)