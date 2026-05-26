# 인수인계 메모: 챗봇 서비스 계층입니다. 색인, 검색, 근거 선별, 답변 생성, 추천/비교 등 실제 업무 로직이 모여 있습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.services.attachment_text_extractor import AttachmentExtractionResult, extract_attachment_text


RFP_DOCUMENT_EXTENSIONS = {
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "hwp",
    "hwpx",
    "txt",
    "md",
    "markdown",
}


@dataclass(frozen=True)
class RfpDocumentText:
    file_name: str
    extension: str
    file_type: str
    text: str


def convert_rfp_document_to_text(
    *,
    filename: str | None,
    content_type: str | None,
    file_bytes: bytes,
) -> RfpDocumentText:
    safe_filename = normalize_rfp_filename(filename)
    extension = Path(safe_filename).suffix.lower().lstrip(".")
    if extension not in RFP_DOCUMENT_EXTENSIONS:
        raise RuntimeError(
            "지원하지 않는 RFP 문서 형식입니다. "
            "지원 형식: pdf, doc, docx, ppt, pptx, hwp, hwpx, txt, md"
        )

    extraction = extract_attachment_text(
        filename=safe_filename,
        content_type=content_type,
        file_bytes=file_bytes,
    )
    return build_rfp_document_text(filename=safe_filename, extraction=extraction)


def normalize_rfp_filename(filename: str | None) -> str:
    if filename and filename.strip():
        return filename.strip()
    return "rfp-document"


def build_rfp_document_text(*, filename: str, extraction: AttachmentExtractionResult) -> RfpDocumentText:
    return RfpDocumentText(
        file_name=filename,
        extension=extraction.extension,
        file_type=extraction.file_type,
        text=extraction.text,
    )
