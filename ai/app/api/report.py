# 인수인계: 경영 리포트 생성 API입니다. 검색 근거를 모아 보고서형 답변을 만드는 서비스에 위임합니다.
# 핵심 흐름: 일반 챗봇 답변보다 긴 요약/기간 분석이 필요할 때 별도 schema를 사용합니다.
# 같이 확인: 리포트 출력 구조 변경 시 schemas/report.py와 services/management_report_service.py를 같이 확인하세요.
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
            analytics_context=request_body.analytics_context,
            embedder=embedder,
            user_context=request_body.user_context,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Unexpected error in /management-report: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
