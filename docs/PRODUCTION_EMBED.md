# Production embed handoff (Squarespace / santoshapilates.com)

*Last updated: October 17, 2026 · See also [PLAN.md](PLAN.md)*

## Table of contents

1. [Architecture](#architecture)
2. [Deploy to Vercel](#deploy-to-vercel)
3. [Environment variables](#environment-variables)
4. [Snippet for site admin](#snippet-for-site-admin)
5. [CSP and frame-ancestors](#csp-and-frame-ancestors)
6. [CORS](#cors)
7. [Local vs preview vs production](#local-vs-preview-vs-production)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

- **Render** hosts RAG only (`documentation-helper` → `POST /query` + Bearer).
- **Vercel** (this repo) hosts the iframe UI + **`/api/query` BFF** — secrets stay in Vercel env, not in the browser.
- Contract: [`documentation-helper/docs/planning/RAG_API_CONTRACT.md`](../../documentation-helper/docs/planning/RAG_API_CONTRACT.md).

---

## Deploy to Vercel

1. Push this repo to GitHub (or import into Vercel).
2. **New Project** → root directory = repo root (contains `vercel.json`, `embed/`, `api/`).
3. Set **Environment Variables** (Production + Preview) — see table below.
4. Deploy. Test:
   - `https://<project>.vercel.app/embed/` — widget standalone
   - `https://<project>.vercel.app/demo` — mock parent + iframe
5. Before Squarespace go-live, tighten `frame-ancestors` in [`vercel.json`](../vercel.json) if needed.

Local parity: `npx vercel dev` (requires Vercel CLI) or `python3 dev_server.py`.

---

## Environment variables

| Variable | Required | Example |
|----------|----------|---------|
| `RAG_API_URL` | Yes | `https://santoshapilates-rag.onrender.com` |
| `RAG_SERVICE_SECRET` | Yes (if set on Render) | same as Render env |
| `EMBED_MAX_TURNS_PER_SESSION` | No | `20` |
| `EMBED_MAX_TURNS_PER_IP` | No | `60` |
| `EMBED_MAX_QUERY_LENGTH` | No | `1000` |

Render must have `VECTOR_STORE=pinecone` and populated index — see documentation-helper Render docs.

---

## Snippet for site admin

Replace the host with your **Vercel production** URL:

```html
<iframe
  src="https://YOUR-PROJECT.vercel.app/embed/"
  title="Santosha Pilates assistant"
  style="border:0;width:100%;max-width:420px;height:560px;"
  loading="lazy"
></iframe>
```

---

## CSP and frame-ancestors

Configured in [`vercel.json`](../vercel.json) for `/embed/*`. Production should allow:

- `https://www.santoshapilates.com`
- `https://santoshapilates.com`

Preview/dev may include `'self'` and localhost patterns.

If the iframe is blank on Squarespace, check browser console for CSP violations and Squarespace’s allowed iframe sources.

---

## CORS

The widget calls **same-origin** `/api/query` on Vercel — **no CORS** required for the default path.

Do **not** point browser JS at Render `/query` with a leaked Bearer token. Render CORS is optional and discouraged — see RAG API contract.

---

## Local vs preview vs production

| Environment | Parent mock | Widget | BFF |
|-------------|-------------|--------|-----|
| Local | `http://127.0.0.1:8780/demo` | `/embed/` | `dev_server.py` |
| Vercel preview | `https://*.vercel.app/demo` | `/embed/` | `/api/query` |
| Production | santoshapilates.com | Vercel `/embed/` | Vercel `/api/query` |

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Blank iframe | CSP `frame-ancestors`; parent site iframe policy |
| 502 from chat | `RAG_API_URL`, Render `/health`, cold start |
| 401 | `RAG_SERVICE_SECRET` matches Render |
| 429 | Turn limits — new session (Clear chat) or wait |
| CORS errors in console | Widget should use `/api/query` on same host as `/embed/` |
