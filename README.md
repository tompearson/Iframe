# Santosha Iframe — embeddable RAG chat

Chat widget and BFF for the Santosha Pilates RAG API ([`documentation-helper`](../documentation-helper)). **Project index:** [tompearson/Santosha](https://github.com/tompearson/Santosha).

## Table of contents

1. [Status](#status)
2. [Documentation](#documentation)
3. [One command (recommended)](#one-command-recommended)
4. [Local dev (two terminals)](#local-dev-two-terminals)
5. [Vercel (staging / production)](#vercel-staging--production)
6. [Architecture notes (limits, single-turn)](#architecture-notes-limits-single-turn)
7. [Repo layout](#repo-layout)

---

## Status

| Phase | State |
|-------|--------|
| Repo + plan | Done |
| Local `dev_server.py` + embed UI + `/demo` | Done |
| Vercel `api/query.js` + `vercel.json` | Done |

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [**AGENTS.md**](AGENTS.md) | Cursor agent rules |
| [**docs/PLAN.md**](docs/PLAN.md) | Architecture and phases |
| [**docs/PRODUCTION_EMBED.md**](docs/PRODUCTION_EMBED.md) | Site admin iframe handoff |
| [**docs/VERCEL.md**](docs/VERCEL.md) | Vercel import, env vars, verify |
| [**docs/ARCHITECTURE_NOTES.md**](docs/ARCHITECTURE_NOTES.md) | Single-turn RAG, in-memory limits, no DB |
| [**../documentation-helper/docs/planning/RAG_API_CONTRACT.md**](../documentation-helper/docs/planning/RAG_API_CONTRACT.md) | Upstream API spec |

---

## One command (recommended)

From the Iframe repo (after `cp .env.example .env` and matching `RAG_SERVICE_SECRET` to documentation-helper):

```bash
cd ~/Projects/Santosha/Iframe
./scripts/start-local-demo.sh
```

Optional: open the demo page in your browser:

```bash
./scripts/start-local-demo.sh --open
```

Starts **uvicorn** on `127.0.0.1:8000` and **`dev_server.py`** on `127.0.0.1:8780`.

| Situation | Default behavior |
|-----------|------------------|
| RAG `/health` OK on `:8000` | **Reuse** — does not restart uvicorn |
| Embed `/embed/` OK on `:8780` | **Reuse** — does not restart dev server |
| Port busy, wrong app | **Error** with hints (no silent kill) |
| Want a clean restart | `./scripts/start-local-demo.sh --kill` |
| Want other ports | `RAG_PORT=8001 EMBED_DEV_PORT=8781 ./scripts/start-local-demo.sh` (script sets `RAG_API_URL` for the proxy) |

**Ctrl+C** stops only processes **this script started**. If both were already running, Ctrl+C just exits the script.

---

## Local dev (two terminals)

**Terminal 1 — RAG API**

```bash
export PATH="$HOME/.local/bin:$PATH"
cd ~/Projects/Santosha/documentation-helper
pipenv run uvicorn rag_api:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — embed BFF + UI**

```bash
cd ~/Projects/Santosha/Iframe
cp .env.example .env   # set RAG_SERVICE_SECRET to match documentation-helper
python3 dev_server.py
```

Open **http://127.0.0.1:8780/demo/** (mock parent + iframe). Widget only: **http://127.0.0.1:8780/embed/**.

---

## Vercel (staging / production)

**GitHub:** [github.com/tompearson/Iframe](https://github.com/tompearson/Iframe)

Step-by-step: **[docs/VERCEL.md](docs/VERCEL.md)** (env vars, verify URLs). Go-live snippet: [docs/PRODUCTION_EMBED.md](docs/PRODUCTION_EMBED.md).

---

## Architecture notes (limits, single-turn)

| Topic | v1 behavior |
|-------|-------------|
| **RAG memory** | **Single-turn** — each message sends only that question to Render `/query` |
| **Chat UI history** | **Client-side display only** — does not change retrieval |
| **Session id header** | Rate limiting only (`EMBED_MAX_TURNS_*`), not authentication |
| **Quota storage** | **In-memory** in BFF (`dev_server` / `api/query.js`) — no database |

Details: [docs/ARCHITECTURE_NOTES.md](docs/ARCHITECTURE_NOTES.md). Upstream API: [RAG_API_CONTRACT.md](../documentation-helper/docs/planning/RAG_API_CONTRACT.md).

Optional local Vercel parity: `npx vercel dev`.

---

## Repo layout

```
embed/           # widget (HTML/CSS/JS)
demo/            # mock parent site
api/query.js     # Vercel serverless BFF
lib/             # shared Python (dev_server)
dev_server.py    # local BFF + static
scripts/start-local-demo.sh  # RAG + embed one command
vercel.json      # CSP frame-ancestors, rewrites
docs/
```
