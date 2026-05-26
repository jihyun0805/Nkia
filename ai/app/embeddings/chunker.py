# 인수인계: 색인 본문을 일정 길이와 overlap을 가진 청크로 나누는 유틸입니다.
# 핵심 흐름: 청크 크기는 검색 recall과 근거 표시 길이에 직접 영향을 주며 settings.ai_chunk_size 값을 사용합니다.
# 같이 확인: chunk 규칙 변경 후에는 기존 pgvector 데이터를 reindex해야 검색 품질이 일관됩니다.
def split_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 120) -> list[str]:
    normalized = "\n".join(line.rstrip() for line in text.strip().splitlines() if line.strip())
    if not normalized:
        return []

    if len(normalized) <= chunk_size:
        return [normalized]

    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(start + chunk_size, len(normalized))
        chunks.append(normalized[start:end])
        if end == len(normalized):
            break
        start = max(end - chunk_overlap, start + 1)

    return chunks
