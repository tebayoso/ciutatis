from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .models import ExtractionResult


@dataclass(frozen=True)
class ExtractionSchema:
    name: str
    fields: tuple[str, ...]

    @staticmethod
    def default_govops() -> "ExtractionSchema":
        return ExtractionSchema(
            name="govops_v1",
            fields=("agency", "money", "date", "ordinance", "program", "person", "place"),
        )


def run_extraction(text: str, schema: ExtractionSchema | None = None) -> ExtractionResult:
    schema = schema or ExtractionSchema.default_govops()
    langextract_result = _try_langextract(text, schema)
    if langextract_result is not None:
        return ExtractionResult(schema.name, filter_grounded_extractions(langextract_result), {"provider": "langextract"})

    return ExtractionResult(schema.name, _fallback_govops_extractions(text), {"provider": "deterministic_fallback"})


def filter_grounded_extractions(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grounded: list[dict[str, Any]] = []
    for item in items:
        interval = item.get("char_interval") or item.get("sourceSpan")
        span = _normalize_span(interval)
        if span is None:
            continue
        grounded.append({
            "type": item.get("type") or item.get("extraction_class") or "unknown",
            "text": item.get("text") or item.get("extraction_text") or "",
            "sourceSpan": span,
            "attributes": item.get("attributes") or {},
        })
    return grounded


def _try_langextract(text: str, schema: ExtractionSchema) -> list[dict[str, Any]] | None:
    try:
        import langextract as lx  # type: ignore
    except Exception:
        return None

    try:  # pragma: no cover - live provider path depends on runtime credentials
        result = lx.extract(
            text_or_documents=text,
            prompt_description=(
                "Extract government operations facts. Return agencies, monetary amounts, dates, "
                "ordinances, programs, people, places, and decision obligations. Keep source grounding."
            ),
            examples=[],
        )
        return [
            {
                "type": getattr(extraction, "extraction_class", "unknown"),
                "text": getattr(extraction, "extraction_text", ""),
                "char_interval": getattr(extraction, "char_interval", None),
                "attributes": getattr(extraction, "attributes", {}) or {},
            }
            for extraction in getattr(result, "extractions", [])
        ]
    except Exception:
        return None


def _fallback_govops_extractions(text: str) -> list[dict[str, Any]]:
    patterns: list[tuple[str, str]] = [
        ("money", r"\$ ?\d[\d,]*(?:\.\d{2})?"),
        ("date", r"\b20\d{2}-\d{2}-\d{2}\b"),
        ("ordinance", r"\b(?:Ordinance|Resolution|Decree)\s+[A-Z0-9.-]+\b"),
        ("agency", r"\b(?:City Council|Public Works|Health Department|Budget Office|Clerk Office)\b"),
    ]
    results: list[dict[str, Any]] = []
    for kind, pattern in patterns:
        for match in re.finditer(pattern, text):
            results.append({
                "type": kind,
                "text": match.group(0),
                "sourceSpan": {"start": match.start(), "end": match.end()},
                "attributes": {"confidence": "fallback"},
            })
    results.sort(key=lambda item: (item["sourceSpan"]["start"], item["type"]))
    return results


def _normalize_span(interval: Any) -> dict[str, int] | None:
    if isinstance(interval, dict):
        start = interval.get("start") if "start" in interval else interval.get("start_pos")
        end = interval.get("end") if "end" in interval else interval.get("end_pos")
        if isinstance(start, int) and isinstance(end, int) and end > start:
            return {"start": start, "end": end}
    if hasattr(interval, "start_pos") and hasattr(interval, "end_pos"):
        start = getattr(interval, "start_pos")
        end = getattr(interval, "end_pos")
        if isinstance(start, int) and isinstance(end, int) and end > start:
            return {"start": start, "end": end}
    return None
