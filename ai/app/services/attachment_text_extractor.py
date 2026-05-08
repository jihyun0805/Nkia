from __future__ import annotations

import io
import re
import struct
import zipfile
import zlib
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree as ET

ALLOWED_ATTACHMENT_EXTENSIONS = {
    "txt",
    "md",
    "markdown",
    "csv",
    "json",
    "log",
    "xml",
    "yaml",
    "yml",
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "hwp",
    "hwpx",
    "png",
    "jpg",
    "jpeg",
}
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
TEXT_EXTENSIONS = {"txt", "md", "markdown", "csv", "json", "log", "xml", "yaml", "yml"}
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg"}
CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")
WHITESPACE_PATTERN = re.compile(r"[ \t]+")
BLANK_LINE_PATTERN = re.compile(r"\n{3,}")
SINGLE_CHAR_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9가-힣]$")
HWP_PARA_TEXT_TAG = 67
PDF_OCR_MAX_PAGES = 3
PDF_OCR_TARGET_CHARS = 3_000
PDF_OCR_RENDER_SCALE = 1.0
EXTENSION_MIME_MAP = {
    "hwp": "application/x-hwp",
    "hwpx": "application/x-hwpx",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "pdf": "application/pdf",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
}


@dataclass(frozen=True)
class AttachmentExtractionResult:
    extension: str
    file_type: str
    text: str


def extract_attachment_text(*, filename: str | None, content_type: str | None, file_bytes: bytes) -> AttachmentExtractionResult:
    extension = normalize_extension(filename)
    file_type = infer_file_type(extension=extension, content_type=content_type)

    if not filename or not filename.strip():
        raise RuntimeError("파일명이 없습니다.")
    if not file_bytes:
        raise RuntimeError("빈 파일은 업로드할 수 없습니다.")
    if len(file_bytes) > MAX_ATTACHMENT_BYTES:
        raise RuntimeError("첨부파일은 10MB 이하만 지원합니다.")
    if extension not in ALLOWED_ATTACHMENT_EXTENSIONS:
        raise RuntimeError(
            "지원하지 않는 파일 형식입니다. "
            "지원 형식: txt, md, markdown, csv, json, log, xml, yaml, yml, pdf, doc, docx, ppt, pptx, hwp, hwpx, png, jpg, jpeg"
        )

    if extension in TEXT_EXTENSIONS:
        text = extract_text_file(file_bytes)
    elif extension == "pdf":
        text = extract_pdf_text(file_bytes)
    elif extension == "doc":
        text = extract_legacy_office_text(file_bytes)
    elif extension == "docx":
        text = extract_docx_text(file_bytes)
    elif extension == "ppt":
        text = extract_legacy_office_text(file_bytes)
    elif extension == "pptx":
        text = extract_pptx_text(file_bytes)
    elif extension == "hwp":
        text = extract_hwp_text(file_bytes)
    elif extension == "hwpx":
        text = extract_hwpx_text(file_bytes)
    elif extension in IMAGE_EXTENSIONS:
        text = extract_image_text_with_ocr(file_bytes)
    else:
        raise RuntimeError("지원하지 않는 파일 형식입니다.")

    normalized = normalize_extracted_text(text)
    if not normalized:
        raise RuntimeError("본문을 추출할 수 없는 파일입니다.")

    return AttachmentExtractionResult(
        extension=extension,
        file_type=file_type,
        text=normalized[:40_000],
    )


def infer_file_type(*, extension: str, content_type: str | None) -> str:
    normalized = (content_type or "").strip().lower()
    if normalized and normalized != "application/octet-stream":
        return normalized
    return EXTENSION_MIME_MAP.get(extension, "application/octet-stream")


def normalize_extension(filename: str | None) -> str:
    if not filename:
        return ""
    return Path(filename).suffix.lower().lstrip(".")


