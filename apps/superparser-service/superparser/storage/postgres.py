from __future__ import annotations

import json
from typing import Any

from superparser.core.models import (
    DocumentChunk,
    DocumentClassification,
    IngestionJob,
    SearchQueryLog,
    SearchResult,
    StoredDocument,
    StoredExtraction,
)


class PostgresSuperparserRepository:
    def __init__(self, database_url: str):
        import psycopg  # type: ignore

        self.psycopg = psycopg
        self.database_url = database_url

    def _connect(self):
        return self.psycopg.connect(self.database_url)

    def save_job(self, job: IngestionJob) -> IngestionJob:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                insert into superparser.ingestion_jobs
                  (id, company_id, status, source_type, source_ref, error, created_at, updated_at)
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (id) do update set
                  status = excluded.status,
                  error = excluded.error,
                  updated_at = excluded.updated_at
                """,
                (job.id, job.company_id, job.status, job.source_type, job.source_ref, job.error, job.created_at, job.updated_at),
            )
        return job

    def get_job(self, job_id: str) -> IngestionJob:
        row = self._one("select id, company_id, status, source_type, source_ref, error, created_at, updated_at from superparser.ingestion_jobs where id = %s", (job_id,))
        return IngestionJob(*row)

    def save_document(self, document: StoredDocument) -> StoredDocument:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                insert into superparser.documents
                  (id, company_id, job_id, title, source_type, source_ref, content_type, flat_text, metadata_json, created_at, content_hash)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
                """,
                (
                    document.id,
                    document.company_id,
                    document.job_id,
                    document.title,
                    document.source_type,
                    document.source_ref,
                    document.content_type,
                    document.flat_text,
                    json.dumps(document.metadata),
                    document.created_at,
                    document.content_hash,
                ),
            )
        return document

    def list_documents(self, company_id: str) -> list[StoredDocument]:
        rows = self._all(
            """
            select id, company_id, job_id, title, source_type, source_ref, content_type, flat_text, metadata_json, created_at, content_hash
            from superparser.documents where company_id = %s order by created_at desc
            """,
            (company_id,),
        )
        return [_document_from_row(row) for row in rows]

    def get_document(self, document_id: str) -> StoredDocument:
        row = self._one(
            """
            select id, company_id, job_id, title, source_type, source_ref, content_type, flat_text, metadata_json, created_at, content_hash
            from superparser.documents where id = %s
            """,
            (document_id,),
        )
        return _document_from_row(row)

    def find_document_by_hash(self, company_id: str, content_hash: str) -> StoredDocument | None:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                select id, company_id, job_id, title, source_type, source_ref, content_type, flat_text, metadata_json, created_at, content_hash
                from superparser.documents
                where company_id = %s and content_hash = %s
                order by created_at asc
                limit 1
                """,
                (company_id, content_hash),
            )
            row = cur.fetchone()
        return _document_from_row(row) if row is not None else None

    def save_chunks(self, chunks: list[DocumentChunk]) -> list[DocumentChunk]:
        if not chunks:
            return chunks
        with self._connect() as conn, conn.cursor() as cur:
            cur.executemany(
                """
                insert into superparser.document_chunks
                  (id, company_id, document_id, ordinal, text, token_estimate, source_span_json, embedding)
                values (%s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                """,
                [
                    (
                        chunk.id,
                        chunk.company_id,
                        chunk.document_id,
                        chunk.ordinal,
                        chunk.text,
                        chunk.token_estimate,
                        json.dumps(chunk.source_span),
                        _vector_literal(chunk.embedding),
                    )
                    for chunk in chunks
                ],
            )
        return chunks

    def list_chunks(self, document_id: str) -> list[DocumentChunk]:
        rows = self._all(
            """
            select id, company_id, document_id, ordinal, text, token_estimate, source_span_json, embedding::text
            from superparser.document_chunks where document_id = %s order by ordinal asc
            """,
            (document_id,),
        )
        return [
            DocumentChunk(row[0], row[1], row[2], row[3], row[4], row[5], row[6], _parse_vector(row[7]))
            for row in rows
        ]

    def save_extractions(self, extractions: list[StoredExtraction]) -> list[StoredExtraction]:
        if not extractions:
            return extractions
        with self._connect() as conn, conn.cursor() as cur:
            cur.executemany(
                """
                insert into superparser.extractions
                  (id, company_id, document_id, chunk_id, type, text, source_span_json, attributes_json)
                values (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
                """,
                [
                    (
                        item.id,
                        item.company_id,
                        item.document_id,
                        item.chunk_id,
                        item.type,
                        item.text,
                        json.dumps(item.source_span),
                        json.dumps(item.attributes),
                    )
                    for item in extractions
                ],
            )
        return extractions

    def list_extractions(self, document_id: str) -> list[StoredExtraction]:
        rows = self._all(
            """
            select id, company_id, document_id, chunk_id, type, text, source_span_json, attributes_json
            from superparser.extractions where document_id = %s order by (source_span_json->>'start')::int asc
            """,
            (document_id,),
        )
        return [StoredExtraction(*row) for row in rows]

    def save_classification(self, classification: DocumentClassification) -> DocumentClassification:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                insert into superparser.classifications
                  (id, company_id, document_id, label, confidence, rationale)
                values (%s, %s, %s, %s, %s, %s)
                """,
                (
                    classification.id,
                    classification.company_id,
                    classification.document_id,
                    classification.label,
                    classification.confidence,
                    classification.rationale,
                ),
            )
        return classification

    def list_classifications(self, document_id: str) -> list[DocumentClassification]:
        rows = self._all(
            "select id, company_id, document_id, label, confidence, rationale from superparser.classifications where document_id = %s",
            (document_id,),
        )
        return [DocumentClassification(*row) for row in rows]

    def search_chunks(
        self,
        company_id: str,
        query_embedding: list[float],
        limit: int,
        query: str | None = None,
    ) -> list[SearchResult]:
        rows = self._all(
            """
            select d.id, d.title, c.id, c.text, 1 - (c.embedding <=> %s::vector) as score, c.source_span_json
            from superparser.document_chunks c
            join superparser.documents d on d.id = c.document_id
            where c.company_id = %s
            order by c.embedding <=> %s::vector
            limit %s
            """,
            (_vector_literal(query_embedding), company_id, _vector_literal(query_embedding), limit),
        )
        return [SearchResult(row[0], row[1], row[2], row[3], float(row[4]), row[5]) for row in rows]

    def save_search_query(self, query_log: SearchQueryLog) -> SearchQueryLog:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                insert into superparser.search_queries
                  (id, company_id, query, result_count, created_at)
                values (%s, %s, %s, %s, %s)
                """,
                (
                    query_log.id,
                    query_log.company_id,
                    query_log.query,
                    query_log.result_count,
                    query_log.created_at,
                ),
            )
        return query_log

    def _one(self, sql: str, params: tuple[Any, ...]):
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            if row is None:
                raise KeyError(params[0])
            return row

    def _all(self, sql: str, params: tuple[Any, ...]):
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def _document_from_row(row) -> StoredDocument:
    return StoredDocument(
        id=row[0],
        company_id=row[1],
        job_id=row[2],
        title=row[3],
        source_type=row[4],
        source_ref=row[5],
        content_type=row[6],
        flat_text=row[7],
        metadata=row[8] or {},
        created_at=row[9],
        content_hash=row[10] if len(row) > 10 else None,
    )


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(str(float(value)) for value in values) + "]"


def _parse_vector(value: str) -> list[float]:
    stripped = value.strip("[]")
    if not stripped:
        return []
    return [float(item) for item in stripped.split(",")]
