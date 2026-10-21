# Citation pipeline debug (embed widget)

*Optional developer tooling — stripped from production builds.*

## Customer embed safety

Sites iframe **`/embed/embed.js`** from Vercel. That file is **compiled** from [`embed/embed.src.js`](../embed/embed.src.js):

| Build command | Output | Customer impact |
|---------------|--------|-----------------|
| `python3 scripts/build_embed.py` | **`embed.js` (default)** | **No** debug code, **no** ingest URL, **no** extra network calls. |
| `python3 scripts/build_embed.py --citation-debug` | `embed.js` with instrumentation | **Local only** — do not deploy this artifact. |

Production builds **remove** every `/* @if CITATION_DEBUG */ … /* @endif */` block at compile time (not a runtime flag).

Commit **`embed/embed.js`** after building with the default (no flag) before push/deploy.

## Workflow

1. Edit **`embed/embed.src.js`** (not `embed.js` directly, or re-run the build and overwrite).
2. Default compile (what you ship):
   ```bash
   python3 scripts/build_embed.py
   ```
3. Local Cursor / NDJSON session:
   ```bash
   python3 scripts/build_embed.py --citation-debug
   ```
   Update `CITATION_DEBUG_INGEST` / `CITATION_DEBUG_SESSION` in the `@if` block if your debug session ids change.
4. Run `dev_server.py`, reproduce in `/embed/` or `/float`, read `.cursor/debug-<sessionId>.log`.
5. Before commit/deploy, run **`build_embed.py`** again **without** `--citation-debug`.

## Log fields (when debug build is active)

- **mergeDisplaySources** — merged Sources URLs.
- **renderAssistantHtml** — markdown / HTML anchor counts, orphan `(url)` detection.
- **fillMessageBody** — final prose link hrefs and text.
- **submit** — enrich path (inline list vs footer).

## Retirement

Delete `@if CITATION_DEBUG` blocks and call sites from `embed.src.js`, remove `scripts/build_embed.py`, and delete this doc when no longer needed.
