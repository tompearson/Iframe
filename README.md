# Santosha Iframe — embeddable RAG chat

Chat widget and BFF for the Santosha Pilates documentation RAG API ([`documentation-helper`](../documentation-helper)). Designed to demo locally and embed on [santoshapilates.com](https://www.santoshapilates.com/) via iframe (production host: **Vercel**, planned).

## Table of contents

1. [Status](#status)
2. [Documentation for agents and humans](#documentation-for-agents-and-humans)
3. [When to work in this repo vs documentation-helper](#when-to-work-in-this-repo-vs-documentation-helper)
4. [Quick start (after Phase 1 is implemented)](#quick-start-after-phase-1-is-implemented)
5. [Repo layout](#repo-layout)

---

## Status

| Phase | State |
|-------|--------|
| Repo scaffold + plan | **Done** |
| Local embed UI + `dev_server.py` | Not started — see [docs/PLAN.md](docs/PLAN.md) |
| Vercel staging | Not started |

---

## Documentation for agents and humans

| Doc | Purpose |
|-----|---------|
| [**AGENTS.md**](AGENTS.md) | Cursor agent rules, security, two-terminal workflow |
| [**docs/PLAN.md**](docs/PLAN.md) | Architecture, CORS/Vercel, phases, todos |
| [**docs/PRODUCTION_EMBED.md**](docs/PRODUCTION_EMBED.md) | Squarespace handoff (Phase 2) |

---

## When to work in this repo vs documentation-helper

| Task | Repo |
|------|------|
| Tavily recrawl, Pinecone ingest, Render RAG API | `documentation-helper` |
| Chat widget UI, iframe demo, turn limits, Vercel BFF | **Iframe** (here) |

Create **Iframe** once the plan is agreed (done). Implement **Phase 1** when `uvicorn rag_api:app` returns good answers on `/query` locally or on Render.

---

## Quick start (after Phase 1 is implemented)

```bash
# Terminal 1 — RAG
cd ~/Projects/Santosha/documentation-helper
export PATH="$HOME/.local/bin:$PATH"
pipenv run uvicorn rag_api:app --host 127.0.0.1 --port 8000

# Terminal 2 — embed (coming soon)
cd ~/Projects/Santosha/Iframe
cp .env.example .env
python dev_server.py
```

---

## Repo layout

```
embed/          # widget (Phase 1)
demo/           # mock parent site (Phase 1)
api/            # Vercel serverless (Phase 2)
dev_server.py   # local BFF (Phase 1)
docs/           # PLAN.md, PRODUCTION_EMBED.md
```

No Pipenv required here for v1 (stdlib Python dev server planned).
