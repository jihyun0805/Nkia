# 인수인계: AI 서버의 FastAPI 라우터 조립 파일입니다. answer/search/indexing/ocr/report 계열 라우터 prefix를 여기서 묶습니다.
# 핵심 흐름: 새 API를 추가해도 main.py는 이 router만 include하므로, 운영 노출 여부는 여기 등록으로 결정됩니다.
# 같이 확인: 백엔드 프록시가 호출하는 경로와 prefix가 어긋나지 않게 backend chatbot controller/service를 같이 확인하세요.
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
