# Production embed handoff (Squarespace / santoshapilates.com)

*Placeholder — fill in during Phase 2 (Vercel). See [PLAN.md](PLAN.md).*

## Table of contents

1. [Production iframe URL](#production-iframe-url)
2. [Snippet for site admin](#snippet-for-site-admin)
3. [CSP and frame-ancestors](#csp-and-frame-ancestors)
4. [Vercel environment variables](#vercel-environment-variables)
5. [Troubleshooting](#troubleshooting)

---

## Production iframe URL

TBD after Vercel production deploy (e.g. `https://<project>.vercel.app/embed/` or custom domain).

## Snippet for site admin

```html
<!-- Replace src with production embed URL -->
<iframe
  src="https://YOUR-VERCEL-HOST/embed/"
  title="Santosha Pilates assistant"
  style="border:0;width:100%;max-width:420px;height:560px;"
  loading="lazy"
></iframe>
```

## CSP and frame-ancestors

Configured on the **embed host** (Vercel), not on documentation-helper. Production must allow `https://www.santoshapilates.com` and `https://santoshapilates.com` as frame ancestors.

## Vercel environment variables

| Variable | Purpose |
|----------|---------|
| `RAG_API_URL` | Render RAG base, e.g. `https://santoshapilates-rag.onrender.com` |
| `RAG_SERVICE_SECRET` | Bearer for server-side `/query` (never expose to browser) |

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Blank iframe | Browser console; CSP `frame-ancestors`; Squarespace iframe allowlist |
| 401 / 502 from chat | Vercel env secrets; Render `/health` |
| 429 | Turn limits — expected under abuse; adjust env on BFF |
