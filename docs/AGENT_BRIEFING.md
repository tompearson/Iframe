# Agent briefing — current repo state

*For Cursor / Vercel agents auditing **tompearson/Iframe**. Last updated: October 17, 2026.*

Read this before reporting "documentation gaps." Intentional design choices are **not** missing work.

## Table of contents

1. [What this repo is](#what-this-repo-is)
2. [GitHub & related repos](#github--related-repos)
3. [Implemented (not pending)](#implemented-not-pending)
4. [By design — do not flag as gaps](#by-design--do-not-flag-as-gaps)
5. [Where to look in the tree](#where-to-look-in-the-tree)

---

## What this repo is

Embeddable **chat widget** + **BFF** (`/api/query`) for Santosha Pilates RAG. **No** ingest, **no** Gemini keys in the browser, **no** vector DB here.

---

## GitHub & related repos

| Repo | URL | Deploy |
|------|-----|--------|
| **Iframe** (this repo) | https://github.com/tompearson/Iframe | **Vercel** |
| **documentation-helper** (RAG API) | https://github.com/tompearson/documentation-helper (`site/santoshapilates`) | **Render** |
| **Santosha** (index README only) | https://github.com/tompearson/Santosha | — |

Remote is **configured** (`origin` → `tompearson/Iframe`, branch `main`). Not TBD.

---

## Implemented (not pending)

- Local: `dev_server.py`, `embed/`, `demo/parent.html`, `scripts/start-local-demo.sh`
- Vercel: `api/query.js`, `vercel.json`, CSP `frame-ancestors`
- Docs: `VERCEL.md`, `PRODUCTION_EMBED.md`, `ARCHITECTURE_NOTES.md`, `RAG_API_CONTRACT` (upstream)
- Markdown rendering in widget (marked + DOMPurify)

See [PLAN.md — Implementation todos](PLAN.md#implementation-todos) (all **done**).

---

## By design — do not flag as gaps

| Topic | Actual behavior |
|-------|-----------------|
| **Session / turn limits** | **In-memory** in BFF (`lib/limits.py`, `api/query.js`). **No database** in v1. |
| **RAG conversation** | **Single-turn** per `POST /query`; only the latest user message is sent upstream. |
| **Chat thread in UI** | **Client-side display only** — not sent to RAG as history. |
| **`X-Embed-Session-Id`** | Rate limiting only — **not** authentication or server-side memory. |
| **CORS on Render** | Browser should call **Vercel `/api/query`**, not Render directly. Render CORS optional/deferred. |
| **Santosha parent folder** | Optional local layout; navigation README is **tompearson/Santosha**, not required inside this clone. |
| **Squarespace** | Example CMS in handoff docs — **not verified**; use generic "site admin" if unsure. |

Details: [ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md).

---

## Where to look in the tree

| Question | File |
|----------|------|
| Agent rules | [`AGENTS.md`](../AGENTS.md) |
| Vercel env & verify | [`VERCEL.md`](VERCEL.md) |
| Limits & single-turn | [`ARCHITECTURE_NOTES.md`](ARCHITECTURE_NOTES.md) |
| Upstream API | [RAG_API_CONTRACT.md](https://github.com/tompearson/documentation-helper/blob/site/santoshapilates/docs/planning/RAG_API_CONTRACT.md) |
