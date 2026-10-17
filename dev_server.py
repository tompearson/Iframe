#!/usr/bin/env python3
"""
Local BFF + static server for embed widget and demo parent (Phase 1).

  python3 dev_server.py

Requires .env with RAG_API_URL and RAG_SERVICE_SECRET (match documentation-helper).
Terminal 1: pipenv run uvicorn rag_api:app --host 127.0.0.1 --port 8000
"""

from __future__ import annotations

import json
import mimetypes
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent

# Load .env without extra dependency
_env = ROOT / ".env"
if _env.is_file():
    for line in _env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

from lib.limits import TurnLimiter
from lib.rag_client import rag_query

LIMITER = TurnLimiter()
HOST = os.environ.get("EMBED_DEV_HOST", "127.0.0.1")
PORT = int(os.environ.get("EMBED_DEV_PORT", "8780"))
MAX_QUERY_LEN = int(os.environ.get("EMBED_MAX_QUERY_LENGTH", "1000"))


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _file_response(handler: BaseHTTPRequestHandler, path: Path) -> None:
    if not path.is_file():
        handler.send_error(404)
        return
    data = path.read_bytes()
    ctype, _ = mimetypes.guess_type(str(path))
    handler.send_response(200)
    handler.send_header("Content-Type", ctype or "application/octet-stream")
    handler.send_header("Content-Length", str(len(data)))
    if path.suffix in {".html", ".js"}:
        handler.send_header(
            "Content-Security-Policy",
            "frame-ancestors 'self' http://127.0.0.1:* http://localhost:*",
        )
    handler.end_headers()
    handler.wfile.write(data)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        if path in ("/", "/demo"):
            return _file_response(self, ROOT / "demo" / "parent.html")
        if path == "/site":
            return _file_response(self, ROOT / "demo" / "site-preview.html")
        if path.startswith("/demo/"):
            rel = path[len("/demo/") :].lstrip("/")
            target = (ROOT / "demo" / rel).resolve()
            if not str(target).startswith(str((ROOT / "demo").resolve())):
                self.send_error(403)
                return
            return _file_response(self, target)
        if path == "/embed" or path.startswith("/embed/"):
            rel = path[len("/embed") :].lstrip("/") or "index.html"
            target = (ROOT / "embed" / rel).resolve()
            if not str(target).startswith(str((ROOT / "embed").resolve())):
                self.send_error(403)
                return
            return _file_response(self, target)
        self.send_error(404)

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/query":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b""
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return _json_response(self, 400, {"detail": "Invalid JSON body"})

        query = (body.get("query") or "").strip()
        if not query:
            return _json_response(self, 400, {"detail": "query is required"})
        if len(query) > MAX_QUERY_LEN:
            return _json_response(self, 400, {"detail": f"query exceeds {MAX_QUERY_LEN} characters"})

        session_id = self.headers.get("X-Embed-Session-Id")
        client_ip = self.headers.get("X-Forwarded-For", self.client_address[0]).split(",")[0].strip()
        ok, msg = LIMITER.check_and_record(session_id, client_ip)
        if not ok:
            return _json_response(self, 429, {"detail": msg, "turnsRemaining": 0})

        status, data = rag_query(query)
        if status >= 400:
            return _json_response(self, status, data if isinstance(data, dict) else {"detail": str(data)})

        if isinstance(data, dict):
            data.setdefault("turnsRemaining", int(msg) if msg.isdigit() else None)
        return _json_response(self, 200, data)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Santosha embed dev server http://{HOST}:{PORT}/demo/")
    print(f"  Site preview:  http://{HOST}:{PORT}/site")
    print(f"  Widget direct: http://{HOST}:{PORT}/embed/")
    print(f"  RAG upstream:  {os.environ.get('RAG_API_URL', 'http://127.0.0.1:8000')}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()
