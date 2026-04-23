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
