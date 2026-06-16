from __future__ import annotations

import math

from superparser.core.models import (
    DocumentChunk,
    DocumentClassification,
    IngestionJob,
    SearchQueryLog,
    SearchResult,
    StoredDocument,
    StoredExtraction,
)


class InMemorySuperparserRepository:
    def __init__(self):
        self.jobs: dict[str, IngestionJob] = {}
        self.documents: dict[str, StoredDocument] = {}
        self.chunks: dict[str, DocumentChunk] = {}
        self.extractions: dict[str, StoredExtraction] = {}
        self.classifications: dict[str, DocumentClassification] = {}
        self.search_queries: dict[str, SearchQueryLog] = {}

    def save_job(self, job: IngestionJob) -> IngestionJob:
        self.jobs[job.id] = job
        return job

    def get_job(self, job_id: str) -> IngestionJob:
        return self.jobs[job_id]

    def save_document(self, document: StoredDocument) -> StoredDocument:
        self.documents[document.id] = document
        return document

    def list_documents(self, company_id: str) -> list[StoredDocument]:
        return sorted(
            [document for document in self.documents.values() if document.company_id == company_id],
            key=lambda document: document.created_at,
            reverse=True,
        )

    def get_document(self, document_id: str) -> StoredDocument:
        return self.documents[document_id]

    def find_document_by_hash(self, company_id: str, content_hash: str) -> StoredDocument | None:
        matches = [
            document
            for document in self.documents.values()
            if document.company_id == company_id and document.content_hash == content_hash
        ]
        if not matches:
            return None
        return min(matches, key=lambda document: document.created_at)

    def save_chunks(self, chunks: list[DocumentChunk]) -> list[DocumentChunk]:
        for chunk in chunks:
            self.chunks[chunk.id] = chunk
        return chunks

    def list_chunks(self, document_id: str) -> list[DocumentChunk]:
        return sorted(
            [chunk for chunk in self.chunks.values() if chunk.document_id == document_id],
            key=lambda chunk: chunk.ordinal,
        )

    def save_extractions(self, extractions: list[StoredExtraction]) -> list[StoredExtraction]:
        for extraction in extractions:
            self.extractions[extraction.id] = extraction
        return extractions

    def list_extractions(self, document_id: str) -> list[StoredExtraction]:
        return [item for item in self.extractions.values() if item.document_id == document_id]

    def save_classification(self, classification: DocumentClassification) -> DocumentClassification:
        self.classifications[classification.id] = classification
        return classification

    def list_classifications(self, document_id: str) -> list[DocumentClassification]:
        return [item for item in self.classifications.values() if item.document_id == document_id]

    def search_chunks(
        self,
        company_id: str,
        query_embedding: list[float],
        limit: int,
        query: str | None = None,
    ) -> list[SearchResult]:
        rows: list[SearchResult] = []
        for chunk in self.chunks.values():
            if chunk.company_id != company_id:
                continue
            document = self.documents[chunk.document_id]
            vector_score = _cosine_similarity(query_embedding, chunk.embedding)
            lexical_score = _lexical_overlap(query, chunk.text)
            rows.append(SearchResult(
                document_id=document.id,
                document_title=document.title,
                chunk_id=chunk.id,
                text=chunk.text,
                score=(lexical_score * 0.7) + (vector_score * 0.3),
                source_span=chunk.source_span,
            ))
        rows.sort(key=lambda row: row.score, reverse=True)
        return rows[:limit]

    def save_search_query(self, query_log: SearchQueryLog) -> SearchQueryLog:
        self.search_queries[query_log.id] = query_log
        return query_log


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right:
        return 0.0
    size = min(len(left), len(right))
    dot = sum(left[idx] * right[idx] for idx in range(size))
    left_norm = math.sqrt(sum(value * value for value in left[:size]))
    right_norm = math.sqrt(sum(value * value for value in right[:size]))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (left_norm * right_norm)


def _lexical_overlap(query: str | None, text: str) -> float:
    if not query:
        return 0.0
    query_terms = _terms(query)
    if not query_terms:
        return 0.0
    text_terms = _terms(text)
    if not text_terms:
        return 0.0
    return len(query_terms & text_terms) / len(query_terms)


def _terms(value: str) -> set[str]:
    return {part for part in "".join(char.lower() if char.isalnum() else " " for char in value).split() if len(part) > 2}
