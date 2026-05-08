from fastapi import APIRouter
from app.api.answer import router as answer_router
from app.api.chat_attachments import router as chat_attachments_router
from app.api.ocr import router as ocr_router
from app.api.report import router as report_router
from app.api.rfp_summary import router as rfp_summary_router
from app.api.search import router as search_router

from app.api.indexing import router as indexing_router

api_router = APIRouter()
api_router.include_router(search_router)
api_router.include_router(answer_router)
api_router.include_router(chat_attachments_router)
api_router.include_router(ocr_router)
api_router.include_router(report_router)
api_router.include_router(rfp_summary_router)
api_router.include_router(indexing_router)
