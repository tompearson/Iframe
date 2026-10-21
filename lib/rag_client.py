"""Server-side forward to documentation-helper RAG API."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


def query_timeout_seconds() -> int:
    raw = os.environ.get("EMBED_QUERY_TIMEOUT_SECONDS", "45")
    try:
        n = int(raw)
    except ValueError:
        return 45
    return n if n > 0 else 45


def rag_query(query: str) -> tuple[int, dict[str, Any]]:
    base = (os.environ.get("RAG_API_URL") or "http://127.0.0.1:8000").rstrip("/")
    secret = os.environ.get("RAG_SERVICE_SECRET", "")
    url = f"{base}/query"
    body = json.dumps({"query": query}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["Authorization"] = f"Bearer {secret}"

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    timeout = query_timeout_seconds()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
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
        reason = getattr(e, "reason", e)
        if "timed out" in str(reason).lower():
            return 504, {
                "detail": f"The assistant did not respond within {timeout} seconds. Please try again."
            }
        return 502, {"detail": f"Cannot reach RAG API at {base}: {reason}"}
