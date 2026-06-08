from __future__ import annotations

import io
from dataclasses import dataclass
from urllib.parse import parse_qs, urlparse
from typing import Any

from superparser.core.drive_metadata import map_drive_source_metadata
from superparser.core.models import DriveSourceMetadata


@dataclass(frozen=True)
class DriveFetchResult:
    filename: str
    content_type: str
    data: bytes
    metadata: DriveSourceMetadata


class GoogleDriveClient:
    def __init__(self, credentials: Any | None = None):
        self.credentials = credentials

    def fetch_file(self, file_id: str) -> DriveFetchResult:  # pragma: no cover - requires Google credentials
        from googleapiclient.discovery import build  # type: ignore
        from googleapiclient.http import MediaIoBaseDownload  # type: ignore

        service = build("drive", "v3", credentials=self.credentials)
        fields = (
            "id,name,mimeType,owners(displayName,emailAddress),"
            "lastModifyingUser(displayName,emailAddress),createdTime,modifiedTime,"
            "webViewLink,exportLinks,size,version,originalFilename"
        )
        file = service.files().get(fileId=file_id, fields=fields, supportsAllDrives=True).execute()
        revisions = service.revisions().list(
            fileId=file_id,
            fields="revisions(id,modifiedTime,lastModifyingUser(displayName,emailAddress))",
        ).execute().get("revisions", [])

        if str(file.get("mimeType", "")).startswith("application/vnd.google-apps."):
            content_type = _export_content_type(file.get("mimeType"))
            request = service.files().export_media(fileId=file_id, mimeType=content_type)
            filename = f"{file.get('name', file_id)}.{_extension_for(content_type)}"
        else:
            content_type = file.get("mimeType") or "application/octet-stream"
            request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
            filename = file.get("name") or file.get("originalFilename") or file_id

        buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(buffer, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

        return DriveFetchResult(
            filename=filename,
            content_type=content_type,
            data=buffer.getvalue(),
            metadata=map_drive_source_metadata(file, revisions=revisions, activities=[]),
        )


def extract_drive_file_id(value: str) -> str:
    candidate = value.strip()
    if not candidate:
        raise ValueError("Drive file id is required")
    if "://" not in candidate:
        return candidate

    parsed = urlparse(candidate)
    query_id = parse_qs(parsed.query).get("id", [None])[0]
    if query_id:
        return query_id

    parts = [part for part in parsed.path.split("/") if part]
    if "d" in parts:
        index = parts.index("d")
        if index + 1 < len(parts):
            return parts[index + 1]
    if "folders" in parts:
        index = parts.index("folders")
        if index + 1 < len(parts):
            return parts[index + 1]
    raise ValueError("Could not parse Drive file id from URL")


def _export_content_type(mime_type: str | None) -> str:
    if mime_type == "application/vnd.google-apps.spreadsheet":
        return "text/csv"
    return "text/plain"


def _extension_for(content_type: str) -> str:
    return "csv" if content_type == "text/csv" else "txt"
