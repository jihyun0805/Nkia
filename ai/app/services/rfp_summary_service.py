# 인수인계 메모: 챗봇 서비스 계층입니다. 색인, 검색, 근거 선별, 답변 생성, 추천/비교 등 실제 업무 로직이 모여 있습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from __future__ import annotations

from app.core.config import settings
from app.schemas.rfp_summary import RfpSummaryResponse
from app.services.rfp_document_text_converter import convert_rfp_document_to_text
from app.services.rfp_summary_llm import generate_rfp_summary_with_gms


def generate_rfp_summary(*, filename: str | None, content_type: str | None, file_bytes: bytes) -> RfpSummaryResponse:
    if not settings.gms_key:
        raise RuntimeError("GMS API key is not configured.")

    document_text = convert_rfp_document_to_text(
        filename=filename,
        content_type=content_type,
        file_bytes=file_bytes,
    )
    summary = generate_rfp_summary_with_gms(
        api_key=settings.gms_key,
        url=settings.gms_chat_completions_url,
        model=settings.gms_chat_model,
        timeout_seconds=settings.gms_timeout_seconds,
        filename=document_text.file_name,
        text=document_text.text,
    )

    return RfpSummaryResponse(
        fileName=document_text.file_name,
        extension=document_text.extension,
        fileType=document_text.file_type,
        extractedTextChars=len(document_text.text),
        extractedText=document_text.text,
        summary=summary,
    )
