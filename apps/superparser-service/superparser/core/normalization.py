from __future__ import annotations

import csv
import io
import re
from typing import Any

from .models import NormalizedSource

MAX_PDF_BYTES = 50 * 1024 * 1024
MAX_PDF_PAGES = 1000


def normalize_source(filename: str, content_type: str, data: bytes) -> NormalizedSource:
    content_type = (content_type or "application/octet-stream").split(";")[0].strip().lower()
    lower_filename = filename.lower()

    if content_type == "application/pdf" or lower_filename.endswith(".pdf"):
        return _normalize_pdf(filename, content_type, data)
    if content_type in {"text/csv", "application/csv"} or lower_filename.endswith(".csv"):
        return _normalize_csv(filename, content_type, data)
    if _looks_like_xlsx(content_type, lower_filename):
        return _normalize_xlsx(filename, content_type, data)
    if content_type.startswith("text/") or lower_filename.endswith((".txt", ".md")):
        return NormalizedSource(filename, content_type, "text", _decode_text(data), {"byteSize": len(data)})

    return NormalizedSource(
        filename=filename,
        content_type=content_type,
        kind="text",
        text=_decode_text(data),
        metadata={"byteSize": len(data), "contentTypeDetected": content_type},
    )


def _normalize_pdf(filename: str, content_type: str, data: bytes) -> NormalizedSource:
    if len(data) > MAX_PDF_BYTES:
        return NormalizedSource(
            filename,
            content_type,
            "rejected",
            "",
            {"reason": "pdf_too_large", "limitBytes": MAX_PDF_BYTES, "byteSize": len(data)},
        )

    page_count = _count_pdf_pages(data)
    if page_count > MAX_PDF_PAGES:
        return NormalizedSource(
            filename,
            content_type,
            "rejected",
            "",
            {"reason": "pdf_too_many_pages", "limitPages": MAX_PDF_PAGES, "pageCount": page_count},
        )

    text = _extract_pdf_text(data)
    return NormalizedSource(
        filename,
        content_type,
        "pdf",
        text,
        {"byteSize": len(data), "pageCount": max(page_count, 1), "modelLimit": "50MB/1000 pages"},
    )


def _normalize_csv(filename: str, content_type: str, data: bytes) -> NormalizedSource:
    decoded = _decode_text(data)
    reader = csv.reader(io.StringIO(decoded))
    rows = [row for row in reader if any(cell.strip() for cell in row)]
    if not rows:
        return NormalizedSource(filename, content_type, "spreadsheet", "", {"rowCount": 0, "columnCount": 0})

    width = max(len(row) for row in rows)
    padded = [row + [""] * (width - len(row)) for row in rows]
    flat_rows = [" | ".join(cell.strip() for cell in row) for row in padded]
    metadata = {"rowCount": max(len(rows) - 1, 0), "columnCount": width, "format": "csv"}
    return NormalizedSource(filename, content_type, "spreadsheet", "\n".join(flat_rows), metadata)


def _normalize_xlsx(filename: str, content_type: str, data: bytes) -> NormalizedSource:
    try:
        import openpyxl  # type: ignore
    except Exception as exc:  # pragma: no cover - depends on optional runtime dependency
        return NormalizedSource(
            filename,
            content_type,
            "rejected",
            "",
            {"reason": "xlsx_parser_unavailable", "detail": str(exc)},
        )

    workbook = openpyxl.load_workbook(io.BytesIO(data), data_only=True, read_only=True)
    lines: list[str] = []
    row_count = 0
    for sheet in workbook.worksheets:
        lines.append(f"# Sheet: {sheet.title}")
        for row in sheet.iter_rows(values_only=True):
            values = ["" if value is None else str(value) for value in row]
            if any(value.strip() for value in values):
                row_count += 1
                lines.append(" | ".join(values))
    return NormalizedSource(
        filename,
        content_type,
        "spreadsheet",
        "\n".join(lines),
        {"rowCount": row_count, "sheetCount": len(workbook.worksheets), "format": "xlsx"},
    )


def _decode_text(data: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(encoding).replace("\x00", "").strip()
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace").replace("\x00", "").strip()


def _count_pdf_pages(data: bytes) -> int:
    raw = data.decode("latin-1", errors="ignore")
    matches = re.findall(r"/Type\s*/Page\b", raw)
    if matches:
        return len(matches)
    return max(raw.count("\f") + 1, 1)


def _extract_pdf_text(data: bytes) -> str:
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(io.BytesIO(data))
        return "\n\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except Exception:
        raw = _decode_text(data)
        return _cleanup_pdf_fallback_text(raw)


def _cleanup_pdf_fallback_text(raw: str) -> str:
    lines = []
    for line in raw.splitlines():
        clean = re.sub(r"\s+", " ", line).strip()
        if not clean or clean.startswith("%PDF"):
            continue
        lines.append(clean)
    return "\n".join(lines).strip()


def _looks_like_xlsx(content_type: str, lower_filename: str) -> bool:
    return (
        content_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        or lower_filename.endswith(".xlsx")
    )
