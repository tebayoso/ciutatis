from __future__ import annotations

import hashlib
from dataclasses import asdict
from typing import Protocol

from .chunking import chunk_text
from .classification import classify_document
from .extraction import run_extraction
from .gemini_gateway import GeminiGateway
from .models import (
    DocumentChunk,
    DocumentClassification,
    IngestionJob,
    SearchQueryLog,
    SearchResult,
    StoredDocument,
    StoredExtraction,
    new_id,
    utcnow,
)
from .normalization import normalize_source


class SuperparserRepository(Protocol):
    def save_job(self, job: IngestionJob) -> IngestionJob: ...
    def get_job(self, job_id: str) -> IngestionJob: ...
    def save_document(self, document: StoredDocument) -> StoredDocument: ...
    def list_documents(self, company_id: str) -> list[StoredDocument]: ...
    def get_document(self, document_id: str) -> StoredDocument: ...
    def find_document_by_hash(self, company_id: str, content_hash: str) -> StoredDocument | None: ...
    def save_chunks(self, chunks: list[DocumentChunk]) -> list[DocumentChunk]: ...
    def list_chunks(self, document_id: str) -> list[DocumentChunk]: ...
    def save_extractions(self, extractions: list[StoredExtraction]) -> list[StoredExtraction]: ...
    def list_extractions(self, document_id: str) -> list[StoredExtraction]: ...
    def save_classification(self, classification: DocumentClassification) -> DocumentClassification: ...
    def list_classifications(self, document_id: str) -> list[DocumentClassification]: ...
    def search_chunks(
        self,
        company_id: str,
        query_embedding: list[float],
        limit: int,
        query: str | None = None,
    ) -> list[SearchResult]: ...
    def save_search_query(self, query_log: SearchQueryLog) -> SearchQueryLog: ...


