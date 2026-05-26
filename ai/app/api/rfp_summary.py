# 인수인계 메모: FastAPI 엔드포인트 계층입니다. 백엔드에서 들어온 요청을 서비스 계층으로 넘기고 응답 스키마로 감쌉니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
    # 업로드 파일은 서비스 계층에서 파싱할 수 있도록 전체 바이트로 읽는다.
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="empty file")

    try:
        # 문서 파싱과 LLM 요약 처리는 동기 작업이므로 스레드풀에서 실행해 요청 처리 루프를 보호한다.
        return await run_in_threadpool(
            generate_rfp_summary,
            filename=file.filename,
            content_type=file.content_type,
            file_bytes=file_bytes,
        )
    except RuntimeError as exc:
        # 지원하지 않는 파일 형식이나 요약 생성 실패처럼 사용자 입력과 관련된 오류를 400으로 전달한다.
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        # 그 밖의 예외는 서버 내부 오류로 기록하고, 상세 구현 정보는 응답에 노출하지 않는다.
        logger.exception("Unexpected error while generating RFP summary: %s", exc)
        raise HTTPException(status_code=500, detail="RFP summary generation failed.") from exc
