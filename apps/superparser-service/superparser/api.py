from __future__ import annotations

import base64
from dataclasses import asdict
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from superparser.clients.drive import extract_drive_file_id
from superparser.config import Settings
from superparser.factory import build_drive_client, build_heartbeat_handler, build_pipeline


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    pipeline = build_pipeline(settings)
    heartbeat_handler = build_heartbeat_handler(pipeline=pipeline, settings=settings)
    drive_client = build_drive_client()

    app = FastAPI(
        title="Superparser GovOps Agent",
        version="0.1.0",
        summary="Grounded government document extraction and semantic search agent.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def require_shared_secret(request: Request) -> None:
        # When a shared secret is configured, the document-ingestion endpoints are
        # reachable only via the trusted Ciutatis proxy (which enforces size/type
        # limits and the dedup cost-gate), not the public Cloud Run URL directly.
        if not settings.shared_secret:
            return
        provided = (request.headers.get("authorization") or "").removeprefix("Bearer ").strip()
        if provided != settings.shared_secret:
            raise HTTPException(status_code=401, detail="Invalid or missing shared secret.")

    @app.get("/health")
    def health() -> dict[str, Any]:
        return {"ok": True, "service": "superparser", "storage": "postgres" if settings.database_url else "memory"}

    @app.post("/v1/ingestions")
    async def create_ingestion(
        request: Request,
        company_id: str = Form(default="demo-company"),
        file: UploadFile | None = File(default=None),
    ) -> dict[str, Any]:
        require_shared_secret(request)
        if file is not None:
            data = await file.read()
            job = pipeline.ingest_upload(
                company_id=company_id,
                filename=file.filename or "upload.bin",
                content_type=file.content_type or "application/octet-stream",
                data=data,
            )
            return pipeline.get_job_payload(job.id)

        payload = await request.json()
        source = payload.get("source") or {}
        if source.get("base64"):
            data = base64.b64decode(source["base64"])
        else:
            data = str(source.get("content") or payload.get("content") or "").encode("utf-8")
        if not data and str(source.get("type") or payload.get("sourceType") or "").lower() == "drive":
            file_ref = source.get("fileId") or source.get("id") or source.get("ref") or payload.get("driveFileId")
            if not file_ref:
                raise HTTPException(status_code=422, detail="Drive ingestion requires source.fileId, source.ref, or driveFileId.")
            if drive_client is None:
                raise HTTPException(
                    status_code=503,
                    detail="Google Drive credentials are not configured. Provide source.content for demo-mode ingestion.",
                )
            try:
                file_id = extract_drive_file_id(str(file_ref))
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc
            fetched = drive_client.fetch_file(file_id)
            job = pipeline.ingest_upload(
                company_id=str(payload.get("companyId") or "demo-company"),
                filename=fetched.filename,
                content_type=fetched.content_type,
                data=fetched.data,
                source_ref=file_id,
                source_metadata=asdict(fetched.metadata),
            )
            return pipeline.get_job_payload(job.id)
        if not data:
            raise HTTPException(status_code=422, detail="Provide multipart file, source.base64, or source.content.")
        job = pipeline.ingest_upload(
            company_id=str(payload.get("companyId") or "demo-company"),
            filename=str(source.get("filename") or payload.get("filename") or "inline.txt"),
            content_type=str(source.get("contentType") or payload.get("contentType") or "text/plain"),
            data=data,
            source_ref=source.get("ref"),
            source_metadata=source.get("metadata") or {},
        )
        return pipeline.get_job_payload(job.id)

    @app.post("/v1/collaborate")
    async def collaborate(
        request: Request,
        company_id: str = Form(default="public-contributions"),
        file: UploadFile | None = File(default=None),
    ) -> dict[str, Any]:
        require_shared_secret(request)
        if file is not None:
            data = await file.read()
            if not data:
                raise HTTPException(status_code=422, detail="Uploaded file is empty.")
            return pipeline.collaborate(
                company_id=company_id,
                filename=file.filename or "upload.bin",
                content_type=file.content_type or "application/octet-stream",
                data=data,
            )

        payload = await request.json()
        source = payload.get("source") or {}
        if source.get("base64"):
            data = base64.b64decode(source["base64"])
        else:
            data = str(source.get("content") or payload.get("content") or "").encode("utf-8")
        if not data:
            raise HTTPException(status_code=422, detail="Provide multipart file, source.base64, or source.content.")
        return pipeline.collaborate(
            company_id=str(payload.get("companyId") or company_id),
            filename=str(source.get("filename") or payload.get("filename") or "inline.txt"),
            content_type=str(source.get("contentType") or payload.get("contentType") or "text/plain"),
            data=data,
        )

    @app.get("/v1/ingestions/{job_id}")
    def get_ingestion(job_id: str) -> dict[str, Any]:
        try:
            return pipeline.get_job_payload(job_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="ingestion not found") from exc

    @app.get("/v1/documents")
    def list_documents(company_id: str = "demo-company") -> list[dict[str, Any]]:
        return [
            {
                "id": document.id,
                "title": document.title,
                "sourceType": document.source_type,
                "contentType": document.content_type,
                "metadata": document.metadata,
                "createdAt": document.created_at.isoformat(),
            }
            for document in pipeline.repository.list_documents(company_id)
        ]

    @app.get("/v1/documents/{document_id}")
    def get_document(document_id: str) -> dict[str, Any]:
        try:
            return pipeline.get_document_payload(document_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="document not found") from exc

    @app.get("/v1/documents/{document_id}/extractions")
    def get_document_extractions(document_id: str) -> list[dict[str, Any]]:
        return [item.__dict__ for item in pipeline.repository.list_extractions(document_id)]

    @app.post("/v1/search")
    async def search(request: Request) -> dict[str, Any]:
        payload = await request.json()
        query = str(payload.get("query") or "").strip()
        if not query:
            raise HTTPException(status_code=422, detail="query is required")
        query_log, results = pipeline.search_with_log(
            company_id=str(payload.get("companyId") or "demo-company"),
            query=query,
            limit=int(payload.get("limit") or 10),
        )
        return {
            "queryId": query_log.id,
            "query_id": query_log.id,
            "query": query,
            "results": [result.__dict__ for result in results],
        }

    @app.post("/v1/ciutatis/heartbeat")
    async def ciutatis_heartbeat(request: Request) -> dict[str, Any]:
        payload = await request.json()
        return heartbeat_handler.handle(payload)

    @app.post("/v1/mcp/tools/ingest_document")
    async def mcp_ingest_document(request: Request) -> dict[str, Any]:
        payload = await request.json()
        job = pipeline.ingest_upload(
            company_id=str(payload.get("companyId") or "demo-company"),
            filename=str(payload.get("filename") or "mcp-document.txt"),
            content_type=str(payload.get("contentType") or "text/plain"),
            data=str(payload.get("content") or "").encode("utf-8"),
        )
        return {"content": [{"type": "text", "text": f"Superparser ingestion {job.id} {job.status}"}]}

    @app.post("/v1/mcp/tools/search_documents")
    async def mcp_search_documents(request: Request) -> dict[str, Any]:
        payload = await request.json()
        results = pipeline.search(
            company_id=str(payload.get("companyId") or "demo-company"),
            query=str(payload.get("query") or ""),
            limit=int(payload.get("limit") or 5),
        )
        return {"content": [{"type": "json", "json": [result.__dict__ for result in results]}]}

    @app.post("/v1/mcp/tools/get_document_extractions")
    async def mcp_get_document_extractions(request: Request) -> dict[str, Any]:
        payload = await request.json()
        document_id = str(payload.get("documentId") or payload.get("document_id") or "")
        if not document_id:
            raise HTTPException(status_code=422, detail="documentId is required")
        return {
            "content": [
                {
                    "type": "json",
                    "json": [item.__dict__ for item in pipeline.repository.list_extractions(document_id)],
                }
            ]
        }

    return app
