from __future__ import annotations

import base64
from typing import Any, Protocol

from superparser.core.pipeline import IngestionPipeline


class CiutatisClient(Protocol):
    def post_issue_comment(self, issue_id: str, body: str) -> None: ...
    def put_issue_document(self, issue_id: str, key: str, title: str, body: str) -> None: ...


class NullCiutatisClient:
    def post_issue_comment(self, issue_id: str, body: str) -> None:
        return None

    def put_issue_document(self, issue_id: str, key: str, title: str, body: str) -> None:
        return None


class CiutatisHeartbeatHandler:
    def __init__(self, pipeline: IngestionPipeline, ciutatis_client: CiutatisClient | None = None):
        self.pipeline = pipeline
        self.ciutatis_client = ciutatis_client or NullCiutatisClient()

    def handle(self, payload: dict[str, Any]) -> dict[str, Any]:
        company_id = str(payload["companyId"])
        issue_id = payload.get("issueId")
        source = payload.get("source") or {}
        filename = str(source.get("filename") or "ciutatis-source.txt")
        content_type = str(source.get("contentType") or "text/plain")

        if source.get("type") == "inline_text":
            data = str(source.get("content") or "").encode("utf-8")
        elif source.get("base64"):
            data = base64.b64decode(str(source["base64"]))
        else:
            data = str(payload.get("instructions") or "").encode("utf-8")

        job = self.pipeline.ingest_upload(
            company_id=company_id,
            filename=filename,
            content_type=content_type,
            data=data,
            source_ref=str(source.get("ref") or filename),
            source_metadata={"ciutatis": {"issueId": issue_id, "runId": payload.get("runId")}},
        )

        documents = self.pipeline.repository.list_documents(company_id=company_id)
        document = next((item for item in documents if item.job_id == job.id), None)
        extraction_count = 0
        classification_label = None
        if document is not None:
            extractions = self.pipeline.repository.list_extractions(document.id)
            classifications = self.pipeline.repository.list_classifications(document.id)
            extraction_count = len(extractions)
            classification_label = classifications[0].label if classifications else None

        if issue_id and job.status == "succeeded":
            body = (
                f"Superparser completed `{filename}` with {extraction_count} grounded extractions"
                + (f" and `{classification_label}` classification." if classification_label else ".")
            )
            self.ciutatis_client.post_issue_comment(str(issue_id), body)
            self.ciutatis_client.put_issue_document(
                str(issue_id),
                "superparser-extraction",
                f"Superparser extraction: {filename}",
                _build_issue_document(filename, extraction_count, classification_label),
            )

        return {
            "jobId": job.id,
            "status": job.status,
            "documentId": document.id if document else None,
            "extractionCount": extraction_count,
            "classification": classification_label,
            "error": job.error,
        }


def _build_issue_document(filename: str, extraction_count: int, classification_label: str | None) -> str:
    return "\n".join([
        "# Superparser Extraction",
        "",
        f"- Source: `{filename}`",
        f"- Grounded extractions: {extraction_count}",
        f"- Classification: `{classification_label or 'unclassified'}`",
        "",
        "The complete extraction payload is stored in the Superparser Postgres schema.",
    ])