class IngestionPipeline:
    def __init__(self, repository: SuperparserRepository, gemini_gateway: GeminiGateway):
        self.repository = repository
        self.gemini_gateway = gemini_gateway

    def ingest_upload(
        self,
        company_id: str,
        filename: str,
        content_type: str,
        data: bytes,
        source_ref: str | None = None,
        source_metadata: dict | None = None,
    ) -> IngestionJob:
        job = self.repository.save_job(IngestionJob(
            id=new_id(),
            company_id=company_id,
            status="running",
            source_type="upload",
            source_ref=source_ref or filename,
        ))
        try:
            source = normalize_source(filename=filename, content_type=content_type, data=data)
            if source.kind == "rejected":
                job.status = "failed"
                job.error = str(source.metadata.get("reason", "source_rejected"))
                job.updated_at = utcnow()
                return self.repository.save_job(job)

            metadata = {**source.metadata, **(source_metadata or {})}
            document = self.repository.save_document(StoredDocument(
                id=new_id(),
                company_id=company_id,
                job_id=job.id,
                title=filename,
                source_type=source.kind,
                source_ref=source_ref,
                content_type=source.content_type,
                flat_text=source.text,
                metadata=metadata,
                content_hash=content_hash(data),
            ))

            chunks = chunk_text(source.text)
            embeddings = self.gemini_gateway.embed_texts([str(chunk["text"]) for chunk in chunks]) if chunks else []
            stored_chunks = [
                DocumentChunk(
                    id=new_id(),
                    company_id=company_id,
                    document_id=document.id,
                    ordinal=int(chunk["ordinal"]),
                    text=str(chunk["text"]),
                    token_estimate=int(chunk["tokenEstimate"]),
                    source_span=dict(chunk["sourceSpan"]),
                    embedding=embeddings[index],
                )
                for index, chunk in enumerate(chunks)
            ]
            self.repository.save_chunks(stored_chunks)

            extraction_result = run_extraction(source.text)
            stored_extractions = [
                StoredExtraction(
                    id=new_id(),
                    company_id=company_id,
                    document_id=document.id,
                    chunk_id=_find_chunk_for_span(stored_chunks, item["sourceSpan"]),
                    type=item["type"],
                    text=item["text"],
                    source_span=item["sourceSpan"],
                    attributes=item.get("attributes", {}),
                )
                for item in extraction_result.extractions
            ]
            self.repository.save_extractions(stored_extractions)

            label, confidence, rationale = classify_document(source.text)
            self.repository.save_classification(DocumentClassification(
                id=new_id(),
                company_id=company_id,
                document_id=document.id,
                label=label,
                confidence=confidence,
                rationale=rationale,
            ))

            job.status = "succeeded"
            job.updated_at = utcnow()
            self.repository.save_job(job)
            return job
        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)
            job.updated_at = utcnow()
            return self.repository.save_job(job)

    def search(self, company_id: str, query: str, limit: int = 10) -> list[SearchResult]:
        _, results = self.search_with_log(company_id=company_id, query=query, limit=limit)
        return results

    def search_with_log(self, company_id: str, query: str, limit: int = 10) -> tuple[SearchQueryLog, list[SearchResult]]:
        embedding = self.gemini_gateway.embed_texts([query])[0]
        results = self.repository.search_chunks(
            company_id=company_id,
            query_embedding=embedding,
            limit=limit,
            query=query,
        )
        query_log = self.repository.save_search_query(SearchQueryLog(
            id=new_id(),
            company_id=company_id,
            query=query,
            result_count=len(results),
        ))
        return query_log, results

    def get_job_payload(self, job_id: str) -> dict:
        return _dataclass_payload(self.repository.get_job(job_id))

    def get_document_payload(self, document_id: str) -> dict:
        document = self.repository.get_document(document_id)
        return {
            **_dataclass_payload(document),
            "chunks": [_dataclass_payload(chunk) for chunk in self.repository.list_chunks(document_id)],
            "extractions": [_dataclass_payload(item) for item in self.repository.list_extractions(document_id)],
            "classifications": [
                _dataclass_payload(item)
                for item in self.repository.list_classifications(document_id)
            ],
        }

    def collaborate(
        self,
        company_id: str,
        filename: str,
        content_type: str,
        data: bytes,
        source_ref: str | None = None,
        source_metadata: dict | None = None,
        similar_limit: int = 5,
    ) -> dict:
        """Citizen-contributed document flow: recognise exact re-uploads before
        spending any extraction cost, otherwise ingest and surface possible
        duplicates as a best-effort advisory."""
        digest = content_hash(data)

        existing = self.repository.find_document_by_hash(company_id, digest)
        if existing is not None:
            return {
                "status": "duplicate",
                "contentHash": digest,
                "document": self._document_summary(existing),
            }

        job = self.ingest_upload(
            company_id=company_id,
            filename=filename,
            content_type=content_type,
            data=data,
            source_ref=source_ref,
            source_metadata=source_metadata,
        )
        if job.status != "succeeded":
            return {"status": "failed", "contentHash": digest, "jobId": job.id, "error": job.error}

        document = self.repository.find_document_by_hash(company_id, digest)
        return {
            "status": "ingested",
            "contentHash": digest,
            "jobId": job.id,
            "document": self._document_summary(document) if document else None,
            "possibleDuplicates": self.find_similar_documents(company_id, document, similar_limit)
            if document
            else [],
        }

    def find_similar_documents(
        self,
        company_id: str,
        document: StoredDocument,
        limit: int = 5,
    ) -> list[dict]:
        """Best-effort 'we may already have a similar document' advisory via
        semantic search. Not a guarantee — a re-export of the same source won't
        be byte-identical, so it can only ever be a hint."""
        text = (document.flat_text or document.title or "").strip()
        if not text:
            return []
        embedding = self.gemini_gateway.embed_texts([text[:1000]])[0]
        results = self.repository.search_chunks(
            company_id=company_id,
            query_embedding=embedding,
            limit=limit * 4,
            query=text[:1000],
        )
        seen: dict[str, dict] = {}
        for result in results:
            if result.document_id == document.id or result.document_id in seen:
                continue
            seen[result.document_id] = {
                "documentId": result.document_id,
                "title": result.document_title,
                "score": round(float(result.score), 4),
            }
            if len(seen) >= limit:
                break
        return list(seen.values())

    def _document_summary(self, document: StoredDocument) -> dict:
        classifications = self.repository.list_classifications(document.id)
        extractions = self.repository.list_extractions(document.id)
        top = max(classifications, key=lambda item: item.confidence, default=None)
        return {
            "id": document.id,
            "title": document.title,
            "sourceType": document.source_type,
            "contentType": document.content_type,
            "contentHash": document.content_hash,
            "createdAt": document.created_at.isoformat(),
            "classification": {"label": top.label, "confidence": top.confidence} if top else None,
            "extractions": [
                {"type": item.type, "text": item.text, "attributes": item.attributes}
                for item in extractions
            ],
        }


def content_hash(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


def _find_chunk_for_span(chunks: list[DocumentChunk], span: dict[str, int]) -> str | None:
    for chunk in chunks:
        if chunk.source_span["start"] <= span["start"] and chunk.source_span["end"] >= span["end"]:
            return chunk.id
    return chunks[0].id if chunks else None


def _dataclass_payload(value) -> dict:
    payload = asdict(value)
    for key in ("created_at", "updated_at"):
        if key in payload and payload[key] is not None:
            payload[key] = payload[key].isoformat()
    return payload
