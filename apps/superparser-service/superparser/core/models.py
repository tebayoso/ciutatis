from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4


def new_id() -> str:
    return str(uuid4())


def utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True)
class NormalizedSource:
    filename: str
    content_type: str
    kind: str
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class DriveSourceMetadata:
    source_id: str
    title: str
    mime_type: str | None
    owners: list[dict[str, str]]
    last_modifier: dict[str, str] | None
    created_time: str | None
    modified_time: str | None
    web_view_link: str | None
    raw: dict[str, Any]


@dataclass(frozen=True)
class ExtractionResult:
    schema_name: str
    extractions: list[dict[str, Any]]
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class IngestionJob:
    id: str
    company_id: str
    status: str
    source_type: str
    source_ref: str | None
    error: str | None = None
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)


@dataclass
class StoredDocument:
    id: str
    company_id: str
    job_id: str
    title: str
    source_type: str
    source_ref: str | None
    content_type: str
    flat_text: str
    metadata: dict[str, Any]
    created_at: datetime = field(default_factory=utcnow)


@dataclass
class DocumentChunk:
    id: str
    company_id: str
    document_id: str
    ordinal: int
    text: str
    token_estimate: int
    source_span: dict[str, int]
    embedding: list[float]


@dataclass
class StoredExtraction:
    id: str
    company_id: str
    document_id: str
    chunk_id: str | None
    type: str
    text: str
    source_span: dict[str, int]
    attributes: dict[str, Any]


@dataclass
class DocumentClassification:
    id: str
    company_id: str
    document_id: str
    label: str
    confidence: float
    rationale: str


@dataclass(frozen=True)
class SearchResult:
    document_id: str
    document_title: str
    chunk_id: str
    text: str
    score: float
    source_span: dict[str, int]


@dataclass
class SearchQueryLog:
    id: str
    company_id: str
    query: str
    result_count: int
    created_at: datetime = field(default_factory=utcnow)
