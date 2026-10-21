# Embed guide for web designers

*How to add your client’s AI site assistant to their website using an iframe.*

This guide is for **independent web designers and site administrators**. You do **not** need access to the AI backend, API keys, or source repositories. The chat is hosted separately; your job is to place an **iframe** on the **client’s** site and match **their** brand.

**Examples below use a fictitious client — Horizon Movement Co.** Replace names, domains, and CSS with the real client brand.

**Do not copy the `/float` QA preview page verbatim.** That page (floating button, smoke-test questions, drag-and-drop launcher) exists only to validate the AI. Production sites should embed the **widget** at `/embed/` in a layout that matches the client’s brand.

### Scope: this guide vs AI engineering

**This document covers only the website embed** — iframe HTML/CSS, client branding around the widget, and domain allowlisting.

It does **not** cover how the assistant chooses answers or **Sources** (which site pages appear in replies). That depends on a separate **AI / RAG engineering** workstream, typically owned by the project’s technical team, for example:

- Crawling and indexing the client website  
- Vector search, retrieval, and model prompts  
- Accuracy testing, recrawls when content changes, and fixing wrong or missing **Sources**  

As a web designer, you may **see** Sources links in the chat UI during testing, but you are **not** expected to configure, ingest, or debug that data — **unless** you also provide AI engineering for the project, or the client has engaged the **same development team** for both the website embed and the assistant backend. In those cases, scope and contacts should be defined in your statement of work; this guide still describes only the embed layer.

Otherwise, escalate “wrong answer” or “wrong source URL” issues to the project owner or whoever operates the AI backend.

---

## Table of contents

