# 인수인계 메모: FastAPI 엔드포인트 계층입니다. 백엔드에서 들어온 요청을 서비스 계층으로 넘기고 응답 스키마로 감쌉니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from fastapi import APIRouter
from app.api.answer import router as answer_router
from app.api.attachments import router as attachments_router
from app.api.chat_attachments import router as chat_attachments_router
from app.api.entity_suggestions import router as entity_suggestions_router
from app.api.ocr import router as ocr_router
from app.api.report import router as report_router
from app.api.rfp_summary import router as rfp_summary_router
from app.api.search import router as search_router

from app.api.indexing import router as indexing_router

api_router = APIRouter()
api_router.include_router(search_router)
api_router.include_router(entity_suggestions_router)
api_router.include_router(answer_router)
api_router.include_router(chat_attachments_router)
api_router.include_router(attachments_router)
api_router.include_router(ocr_router)
api_router.include_router(report_router)
api_router.include_router(rfp_summary_router)
api_router.include_router(indexing_router)
