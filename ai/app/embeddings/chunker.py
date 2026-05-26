# 인수인계 메모: 임베딩 계층입니다. 원문을 검색 가능한 청크로 나누고, 문서/질문 prefix를 붙여 같은 벡터 공간에 올립니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