1. [What you are embedding](#what-you-are-embedding)
2. [Scope — embed only, not AI data](#scope--embed-only-not-ai-data)
3. [What to request from the project owner](#what-to-request-from-the-project-owner)
4. [Basic inline embed](#basic-inline-embed)
5. [Layout and responsive sizing](#layout-and-responsive-sizing)
6. [Squarespace and similar CMS platforms](#squarespace-and-similar-cms-platforms)
7. [Floating chat vs inline panel](#floating-chat-vs-inline-panel)
8. [Staging and production domains](#staging-and-production-domains)
9. [Testing checklist](#testing-checklist)
10. [Troubleshooting](#troubleshooting)
11. [What not to do](#what-not-to-do)

---

## What you are embedding

| Piece | Role |
|--------|------|
| **Widget URL** (`…/embed/`) | Full chat UI (HTML/CSS/JS). Loaded inside your iframe. |
| **Same host `/api/query`** | Handled inside the widget host. The parent page never calls this. |
| **Your parent page** | The **client’s** HTML/CSS. Contains only the `<iframe>` (and optional launcher button **you** design to match their brand). |

The widget talks to its **own origin** (the embed host), not to the client’s domain. You are not installing Node, Python, or serverless functions on the client site.

---

## Scope — embed only, not AI data

| In scope for web design | Out of scope (AI engineering / project owner) |
|-------------------------|-----------------------------------------------|
| iframe snippet and sizing on the client site | Which pages are crawled and stored for search |
| Client brand copy, colors, layout around the widget | Why a specific **Sources** URL appears or is missing |
| Requesting domain allowlist on the embed host | Answer quality, hallucinations, prompt changes |
| Verifying the iframe loads and the chat UI works | Recrawl / re-index when the client site content changes |

If testing shows a good-looking embed but **incorrect answers or Sources**, that is not fixed by iframe HTML — route it to the team that operates the AI backend.

**Exception:** If you are the AI engineer for this engagement, or the client has hired one team for **both** embed integration and RAG (crawl, index, prompts), then answer and **Sources** work may be in your project scope. Confirm that in writing with the client so web design and AI engineering responsibilities stay clear.

---

## What to request from the project owner

Before you publish, confirm:

1. **Embed base URL** — Production widget URL, ending in `/embed/`.  
   Example (fictitious): `https://chat.horizonmovement.example/embed/`

2. **Allowed parent domains** — The embed host only loads inside iframes on domains listed in its security policy (`frame-ancestors`). Provide every origin you need for **the client**:
   - `https://www.horizonmovement.example`
   - `https://horizonmovement.example`
   - Staging: `https://staging.horizonmovement.example` or your preview URL

3. **No secrets in your page** — You should **never** receive or paste backend API keys or Bearer tokens into the client site. If someone asks you to put a secret in client JavaScript, refuse; that is the wrong architecture.

4. **Brand copy for the iframe** — Confirm the accessible **`title`** and any surrounding headings (e.g. “Ask Horizon Movement Co.”) with the client.

5. **Optional: snippet review** — Ask the owner to confirm the embed URL after their hosting deploy.

---

## Basic inline embed

Replace `EMBED_HOST` with the host the project owner gives you. Replace **Horizon Movement Co.** with the client name.

```html
<section class="horizon-assistant" aria-label="Ask Horizon Movement Co.">
  <iframe
    src="https://EMBED_HOST/embed/"
    title="Horizon Movement Co. site assistant"
    width="100%"
    height="560"
    style="border:0;max-width:440px;display:block;"
    loading="lazy"
  ></iframe>
</section>
```

**Notes:**

- **`title`** — Required for accessibility; use the **client brand name**.
- **`aria-label`** — Short label on the wrapper; match the client’s voice.
- **`class`** — Use a client-specific prefix (e.g. `horizon-assistant`), not a generic vendor name.
- **`loading="lazy"`** — Defers load until the iframe is near the viewport; good for below-the-fold placement.
- **`src`** — Must stay on the **https** embed host path `/embed/` (trailing slash is fine).

---

## Layout and responsive sizing

Recommended starting dimensions (match the reference inline preview on the embed host):

| Property | Suggested value |
|----------|-----------------|
| Width | `100%` of column, **max-width ~420–440px** |
| Height | **520–600px** (560px is a good default) |

On small screens, give the iframe **full width** of the content column and keep height at least **480px** so the composer and messages remain usable.

Example wrapper — tune **colors, radius, and shadow** to the client design system:

```html
<div class="horizon-assistant-wrap">
  <iframe
    src="https://EMBED_HOST/embed/"
    title="Horizon Movement Co. site assistant"
    class="horizon-assistant-frame"
  ></iframe>
</div>
```

```css
/* Example: align with Horizon Movement Co. brand tokens */
.horizon-assistant-wrap {
  max-width: 440px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 28px rgba(44, 40, 37, 0.1);
  border: 1px solid #ddd5cb;
}

.horizon-assistant-frame {
  display: block;
  width: 100%;
  height: 560px;
  border: 0;
}
```

Reference layout (inline chat beside marketing copy): open **`/site`** on the embed host while you build the client page.

---

## Squarespace and similar CMS platforms

Typical workflow:

1. Add a **Code** block (or “Embed” / custom HTML) on the page where the assistant should appear.
2. Paste the iframe HTML from [Basic inline embed](#basic-inline-embed) (with the **client** name and embed host).
3. Save and test on the **published** URL (not only the editor preview).

Squarespace and some hosts restrict iframes or external scripts. If the iframe is blank:

- Confirm the **published** client domain was allowlisted on the embed host (see below).
- Check the browser **developer console** on the parent page for Content-Security-Policy or “refused to frame” errors.

---

## Floating chat vs inline panel

| Approach | Use when |
|----------|----------|
| **Inline iframe** (recommended) | Assistant is a section on “Contact”, “Ask us”, or home — same pattern as `/site` preview. |
| **Custom floating button** | You build a launcher labeled for the **client** (e.g. “Ask Horizon”); iframe `src` is still `/embed/` inside **your** modal or slide-over. |
| **`/float` demo page** | **QA only** — not a drop-in production template. |

If you build a floating UI, you still only embed **`/embed/`** in the iframe. Style the launcher to match the **client** brand; do not depend on internal smoke-test question lists from the QA page.

---

## Staging and production domains

The embed host sends a **`Content-Security-Policy`** header with **`frame-ancestors`**. Only listed parent sites may frame the widget.

If you see a **blank iframe** on a valid URL:

1. Send the project owner the **exact client origin** (scheme + host, no path), e.g. `https://www.horizonmovement.example`.
2. After they update the allowlist and redeploy the embed host, hard-refresh and test again.

Staging preview URLs (temporary hosting URLs, Webflow staging, etc.) must be allowlisted separately if you test there.

---

## Testing checklist

- [ ] iframe loads on **desktop** and **mobile** on the **client’s** published URL  
- [ ] Surrounding page typography and colors feel consistent with the **client brand**  
- [ ] User can type a question and receive an answer  
- [ ] **Sources** links open in a new tab (content accuracy is **AI engineering**, not web design)  
- [ ] No API keys or Bearer tokens in your page source or Network tab (only requests to the embed host)  
- [ ] Page remains usable with keyboard (focus moves into iframe when user clicks the chat)  
- [ ] iframe `title` and section labels use the **client** name, not the hosting vendor  

---

## Troubleshooting

| Symptom | Likely cause | What to do |
|---------|----------------|------------|
| Blank iframe | Client domain not in `frame-ancestors` | Request allowlist update from project owner |
| “Could not reach the assistant” | Embed host or upstream API down | Owner checks hosting status; you verify `src` URL |
| iframe tiny or clipped | CSS height/overflow on wrapper | Increase `height`; avoid `overflow:hidden` on parent without enough height |
| Chat works on preview host but not client site | Production client domain not allowlisted | Owner adds client production domain |
| Editor preview differs from live | CMS preview domain ≠ published domain | Test published URL |
| Wrong answer or wrong Sources URL | Retrieval / index / prompts | **AI engineer** or project owner — not iframe markup |

---

## What not to do

- Do **not** copy the entire **`/float`** QA page (sample questions, internal test copy, floating QA chrome) as the client production experience.  
- Do **not** point browser JavaScript at the raw RAG API with a secret.  
- Do **not** change the iframe `src` to third-party chat scripts; use only the official `/embed/` URL from the project owner.  
- Do **not** label the widget with the **hosting vendor’s** name in `title` / headings unless the client asks — use **client brand** copy.  

---

## Related (project team)

Internal deploy and env vars: [PRODUCTION_EMBED.md](PRODUCTION_EMBED.md), [VERCEL.md](VERCEL.md).

**Public copy of this guide (no repository links):** `/embed-guide` on the embed host.
