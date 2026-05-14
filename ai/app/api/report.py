import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.security import require_internal_token
from app.embeddings.model import EmbeddingModel
from app.schemas.report import ManagementReportRequest, ManagementReportResponse
from app.services.management_report_service import create_management_report

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Report"], dependencies=[Depends(require_internal_token)])


@router.post("/management-report", response_model=ManagementReportResponse, summary="RAG 기반 경영 리포트 생성")
def management_report(request_body: ManagementReportRequest, request: Request) -> ManagementReportResponse:
    embedder: EmbeddingModel = request.app.state.embedder
    try:
        return create_management_report(
            query=request_body.query,
            title=request_body.title,
            report_type=request_body.report_type,
            limit=request_body.limit,
            source_types=request_body.source_types,
            attachment_session_id=request_body.attachment_session_id,
            start_at=request_body.start_at,
            end_at=request_body.end_at,
            customer_group=request_body.customer_group,
            business_types=request_body.business_types,
            statuses=request_body.statuses,
            sections=request_body.sections,
            audience=request_body.audience,
            embedder=embedder,
            user_context=request_body.user_context,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Unexpected error in /management-report: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
