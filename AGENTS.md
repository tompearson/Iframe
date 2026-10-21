# Cursor agent instructions — Santosha Iframe (embed chat)

*Last updated: October 17, 2026*

This repo is the **embeddable chat widget** and **BFF** for Santosha Pilates RAG. It is intentionally **separate** from [`documentation-helper`](../documentation-helper), which owns ingest, vector store, and the Render FastAPI (`POST /query`).

**Read first (audits / “what are the gaps?”):** [`docs/AGENT_BRIEFING.md`](docs/AGENT_BRIEFING.md) → [`docs/ARCHITECTURE_NOTES.md`](docs/ARCHITECTURE_NOTES.md) → [`docs/VERCEL.md`](docs/VERCEL.md). Historical plan: [`docs/PLAN.md`](docs/PLAN.md).

## Scope

| In this repo | In documentation-helper |
|--------------|-------------------------|
| Vanilla embed UI (`embed/`), mock parent (`demo/`) | `ingestion_gemini.py`, Pinecone, `backend/core_gemini.py` |
| Local `dev_server.py` (proxy + static) | `rag_api_gemini.py` on Render |
| Vercel `/api/query` serverless → Render | `RAG_SERVICE_SECRET`, `GEMINI_API_KEY` (never in browser JS) |
| Turn limits (in-memory, no DB) | Streamlit dev UI (`main_gemini.py`) |

## Git

- **Remote:** https://github.com/tompearson/Iframe — branch **`main`**
- **Do not commit or push** unless the user explicitly asks.
- Do **not** commit `.env` (contains `RAG_SERVICE_SECRET`).
- Standalone repo (not part of documentation-helper). Local path often `~/Projects/Santosha/Iframe` beside [`documentation-helper`](../documentation-helper).

## Behavior (read before changing limits or chat UX)

See **[docs/ARCHITECTURE_NOTES.md](docs/ARCHITECTURE_NOTES.md)**:

- RAG is **single-turn** per request; widget thread is **client display only**.
- **`X-Embed-Session-Id`** is for **in-memory turn limits**, not auth or server-side memory.
- **No database** for sessions/quota (v1).

## Security rules for agents

1. **Never** put `RAG_SERVICE_SECRET`, `GEMINI_API_KEY`, or Pinecone keys in client-side JS or HTML.
2. Browser calls **same-origin** `/api/query` only (dev server or Vercel BFF).
3. BFF forwards to `RAG_API_URL` with `Authorization: Bearer` server-side.
4. Session id (`X-Embed-Session-Id`) is for **rate limits**, not authentication.

## Local dev (two terminals)

**Terminal 1 — RAG API** (sibling repo):

```bash
export PATH="$HOME/.local/bin:$PATH"
cd ~/Projects/Santosha/documentation-helper
pipenv run uvicorn rag_api:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — Iframe** (after `dev_server.py` exists):

```bash
cd ~/Projects/Santosha/Iframe
cp .env.example .env   # RAG_API_URL + RAG_SERVICE_SECRET (match documentation-helper .env)
python dev_server.py
```

**One command:** `./scripts/start-local-demo.sh` (RAG + embed; see README). Or open mock parent URL from dev server output.

**Linux:** use `pipenv run` / `python3` in documentation-helper; do **not** assume `python` on PATH.

## Local test reminders (for agents)

When telling the user to **test locally**, always say what to restart:

| What changed | Restart |
|--------------|---------|
| **`documentation-helper`** (`core_gemini.py`, `rag_api*.py`, RAG behavior) | **RAG API** — stop/start: `pipenv run uvicorn rag_api:app --host 127.0.0.1 --port 8000` in `documentation-helper` (unless uvicorn was started with `--reload`). **Iframe `dev_server.py` does not need a restart** for RAG-only edits. |
| **`Iframe/.env`** (e.g. `RAG_API_URL`, `RAG_SERVICE_SECRET`, `EMBED_QUERY_TIMEOUT_SECONDS`) | **Both:** `.env` is read at process start — restart **`python3 dev_server.py`** and restart **RAG uvicorn** if that repo’s `.env` changed too. |
| **`dev_server.py`**, `lib/rag_client.py`, `lib/limits.py` | Restart **`python3 dev_server.py`** only. |
| **`embed/`** static (`embed.js`, CSS) | Browser refresh; rebuild with `scripts/build_embed.py` if you edited `embed.src.js`. Restart dev server only if it injects config into `/embed/` (timeout ms from `.env`). |
| **Production** | Render deploy (RAG); Vercel deploy (Iframe) — local restarts do not apply. |

Also remind: after **`.env` changes**, restart the processes that load it (see table); a refresh alone is not enough.

## Implementation order (from plan)

1. `dev_server.py` + `embed/` UI + `demo/parent.html` (Phase 1)
2. `docs/PRODUCTION_EMBED.md` + Vercel `api/query` + `vercel.json` (Phase 2)
3. documentation-helper: optional `RAG_API_CONTRACT.md` only (sibling repo change)

## Key paths (target layout)

```
Iframe/
├── AGENTS.md              # this file
├── docs/PLAN.md           # master plan (sync with Cursor plan when architecture changes)
├── docs/PRODUCTION_EMBED.md
├── embed/                 # widget static assets
├── demo/                  # mock business site + iframe
├── api/                   # Vercel serverless (Phase 2)
├── dev_server.py          # local BFF + static (Phase 1)
├── vercel.json
├── .env.example
└── README.md
```

## References

- Embed widget: edit `embed/embed.src.js`, then `python3 scripts/build_embed.py` (production `embed.js`)
- Vercel: [docs/VERCEL.md](docs/VERCEL.md)
- RAG API: `http://127.0.0.1:8000/openapi.json` (local) or Render production URL
- Render deploy: [`documentation-helper/docs/planning/RENDER_GIT_DEPLOY.md`](../documentation-helper/docs/planning/RENDER_GIT_DEPLOY.md)
- Recrawl content: [`documentation-helper/TAVILY_RECRAWL.md`](../documentation-helper/TAVILY_RECRAWL.md)
