# Santosha Iframe — embeddable RAG chat

Chat widget and BFF for the Santosha Pilates RAG API ([`documentation-helper`](../documentation-helper)).

## Table of contents

1. [Status](#status)
2. [Documentation](#documentation)
3. [Local dev (two terminals)](#local-dev-two-terminals)
4. [Vercel (staging / production)](#vercel-staging--production)
5. [Repo layout](#repo-layout)

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
| [**docs/PRODUCTION_EMBED.md**](docs/PRODUCTION_EMBED.md) | Vercel + Squarespace handoff |
| [**../documentation-helper/docs/planning/RAG_API_CONTRACT.md**](../documentation-helper/docs/planning/RAG_API_CONTRACT.md) | Upstream API spec |

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

1. Import repo in Vercel.
2. Set `RAG_API_URL` and `RAG_SERVICE_SECRET`.
3. Deploy; test `/embed/` and `/demo`.

Details: [docs/PRODUCTION_EMBED.md](docs/PRODUCTION_EMBED.md).

Optional local Vercel parity: `npx vercel dev`.

---

## Repo layout

```
embed/           # widget (HTML/CSS/JS)
demo/            # mock parent site
api/query.js     # Vercel serverless BFF
lib/             # shared Python (dev_server)
dev_server.py    # local BFF + static
vercel.json      # CSP frame-ancestors, rewrites
docs/
```
