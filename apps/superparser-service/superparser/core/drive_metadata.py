from __future__ import annotations

from typing import Any

from .models import DriveSourceMetadata


def map_drive_source_metadata(
    file: dict[str, Any],
    revisions: list[dict[str, Any]] | None = None,
    activities: list[dict[str, Any]] | None = None,
) -> DriveSourceMetadata:
    revisions = revisions or []
    activities = activities or []
    return DriveSourceMetadata(
        source_id=str(file.get("id") or ""),
        title=str(file.get("name") or "Untitled Drive document"),
        mime_type=file.get("mimeType"),
        owners=[_map_user(user) for user in file.get("owners", [])],
        last_modifier=_map_user(file["lastModifyingUser"]) if file.get("lastModifyingUser") else None,
        created_time=file.get("createdTime"),
        modified_time=file.get("modifiedTime"),
        web_view_link=file.get("webViewLink"),
        raw={
            "file": file,
            "revisionCount": len(revisions),
            "activityCount": len(activities),
            "revisions": revisions,
            "activities": activities,
            "exportLinks": file.get("exportLinks", {}),
        },
    )


def _map_user(user: dict[str, Any]) -> dict[str, str]:
    return {
        "name": str(user.get("displayName") or user.get("name") or "Unknown user"),
        "email": str(user.get("emailAddress") or ""),
    }
