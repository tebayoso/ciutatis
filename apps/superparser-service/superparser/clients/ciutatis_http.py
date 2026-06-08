from __future__ import annotations

import json
import urllib.request


class CiutatisHttpClient:
    def __init__(self, base_url: str, api_key: str, timeout_sec: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout_sec = timeout_sec

    def post_issue_comment(self, issue_id: str, body: str) -> None:
        self._request("POST", f"/api/issues/{issue_id}/comments", {"body": body})

    def put_issue_document(self, issue_id: str, key: str, title: str, body: str) -> None:
        self._request("PUT", f"/api/issues/{issue_id}/documents/{key}", {"title": title, "body": body})

    def _request(self, method: str, path: str, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(request, timeout=self.timeout_sec) as response:
            if response.status >= 400:
                raise RuntimeError(f"Ciutatis request failed with HTTP {response.status}")
