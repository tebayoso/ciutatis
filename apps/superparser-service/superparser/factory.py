from __future__ import annotations

from typing import Any

from superparser.clients.ciutatis_http import CiutatisHttpClient
from superparser.clients.drive import GoogleDriveClient
from superparser.config import Settings
from superparser.core.gemini_gateway import GeminiGateway
from superparser.core.pipeline import IngestionPipeline
from superparser.integrations.ciutatis import CiutatisHeartbeatHandler, NullCiutatisClient
from superparser.storage.memory import InMemorySuperparserRepository
from superparser.storage.postgres import PostgresSuperparserRepository


def build_pipeline(settings: Settings | None = None) -> IngestionPipeline:
    settings = settings or Settings.from_env()
    repository = (
        PostgresSuperparserRepository(settings.database_url)
        if settings.database_url
        else InMemorySuperparserRepository()
    )
    gateway = GeminiGateway(api_key=settings.google_api_key)
    return IngestionPipeline(repository=repository, gemini_gateway=gateway)


def build_heartbeat_handler(
    pipeline: IngestionPipeline | None = None,
    settings: Settings | None = None,
) -> CiutatisHeartbeatHandler:
    settings = settings or Settings.from_env()
    pipeline = pipeline or build_pipeline(settings)
    if settings.ciutatis_base_url and settings.ciutatis_agent_api_key:
        client = CiutatisHttpClient(settings.ciutatis_base_url, settings.ciutatis_agent_api_key)
    else:
        client = NullCiutatisClient()
    return CiutatisHeartbeatHandler(pipeline=pipeline, ciutatis_client=client)


def build_drive_client() -> GoogleDriveClient | None:
    try:
        import google.auth  # type: ignore
    except Exception:
        return None

    try:
        credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/drive.readonly"])
    except Exception:
        return None
    return GoogleDriveClient(credentials=_refreshable(credentials))


def _refreshable(credentials: Any) -> Any:
    if hasattr(credentials, "with_scopes") and getattr(credentials, "requires_scopes", False):
        return credentials.with_scopes(["https://www.googleapis.com/auth/drive.readonly"])
    return credentials
