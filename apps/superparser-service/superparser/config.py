from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str | None
    google_api_key: str | None
    ciutatis_base_url: str | None
    ciutatis_agent_api_key: str | None
    cors_origins: list[str]
    shared_secret: str | None

    @staticmethod
    def from_env() -> "Settings":
        origins = os.environ.get("SUPERPARSER_CORS_ORIGINS", "http://localhost:4174,http://localhost:8088")
        return Settings(
            database_url=os.environ.get("DATABASE_URL"),
            google_api_key=os.environ.get("GOOGLE_API_KEY"),
            ciutatis_base_url=os.environ.get("CIUTATIS_BASE_URL"),
            ciutatis_agent_api_key=os.environ.get("CIUTATIS_AGENT_API_KEY"),
            cors_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
            shared_secret=os.environ.get("SUPERPARSER_SHARED_SECRET"),
        )
