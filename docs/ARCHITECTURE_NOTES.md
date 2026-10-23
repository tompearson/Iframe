# Architecture notes (agents & operators)

*Last updated: October 22, 2026*

Explicit behavior that is easy to misread when deploying **Iframe** on Vercel against **documentation-helper** on Render.

## Table of contents

1. [Two repos, two deploys](#two-repos-two-deploys)
2. [Conversation model (single-turn RAG)](#conversation-model-single-turn-rag)
3. [Session IDs and rate limits](#session-ids-and-rate-limits)
4. [No database](#no-database)
5. [Security boundary](#security-boundary)
6. [Answer pipeline & third-party integrations](#answer-pipeline--third-party-integrations)

---

## Two repos, two deploys

| Repo | Host | URL role |
|------|------|----------|
| [tompearson/documentation-helper](https://github.com/tompearson/documentation-helper) | **Render** | RAG API only — `GET /health`, `POST /query` |
| [tompearson/Iframe](https://github.com/tompearson/Iframe) | **Vercel** | Static `/embed/`, mock `/demo`, BFF `POST /api/query` |

This repo is **standalone** on GitHub. It is **not** a subdirectory of documentation-helper. Local clone layout may be `~/Projects/Santosha/Iframe` next to `documentation-helper` — that folder is for convenience only.

Parent folder overview (not a git repo): `~/Projects/Santosha/README.md`.

---

## Conversation model (single-turn RAG)

Each user message triggers **one** upstream call:

```text
POST /query  { "query": "latest user message only" }
```

The RAG backend ([`run_llm`](https://github.com/tompearson/documentation-helper/blob/site/santoshapilates/backend/core_gemini.py) in documentation-helper) does **not** receive prior turns.

| What | Where it lives |
|------|----------------|
| Chat bubbles in the widget | **Browser only** (DOM + optional display history) |
| Follow-up context for retrieval | **Not sent** — each question is answered independently |
| Future multi-turn RAG | Requires API changes in documentation-helper (out of scope for Iframe v1) |

The UI may *look* like a thread; only the **current** question affects the answer.

---

## Session IDs and rate limits

The widget generates `embedSessionId` in **`sessionStorage`** and sends **`X-Embed-Session-Id`** on each `POST /api/query`.

| Purpose | Not used for |
|---------|----------------|
| Per-session and per-IP **turn caps** (protect Gemini quota) | Login, identity, or chat memory |

Limits are enforced in:

- Local: [`dev_server.py`](../dev_server.py) + [`lib/limits.py`](../lib/limits.py)
- Vercel: [`api/query.js`](../api/query.js)

Env knobs: `EMBED_MAX_TURNS_PER_SESSION`, `EMBED_MAX_TURNS_PER_IP` (see [`.env.example`](../.env.example)).

---

## No database

There is **no** Redis, Postgres, or Vercel KV for quotas or sessions in v1.

| Effect | Implication |
|--------|-------------|
| Counters live **in memory** per BFF process | Resets on redeploy / cold start |
| Serverless (Vercel) | Limits are **per instance**, not global — enough for demo/low traffic |
| Upgrade path | External store or edge KV if you need strict global caps |

---

## Security boundary

- Browser → **same-origin** `/api/query` on Vercel (or local dev server).
- BFF → Render `POST /query` with **`RAG_SERVICE_SECRET`** (server env only).
- Do **not** expose Bearer token or `GEMINI_API_KEY` in client JS.

See [RAG API contract](https://github.com/tompearson/documentation-helper/blob/site/santoshapilates/docs/planning/RAG_API_CONTRACT.md) and [PRODUCTION_EMBED.md](PRODUCTION_EMBED.md).

---

## Answer pipeline & third-party integrations

Citation cleanup and **Sources** footer behavior are implemented mainly in **`embed/embed.src.js`**, not in the JSON from Render.

| Client integration | Same UX as production iframe? |
|--------------------|-------------------------------|
| **Iframe `/embed/`** (official widget) | **Yes** |
| Custom UI calling **`/api/query`** or Render **`/query`** | **No** — unless they reimplement embed logic or we normalize on the server |

**Supported product path:** host the widget URL in an iframe; do not rebuild chat against the API unless the project explicitly owns parity testing.

Full layer table and migration plan (move normalization to RAG, thin embed): **[ANSWER_PIPELINE.md](ANSWER_PIPELINE.md)**.
