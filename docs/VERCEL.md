# Vercel deployment — Iframe repo

*Last updated: October 17, 2026*

## Table of contents

1. [Import project](#import-project)
2. [Environment variables](#environment-variables)
3. [Verify after deploy](#verify-after-deploy)
4. [Architecture reminders](#architecture-reminders)
5. [Troubleshooting](#troubleshooting)

---

## Import project

1. [Vercel Dashboard](https://vercel.com/new) → **Import Git Repository**.
2. Select **`tompearson/Iframe`** (GitHub).
3. **Framework Preset:** Other (static + serverless `api/`).
4. Root directory: **`.`** (repo root — contains `vercel.json`, `embed/`, `api/query.js`).
5. Build command: leave **empty** (static assets + Node serverless).
6. Add environment variables (below), then **Deploy**.

Production branch: **`main`**.

---

## Environment variables

Set for **Production** and **Preview**:

| Variable | Required | Example |
|----------|----------|---------|
| `RAG_API_URL` | Yes | `https://santoshapilates-rag.onrender.com` |
| `RAG_SERVICE_SECRET` | Yes if set on Render | same secret as Render env |
| `EMBED_MAX_TURNS_PER_SESSION` | No | `20` |
| `EMBED_MAX_TURNS_PER_IP` | No | `60` |
| `EMBED_MAX_QUERY_LENGTH` | No | `1000` |

Render RAG must have `VECTOR_STORE=pinecone` and a populated index — see [RENDER_GIT_DEPLOY.md](https://github.com/tompearson/documentation-helper/blob/site/santoshapilates/docs/planning/RENDER_GIT_DEPLOY.md).

---

## Verify after deploy

| URL | Expect |
|-----|--------|
| `https://iframe-sage-two.vercel.app/embed/` | Chat widget loads (production example) |
| `https://iframe-sage-two.vercel.app/demo` | Simple mock parent + iframe |
| `https://iframe-sage-two.vercel.app/site` | Squarespace-style nav preview + iframe |
| `https://<project>.vercel.app/embed/` | Same checks on your project hostname |
| Ask a question in widget | Answer + Sources; no secret in browser Network tab (calls `/api/query` only) |

Check response headers on `/embed/`: `Content-Security-Policy` includes `frame-ancestors` — see [`vercel.json`](../vercel.json).

---

## Architecture reminders

Read **[ARCHITECTURE_NOTES.md](ARCHITECTURE_NOTES.md)** before changing auth or limits:

- **Single-turn RAG** — each message is one Render `/query`; widget history is cosmetic.
- **Turn limits** — in-memory in `api/query.js`, not a database.
- **Sibling repo** — RAG logic stays on Render (documentation-helper), not in this Vercel project.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| 502 on `/api/query` | `RAG_API_URL`, Render cold start, `/health` on Render |
| 401 | `RAG_SERVICE_SECRET` matches Render |
| 429 | Turn limits; Clear chat (new session id) |
| Blank iframe on external site | CSP `frame-ancestors`; parent site iframe policy |
| Markdown looks raw | Hard refresh; `embed.js` loads marked/DOMPurify from CDN |

More: [PRODUCTION_EMBED.md](PRODUCTION_EMBED.md).
