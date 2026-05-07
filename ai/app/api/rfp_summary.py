import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.core.security import require_internal_token
from app.schemas.rfp_summary import RfpSummaryResponse
from app.services.rfp_summary_service import generate_rfp_summary


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rfp", tags=["RFP"], dependencies=[Depends(require_internal_token)])


@router.post("/summary", response_model=RfpSummaryResponse, summary="Generate a short AI summary from an RFP document")
async def generate_rfp_summary_endpoint(file: UploadFile = File(...)) -> RfpSummaryResponse:
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="empty file")

    try:
        return await run_in_threadpool(
            generate_rfp_summary,
            filename=file.filename,
            content_type=file.content_type,
            file_bytes=file_bytes,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error while generating RFP summary: %s", exc)
        raise HTTPException(status_code=500, detail="RFP summary generation failed.") from exc
