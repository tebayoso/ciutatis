from __future__ import annotations


def chunk_text(text: str, max_chars: int = 1200, overlap: int = 120) -> list[dict[str, object]]:
    clean = text.strip()
    if not clean:
        return []
    chunks: list[dict[str, object]] = []
    start = 0
    ordinal = 0
    while start < len(clean):
        end = min(start + max_chars, len(clean))
        if end < len(clean):
            boundary = clean.rfind("\n", start, end)
            if boundary > start + 200:
                end = boundary
        value = clean[start:end].strip()
        if value:
            chunks.append({
                "ordinal": ordinal,
                "text": value,
                "sourceSpan": {"start": start, "end": end},
                "tokenEstimate": max(1, len(value) // 4),
            })
            ordinal += 1
        if end >= len(clean):
            break
        start = max(end - overlap, start + 1)
    return chunks
