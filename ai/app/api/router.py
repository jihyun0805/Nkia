from fastapi import APIRouter

from app.api.indexing import router as indexing_router

api_router = APIRouter()
api_router.include_router(indexing_router)