def extract_text_file(file_bytes: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp949", "euc-kr"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return file_bytes.decode("utf-8", errors="ignore")


def extract_pdf_text(file_bytes: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    text = "\n".join((page.extract_text() or "") for page in reader.pages)
    normalized = normalize_extracted_text(text)
    if normalized:
        return normalized
    return extract_pdf_text_with_ocr(file_bytes)


def extract_docx_text(file_bytes: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
        part_names = ["word/document.xml"]
        part_names.extend(sorted(name for name in archive.namelist() if name.startswith("word/header")))
        part_names.extend(sorted(name for name in archive.namelist() if name.startswith("word/footer")))
        sections = [extract_docx_xml_text(archive.read(name)) for name in part_names if name in archive.namelist()]
    return "\n".join(section for section in sections if section)


def extract_pptx_text(file_bytes: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
        part_names = sorted(name for name in archive.namelist() if name.startswith("ppt/slides/slide"))
        note_names = sorted(name for name in archive.namelist() if name.startswith("ppt/notesSlides/notesSlide"))
        sections = [extract_openxml_text(archive.read(name)) for name in [*part_names, *note_names]]
    return "\n".join(section for section in sections if section)


def extract_legacy_office_text(file_bytes: bytes) -> str:
    import olefile

    buffer = io.BytesIO(file_bytes)
    if not olefile.isOleFile(buffer):
        raise RuntimeError("구형 Office 문서 형식을 인식할 수 없습니다.")

    buffer.seek(0)
    parts: list[str] = []
    with olefile.OleFileIO(buffer) as ole:
        for entry in ole.listdir(streams=True, storages=False):
            try:
                raw = ole.openstream(entry).read()
            except OSError:
                continue
            parts.extend(extract_printable_binary_strings(raw))

    return "\n".join(dict.fromkeys(parts))


def extract_printable_binary_strings(raw: bytes) -> list[str]:
    candidates: list[str] = []
    for encoding in ("utf-16le", "cp949"):
        try:
            decoded = raw.decode(encoding, errors="ignore")
        except LookupError:
            continue
        candidates.extend(find_readable_text_runs(decoded))
    return candidates


def find_readable_text_runs(text: str) -> list[str]:
    normalized = normalize_extracted_text(text)
    if not normalized:
        return []

    runs = re.findall(r"[가-힣A-Za-z0-9][가-힣A-Za-z0-9\s\.,:;()/\[\]{}<>@#%&+\-=_'\"·ㆍ•※]{3,}", normalized)
    return [run.strip() for run in runs if is_meaningful_text_run(run)]


def is_meaningful_text_run(text: str) -> bool:
    compact = WHITESPACE_PATTERN.sub(" ", text).strip()
    if len(compact) < 4:
        return False
    readable_chars = sum(1 for char in compact if char.isalnum() or "\uac00" <= char <= "\ud7a3")
    return readable_chars >= 3


def extract_docx_xml_text(xml_bytes: bytes) -> str:
    root = ET.fromstring(xml_bytes)
    paragraphs: list[str] = []

    for paragraph in root.iter():
        local_name = paragraph.tag.split("}")[-1]
        if local_name not in {"p", "paragraph"}:
            continue

        fragments: list[str] = []
        for element in paragraph.iter():
            child_name = element.tag.split("}")[-1]
            if child_name == "tab":
                fragments.append("\t")
                continue
            if child_name == "br":
                fragments.append("\n")
                continue
            if child_name == "t" and element.text:
                fragments.append(element.text)

        paragraph_text = "".join(fragments).strip()
        if paragraph_text:
            paragraphs.append(paragraph_text)

    return "\n".join(paragraphs)


def extract_openxml_text(xml_bytes: bytes) -> str:
    root = ET.fromstring(xml_bytes)
    paragraphs: list[str] = []

    for paragraph in root.iter():
        local_name = paragraph.tag.split("}")[-1]
        if local_name not in {"p", "paragraph"}:
            continue

        fragments: list[str] = []
        for element in paragraph.iter():
            child_name = element.tag.split("}")[-1]
            if child_name == "t" and element.text:
                fragments.append(element.text)

        paragraph_text = "".join(fragments).strip()
        if paragraph_text:
            paragraphs.append(paragraph_text)

    if paragraphs:
        return "\n".join(paragraphs)

    texts = []
    for element in root.iter():
        if element.tag.endswith("}t") and element.text:
            texts.append(element.text)
    return "\n".join(texts)


def extract_hwp_text(file_bytes: bytes) -> str:
    import olefile

    buffer = io.BytesIO(file_bytes)
    if not olefile.isOleFile(buffer):
        raise RuntimeError("HWP 파일 형식을 인식할 수 없습니다.")

    buffer.seek(0)
    with olefile.OleFileIO(buffer) as ole:
        preview_text = extract_hwp_preview_text(ole)
        if preview_text:
            return preview_text

        header = ole.openstream("FileHeader").read()
        compressed = False
        if len(header) >= 40:
            flags = struct.unpack("<I", header[36:40])[0]
            compressed = bool(flags & 0x01)

        section_entries: list[tuple[int, list[str]]] = []
        for entry in ole.listdir(streams=True, storages=False):
            if len(entry) == 2 and entry[0] == "BodyText" and entry[1].startswith("Section"):
                section_no = int(re.sub(r"\D", "", entry[1]) or "0")
                section_entries.append((section_no, entry))

        if not section_entries:
            raise RuntimeError("HWP 본문 섹션을 찾을 수 없습니다.")

        parts = []
        for _, entry in sorted(section_entries, key=lambda item: item[0]):
            raw = ole.openstream(entry).read()
            section_bytes = zlib.decompress(raw, -15) if compressed else raw
            parts.extend(parse_hwp_paragraph_text(section_bytes))
    return "\n".join(parts)


def extract_hwpx_text(file_bytes: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
        if "Preview/PrvText.txt" in archive.namelist():
            preview_text = extract_text_file(archive.read("Preview/PrvText.txt"))
            if preview_text.strip():
                return preview_text

        section_names = sorted(
            name
            for name in archive.namelist()
            if name.startswith("Contents/section") and name.endswith(".xml")
        )
        if not section_names:
            raise RuntimeError("HWPX 본문 섹션을 찾을 수 없습니다.")

        sections = [extract_hwpx_xml_text(archive.read(name)) for name in section_names]
    return "\n".join(section for section in sections if section)


def extract_pdf_text_with_ocr(file_bytes: bytes) -> str:
    import fitz
    import numpy as np

    ocr_engine = get_paddle_ocr()
    parts: list[str] = []

    with fitz.open(stream=file_bytes, filetype="pdf") as document:
        for page_index in range(min(len(document), PDF_OCR_MAX_PAGES)):
            page = document.load_page(page_index)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(PDF_OCR_RENDER_SCALE, PDF_OCR_RENDER_SCALE), alpha=False)
            image = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(pixmap.height, pixmap.width, pixmap.n)
            result = run_paddle_ocr(ocr_engine, image)
            parts.extend(extract_paddle_ocr_lines(result))
            if sum(len(part) for part in parts) >= PDF_OCR_TARGET_CHARS:
                break

    return "\n".join(parts)


def extract_image_text_with_ocr(file_bytes: bytes) -> str:
    import numpy as np
    from PIL import Image

    ocr_engine = get_paddle_ocr()
    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    result = run_paddle_ocr(ocr_engine, np.array(image))
    return "\n".join(extract_paddle_ocr_lines(result))


def get_paddle_ocr():
    from paddleocr import PaddleOCR

    global _PADDLE_OCR_INSTANCE
    try:
        return _PADDLE_OCR_INSTANCE
    except NameError:
        try:
            _PADDLE_OCR_INSTANCE = PaddleOCR(
                use_angle_cls=False,
                lang="korean",
                use_gpu=False,
                cpu_threads=1,
                enable_mkldnn=False,
            )
        except ValueError:
            _PADDLE_OCR_INSTANCE = PaddleOCR(lang="korean")
        return _PADDLE_OCR_INSTANCE


def run_paddle_ocr(ocr_engine: object, image: object) -> object:
    try:
        return ocr_engine.ocr(image, cls=False)
    except TypeError as exc:
        if "cls" not in str(exc):
            raise
        return ocr_engine.ocr(image)


def extract_paddle_ocr_lines(result: object) -> list[str]:
    lines: list[str] = []

    def visit(node: object) -> None:
        if isinstance(node, dict):
            for key in ("rec_texts", "texts", "text"):
                value = node.get(key)
                if isinstance(value, str) and value.strip():
                    lines.append(value.strip())
                elif isinstance(value, (list, tuple)):
                    for item in value:
                        if isinstance(item, str) and item.strip():
                            lines.append(item.strip())
            for value in node.values():
                if isinstance(value, (dict, list, tuple)):
                    visit(value)
            return
        if isinstance(node, (list, tuple)):
            if len(node) >= 2 and isinstance(node[1], (list, tuple)) and node[1]:
                candidate = node[1][0]
                if isinstance(candidate, str) and candidate.strip():
                    lines.append(candidate.strip())
                    return
            for item in node:
                visit(item)

    visit(result)
    return lines


def extract_hwp_preview_text(ole) -> str:
    for candidate in ("PrvText", ["PrvText"]):
        try:
            raw = ole.openstream(candidate).read()
            preview = raw.decode("utf-16le", errors="ignore").strip()
            if preview:
                return preview
        except OSError:
            continue
    return ""


def extract_hwpx_xml_text(xml_bytes: bytes) -> str:
    root = ET.fromstring(xml_bytes)
    texts: list[str] = []
    for element in root.iter():
        text = (element.text or "").strip()
        if not text:
            continue
        local_name = element.tag.split("}")[-1]
        if local_name in {"t", "text"}:
            texts.append(text)
    return "\n".join(texts)


def parse_hwp_paragraph_text(section_bytes: bytes) -> list[str]:
    offset = 0
    texts: list[str] = []

    while offset + 4 <= len(section_bytes):
        header = struct.unpack("<I", section_bytes[offset:offset + 4])[0]
        offset += 4

        record_type = header & 0x3FF
        record_length = (header >> 20) & 0xFFF
        if record_length == 0xFFF:
            if offset + 4 > len(section_bytes):
                break
            record_length = struct.unpack("<I", section_bytes[offset:offset + 4])[0]
            offset += 4

        if offset + record_length > len(section_bytes):
            break

        payload = section_bytes[offset:offset + record_length]
        offset += record_length

        if record_type != HWP_PARA_TEXT_TAG:
            continue

        text = payload.decode("utf-16le", errors="ignore").strip()
        if text:
            texts.append(text)

    return texts


def normalize_extracted_text(text: str) -> str:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    normalized = CONTROL_CHAR_PATTERN.sub("", normalized)
    normalized_lines = []
    for line in normalized.split("\n"):
        compact_line = WHITESPACE_PATTERN.sub(" ", line).strip()
        compact_line = collapse_spaced_single_char_runs(compact_line)
        normalized_lines.append(compact_line)
    normalized = "\n".join(normalized_lines)
    normalized = BLANK_LINE_PATTERN.sub("\n\n", normalized)
    return normalized.strip()


def collapse_spaced_single_char_runs(line: str) -> str:
    if not line or " " not in line:
        return line

    tokens = line.split(" ")
    collapsed: list[str] = []
    run: list[str] = []

    def flush_run() -> None:
        nonlocal run
        if not run:
            return
        if len(run) >= 2:
            collapsed.append("".join(run))
        else:
            collapsed.extend(run)
        run = []

    for token in tokens:
        if SINGLE_CHAR_TOKEN_PATTERN.match(token):
            run.append(token)
            continue
        flush_run()
        collapsed.append(token)

    flush_run()
    return " ".join(part for part in collapsed if part)
