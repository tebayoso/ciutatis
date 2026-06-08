from superparser.core.drive_metadata import map_drive_source_metadata


def test_maps_drive_file_revision_and_activity_metadata():
    metadata = map_drive_source_metadata(
        file={
            "id": "drive-123",
            "name": "Budget hearing notes",
            "mimeType": "application/vnd.google-apps.document",
            "owners": [{"displayName": "Clerk Office", "emailAddress": "clerk@example.gov"}],
            "lastModifyingUser": {"displayName": "Budget Analyst", "emailAddress": "budget@example.gov"},
            "createdTime": "2026-06-01T12:00:00Z",
            "modifiedTime": "2026-06-03T15:30:00Z",
            "webViewLink": "https://docs.google.com/document/d/drive-123",
            "exportLinks": {"text/plain": "https://export.example/plain"},
        },
        revisions=[
            {
                "id": "1",
                "modifiedTime": "2026-06-02T10:00:00Z",
                "lastModifyingUser": {"displayName": "Editor One", "emailAddress": "editor@example.gov"},
            }
        ],
        activities=[
            {
                "primaryActionDetail": {"edit": {}},
                "actors": [{"user": {"knownUser": {"personName": "people/1"}}}],
                "timestamp": "2026-06-02T10:05:00Z",
            }
        ],
    )

    assert metadata.source_id == "drive-123"
    assert metadata.title == "Budget hearing notes"
    assert metadata.owners[0]["email"] == "clerk@example.gov"
    assert metadata.last_modifier["name"] == "Budget Analyst"
    assert metadata.raw["revisionCount"] == 1
    assert metadata.raw["activityCount"] == 1
    assert metadata.raw["exportLinks"]["text/plain"] == "https://export.example/plain"
