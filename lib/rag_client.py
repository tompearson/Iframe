"""Server-side forward to documentation-helper RAG API."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


def rag_query(query: str) -> tuple[int, dict[str, Any]]:
    base = (os.environ.get("RAG_API_URL") or "http://127.0.0.1:8000").rstrip("/")
    secret = os.environ.get("RAG_SERVICE_SECRET", "")
    url = f"{base}/query"
    body = json.dumps({"query": query}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["Authorization"] = f"Bearer {secret}"

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(detail)
            msg = parsed.get("detail", detail)
        except json.JSONDecodeError:
            msg = detail or e.reason
        return e.code, {"detail": msg}
    except urllib.error.URLError as e:
        return 502, {"detail": f"Cannot reach RAG API at {base}: {e.reason}"}
