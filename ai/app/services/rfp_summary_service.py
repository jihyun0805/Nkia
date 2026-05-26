# 인수인계: RFP 파일 읽기, 텍스트 변환, LLM 요약 호출을 묶는 애플리케이션 서비스입니다.
# 핵심 흐름: API 계층은 파일만 넘기고, 실제 변환 실패/요약 실패 처리는 이 파일에서 정리합니다.
# 같이 확인: LLM 요약 품질은 rfp_summary_llm.py, 파일 파싱은 rfp_document_text_converter.py를 확인하세요.
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
