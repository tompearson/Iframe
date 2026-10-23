# Answer pipeline — integration contract

*Where citation and display logic live today, and how to keep third-party embeds consistent.*

## Supported integration (production)

| Integration | Supported? | Consistent UX? |
|-------------|------------|----------------|
| **Iframe → `/embed/`** (official widget on Vercel) | **Yes** | **Yes** — ships `embed.js` |
| Custom site UI calling **`POST /api/query`** on the embed host | Possible | **No** — JSON is mostly raw RAG output |
| Custom UI calling **Render `POST /query` directly** | Possible (needs secret) | **No** — bypasses BFF and widget |

**Web designers and client sites should only iframe the hosted widget.** See [WEB_DESIGNER_EMBED_GUIDE.md](WEB_DESIGNER_EMBED_GUIDE.md).

Custom chat UIs are not a supported product surface unless the team duplicates normalization or we move it server-side (below).

---

## What `/query` returns vs what users see

```text
Render POST /query  →  { answer, sources, … }
        ↓
Vercel POST /api/query  →  forwards + turn limits (+ timeout)
        ↓
embed.js  →  enrich, markdown repair, link collapse, marked, Sources footer
        ↓
Browser
```

| Field | Typical content today | Normalized for all clients? |
|-------|----------------------|-----------------------------|
| **`answer`** | Model prose (often bare URLs, duplicate links) | **No** — widget fixes many cases in `embed.src.js` |
| **`sources`** | Retrieval URLs; empty when answer is “not on site” (RAG) | **Partly** — RAG `answer_signals`; embed still merges/filters for display |

Anyone who reads **`answer` only** from the API will **not** get the same strings as the official iframe unless they reimplement the embed pipeline.

---

## Logic by layer (current)

| Behavior | documentation-helper (RAG) | Iframe BFF | `embed.src.js` |
|----------|---------------------------|------------|----------------|
| Prompt, tone, citation rules | `core_gemini.py` | — | — |
| Empty **`sources`** on not-found | `answer_signals` + `rag_api_gemini.py` | — | Hides Sources + skips enrich |
| Turn limits, timeout | — | `api/query.js`, `dev_server.py` | Client fetch timeout |
| Enrich when model omits links | — | — | `enrichAnswerWithSourceLinks` |
| One shared URL (staff lists) | Prompt | — | `collapseSingleSharedSourceCitations` |
| One link per line (comma URLs) | Prompt | — | `oneCitationLinkPerLine`, `prepareAssistantMarkdown` |
| **Sources** footer list | — | — | `mergeDisplaySources` |
| Markdown → HTML, mobile WebKit | — | — | `marked`, DOMPurify, link passes |

---

## Target architecture (phased)

**Goal:** Any client of **`POST /query`** (Render or BFF) gets the same **`answer`** and **`sources`**; the widget only renders.

| Phase | Work | Repo |
|-------|------|------|
| **1 (now)** | Document contract; official path = `/embed/` | Iframe docs |
| **2** | **`sources`** policy entirely on Render (cited URLs only, filters) | documentation-helper |
| **3** | **`answer`** post-process on Render (dedupe links, markdown shape) — single implementation | documentation-helper |
| **4** | BFF passthrough; **thin embed** (sanitize + styling only) | Both |

Avoid maintaining the same rules in **Python and JavaScript**. Prefer one normalization module on **Render**, then delete duplicate logic from `embed.src.js` once parity is tested.

---

## References

- RAG API: [RAG_API_CONTRACT.md](https://github.com/tompearson/documentation-helper/blob/site/santoshapilates/docs/planning/RAG_API_CONTRACT.md)
- Widget source: [`embed/embed.src.js`](../embed/embed.src.js) → build with `python3 scripts/build_embed.py`
- BFF: [`api/query.js`](../api/query.js) (forward only today)
