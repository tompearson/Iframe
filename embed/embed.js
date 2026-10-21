(function () {
  const API_BASE = window.EMBED_API_BASE || "/api";
  const SESSION_KEY = "embedSessionId";

  const messagesEl = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const sendBtn = document.getElementById("send");
  const clearBtn = document.getElementById("clear");
  const statusEl = document.getElementById("status");

  function sessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  const SANTOSHA_SITE = "https://www.santoshapilates.com";

  /** Squarespace paths that redirect; use canonical href in the widget. */
  const SANTOSHA_PATH_REDIRECTS = {
    "/about": "/about-santosha-pilates",
    "/classes": "/virtual-classes",
    "/home-1": "/offerings",
  };

  function normalizeSourceUrl(url) {
    const raw = String(url || "").trim();
    if (!/^https?:\/\//i.test(raw)) return raw;
    try {
      const parsed = new URL(raw);
      if (!/^(www\.)?santoshapilates\.com$/i.test(parsed.hostname)) return raw;
      parsed.protocol = "https:";
      parsed.hostname = "www.santoshapilates.com";
      const pathKey = parsed.pathname.replace(/\/$/, "") || "/";
      if (SANTOSHA_PATH_REDIRECTS[pathKey]) {
        parsed.pathname = SANTOSHA_PATH_REDIRECTS[pathKey];
      }
      parsed.search = "";
      parsed.hash = "";
      return parsed.href;
    } catch (_err) {
      return raw;
    }
  }

  function isPlausibleSourceUrl(url) {
    const href = normalizeSourceUrl(url);
    if (!href || !/^https:\/\/www\.santoshapilates\.com/i.test(href)) return false;
    try {
      const path = new URL(href).pathname.replace(/\/$/, "") || "/";
      if (path === "/www") return false;
      return true;
    } catch (_err) {
      return false;
    }
  }

  function shortLinkLabel(href) {
    try {
      const u = new URL(href);
      const path = u.pathname.replace(/\/$/, "") || "/";
      if (path === "/") return "Home";
      const slug = path.split("/").filter(Boolean).pop() || "page";
      return slug.replace(/-/g, " ");
    } catch (_err) {
      return "Source";
    }
  }

  function markdownLink(href) {
    const url = normalizeSourceUrl(href);
    if (!isPlausibleSourceUrl(url)) return url;
    return `[${url}](${url})`;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function anchorHtml(href) {
    const url = normalizeSourceUrl(href);
    if (!isPlausibleSourceUrl(url)) return escapeHtml(url);
    return (
      '<a class="prose-citation-link" href="' +
      escapeHtml(url) +
      '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(url) +
      "</a>"
    );
  }

  /** marked/WebKit sometimes leaves [label](url) or [label] as plain text in HTML output. */
  function linkifyRemainingMarkdownInHtml(html, sourceHints) {
    let s = String(html || "");
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, (_, label, dest) => {
      const href = resolveLinkDest(label, dest, sourceHints);
      if (href && isPlausibleSourceUrl(href)) return anchorHtml(href);
      return anchorHtml(dest.replace(/[\r\n\t ]+/g, ""));
    });
    s = s.replace(/\[([^\]]+)\](?!\()/gi, (match, label) => {
      if (/https?:\/\//i.test(label)) return match;
      const href = hrefForCitationLabel(label) || hrefFromSourceHints(label, sourceHints);
      return href ? anchorHtml(href) : match;
    });
    return s;
  }

  function normalizeCitationText(text) {
    return String(text || "")
      .replace(/\uFF3B/g, "[")
      .replace(/\uFF3D/g, "]");
  }

  /** Narrow viewports often break GFM as `[label]\n(url)` or `[label] (url)`. */
  function repairMarkdownLinkSyntax(text) {
    return String(text || "")
      .replace(/\]\s*\r?\n\s*\(/g, "](")
      .replace(/\]\s+\(/g, "](")
      .replace(/\[([^\]]+)\]\(\s*(https?:\/\/[^)]+)\)/gi, (_m, label, dest) => {
        const url = dest.replace(/[\r\n\t ]+/g, "");
        return `[${label}](${url})`;
      });
  }

  function hrefFromSourceHints(label, hints) {
    const t = String(label || "").trim().toLowerCase();
    const list = hints || [];
    if (!t || !list.length) return null;

    for (const raw of list) {
      const url = normalizeSourceUrl(raw);
      if (!isPlausibleSourceUrl(url)) continue;
      let path = "/";
      try {
        path = new URL(url).pathname.replace(/\/$/, "") || "/";
      } catch (_err) {
        continue;
      }
      const slug = path.split("/").filter(Boolean).pop() || "";
      const slugWords = slug.replace(/-/g, " ");
      if (slugWords && t.includes(slugWords)) return url;
      if (/\babout\b/.test(t) && /about/i.test(path)) return url;
      if (/(private|book)/.test(t) && /bookprivate/i.test(path)) return url;
      if (/\bhome\b/.test(t) && (path === "/" || /offerings/i.test(path))) return url;
    }

    if (/\babout\b/.test(t)) {
      const about = list.find((u) => /about-santosha/i.test(String(u)));
      if (about) return normalizeSourceUrl(about);
    }
    return null;
  }

  function resolveLinkDest(label, dest, sourceHints) {
    const d = String(dest || "").replace(/[\r\n\t ]+/g, "");
    if (/^https?:\/\//i.test(d)) return normalizeSourceUrl(d);
    if (d.startsWith("/")) return normalizeSourceUrl(SANTOSHA_SITE + d);
    return (
      hrefForCitationLabel(label) ||
      hrefForCitationLabel(d) ||
      hrefFromSourceHints(label, sourceHints) ||
      null
    );
  }

  /** GFM/marked sometimes leaves [text](url) as plain text; inject real anchors before parse. */
  function injectHtmlLinks(s, sourceHints) {
    return s.replace(/\[([^\]]+)\]\(([^)]+)\)/gi, (_, label, dest) => {
      const href = resolveLinkDest(label, dest, sourceHints);
      if (href && isPlausibleSourceUrl(href)) return anchorHtml(href);
      const fromLabel = hrefForCitationLabel(label) || hrefFromSourceHints(label, sourceHints);
      if (fromLabel) return anchorHtml(fromLabel);
      return `[${label}](${dest})`;
    });
  }

  /** Model often emits slug labels without brackets (e.g. "bookprivates 1 Home."). */
  function linkLooseCitationLabels(s) {
    const rules = [
      { pattern: /(?<![(\[])\bbookprivates 1\b/gi, path: "/bookprivates-1" },
      { pattern: /(?<![(\[])\bvirtual classes\b/gi, path: "/virtual-classes" },
      { pattern: /(?<![(\[])\bHome\b(?=[\s.,;)]|$)/g, path: "/" },
    ];
    let out = s;
    rules.forEach(({ pattern, path }) => {
      out = out.replace(pattern, (match) => markdownLink(SANTOSHA_SITE + path));
    });
    return out;
  }

  function markdownLinksForUrls(urls) {
    return urls.map((u) => markdownLink(u.trim())).join(" ");
  }

  /** Model output sometimes breaks URLs across lines/spaces (especially on narrow viewports). */
  function collapseWhitespaceInUrls(text) {
    return text.replace(/https?:\/\/[^\s\]]+/gi, (chunk) =>
      chunk.replace(/[\r\n\t ]+/g, "")
    );
  }

  /** Map descriptive [Santosha … page] labels to crawled paths when possible. */
  function hrefForCitationLabel(label) {
    const t = String(label || "").trim();
    if (/home-?1?\s*page/i.test(t)) return normalizeSourceUrl(SANTOSHA_SITE + "/");
    if (/about page/i.test(t)) return normalizeSourceUrl(SANTOSHA_SITE + "/about-santosha-pilates");
    if (/\babout\b/i.test(t) && /santosha|pilates|studio|movement therapy/i.test(t)) {
      return normalizeSourceUrl(SANTOSHA_SITE + "/about-santosha-pilates");
    }
    if (/movement therapy page/i.test(t)) {
      return normalizeSourceUrl(SANTOSHA_SITE + "/about-santosha-pilates");
    }
    if (/bookprivate|private.*session/i.test(t)) {
      return normalizeSourceUrl(SANTOSHA_SITE + "/bookprivates-1");
    }
    if (/courses/i.test(t)) return normalizeSourceUrl(SANTOSHA_SITE + "/courses");
    if (/virtual classes/i.test(t)) return normalizeSourceUrl(SANTOSHA_SITE + "/virtual-classes");
    if (/^home$/i.test(t)) return normalizeSourceUrl(SANTOSHA_SITE + "/");
    return null;
  }

  const BARE_URL_RE = /(?<![(\[])(?<!\]\()(https?:\/\/[^\s<>\]\)]+)/gi;

  /** RAG cites as labels, [https://…], [Source: url], or comma-separated lists — not always valid GFM. */
  function prepareAssistantMarkdown(text, sourceHints) {
    let s = repairMarkdownLinkSyntax(
      collapseWhitespaceInUrls(normalizeCitationText(String(text || "")))
    );

    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/gi, (_m, label, dest) => {
      const href = resolveLinkDest(label, dest, sourceHints);
      if (href && isPlausibleSourceUrl(href)) return markdownLink(href);
      if (/^https?:\/\//i.test(dest.replace(/[\r\n\t ]+/g, ""))) {
        return markdownLink(dest);
      }
      return _m;
    });

    s = s.replace(
      /\[(https?:\/\/[^\]\s]+)\]\((https?:\/\/[^)]+)\)/gi,
      (_m, _label, dest) => markdownLink(dest)
    );

    // Must not match [url] inside [url](url) — that leaves a orphan (url) and doubles links.
    s = s.replace(/\[([^\]]+)\](?!\()/g, (match, inner) => {
      const urls = inner.match(/https?:\/\/[^\s,\]\)]+/gi);
      if (!urls || !urls.length) return match;
      const remainder = inner
        .replace(/https?:\/\/[^\s,\]\)]+/gi, "")
        .replace(/sources?/gi, "")
        .replace(/[:\s,]/g, "");
      if (remainder.length > 0) return match;
      return markdownLinksForUrls(urls);
    });

    s = s.replace(BARE_URL_RE, (raw) => {
      const trimmed = raw.replace(/[.,;:!?)]+$/, "");
      const punct = raw.slice(trimmed.length);
      return markdownLink(trimmed) + punct;
    });

    s = s.replace(/\[([^\]]+)\](?!\()/g, (match, label) => {
      if (/https?:\/\//i.test(label)) return match;
      if (label.includes(",")) {
        return label
          .split(",")
          .map((part) => {
            const piece = part.trim();
            const href = hrefForCitationLabel(piece);
            if (href) return markdownLink(href);
            return `*(${piece})*`;
          })
          .join(" ");
      }
      const href = hrefForCitationLabel(label) || hrefFromSourceHints(label, sourceHints);
      if (href) return markdownLink(href);
      return `*(${label.trim()})*`;
    });

    s = s.replace(
      /(?<![(\[])(?<!\]\()(?<!\w)(\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*))/gi,
      (path) => (path === "/www" ? path : markdownLink(SANTOSHA_SITE + path))
    );

    return linkLooseCitationLabels(s);
  }

  function urlsMentionedInAnswer(text) {
    const urls = [];
    const str = String(text || "");
    const httpRe = /https?:\/\/[^\s<>\]\)]+/gi;
    let match;
    while ((match = httpRe.exec(str))) {
      urls.push(normalizeSourceUrl(match[0].replace(/[.,;:!?)]+$/, "")));
    }
    const pathRe = /(?<!\w)(\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*))/gi;
    while ((match = pathRe.exec(str))) {
      if (match[1] === "/www") continue;
      urls.push(normalizeSourceUrl(SANTOSHA_SITE + match[1]));
    }
    return urls;
  }

  /** Prefer pages cited in the answer; RAG Sources often omit or duplicate unrelated URLs. */
  function mergeDisplaySources(apiSources, answerText) {
    const answer = String(answerText || "");
    const seen = new Set();
    const out = [];

    function push(url) {
      const href = normalizeSourceUrl(url);
      if (!isPlausibleSourceUrl(href) || seen.has(href)) return;
      seen.add(href);
      out.push(href);
    }

    if (/testimonials/i.test(answer)) {
      push(SANTOSHA_SITE + "/testimonials-1");
    }
    urlsMentionedInAnswer(answer).forEach(push);
    (apiSources || []).forEach(push);

    return out;
  }

  /** True when the raw model answer already has linkable citations (GFM or bare URL). */
  function answerHasInlineCitations(text) {
    const a = String(text || "");
    if (/\]\(https?:\/\//i.test(a)) return true;
    if (/\[https?:\/\/[^\]]+\]\(https?:\/\//i.test(a)) return true;
    if (/(?<![(\[])(https?:\/\/[^\s<>\]\)]+)/i.test(a)) return true;
    return false;
  }

  const LIST_ITEM_LINE_RE = /^(\s*(?:[-*+]|\d+\.)\s+)(.+)$/;
  const BOLD_LEAD_LINE_RE = /^(\s*\*\*[^*]+?\*\*:?\s*)(.+)$/;

  function lineHasCitation(line) {
    return (
      /\]\(https?:\/\//i.test(line) ||
      /(?<![(\[])(https?:\/\/[^\s<>\]\)]+)/i.test(line)
    );
  }

  /** When the model omits markdown links, attach Sources to list bullets (else footer block). */
  function enrichAnswerWithSourceLinks(answer, displaySources) {
    if (answerHasInlineCitations(answer)) return answer;
    const urls = [...new Set((displaySources || []).filter(isPlausibleSourceUrl))];
    if (!urls.length) return answer;
    const text = String(answer || "").trim();
    const lines = text.split("\n");
    let urlIdx = 0;
    let listHits = 0;
    const inlined = lines.map((line) => {
      if (urlIdx >= urls.length || lineHasCitation(line)) return line;
      let m = line.match(LIST_ITEM_LINE_RE);
      if (!m) m = line.match(BOLD_LEAD_LINE_RE);
      if (!m || String(m[2] || "").trim().length < 24) return line;
      listHits += 1;
      const link = markdownLink(urls[urlIdx]);
      urlIdx += 1;
      return m[1] + m[2].trimEnd() + " " + link;
    });
    if (listHits > 0) {
      const rest = urls.slice(urlIdx);
      if (!rest.length) return inlined.join("\n");
      return inlined.join("\n") + "\n\n" + rest.map((u) => markdownLink(u)).join("\n");
    }

    const paras = text.split(/\n\n+/);
    if (paras.length >= 2) {
      urlIdx = 0;
      const paraOut = paras.map((para, i) => {
        if (i === 0 || urlIdx >= urls.length || lineHasCitation(para)) return para;
        if (para.trim().length < 40) return para;
        listHits += 1;
        const link = markdownLink(urls[urlIdx]);
        urlIdx += 1;
        return para.trimEnd() + " " + link;
      });
      if (listHits > 0) {
        const rest = urls.slice(urlIdx);
        if (!rest.length) return paraOut.join("\n\n");
        return paraOut.join("\n\n") + "\n\n" + rest.map((u) => markdownLink(u)).join("\n");
      }
    }

    return text + "\n\n" + urls.map((u) => markdownLink(u)).join("\n");
  }

  const ASSISTANT_HTML_SANITIZE = {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "ul",
      "ol",
      "li",
      "a",
      "h1",
      "h2",
      "h3",
      "h4",
      "code",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  };

  /** Markdown → safe HTML; link passes run after marked (mixing HTML before marked breaks WebKit). */
  function finishAssistantHtml(htmlOrMarkdown, sourceHints, fromMarked) {
    let s = String(htmlOrMarkdown || "");
    if (!fromMarked) {
      s = injectHtmlLinks(s, sourceHints);
    }
    s = linkifyRemainingMarkdownInHtml(s, sourceHints);
    s = injectHtmlLinks(s, sourceHints);
    if (typeof DOMPurify === "undefined") {
      s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      return s.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
    }
    return DOMPurify.sanitize(s, ASSISTANT_HTML_SANITIZE);
  }

  /** Fallback when marked CDN fails; `prepared` is already normalized markdown. */
  function markdownFallback(prepared, sourceHints) {
    return finishAssistantHtml(prepared, sourceHints, false);
  }

  function renderAssistantHtml(text, sourceHints) {
    const hints = sourceHints || [];
    const prepared = prepareAssistantMarkdown(String(text || "").trim(), hints);
    if (!prepared) return "";

    if (typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
      marked.setOptions({ breaks: true, gfm: true });
      const parsed = marked.parse(prepared);
      return finishAssistantHtml(
        DOMPurify.sanitize(parsed, ASSISTANT_HTML_SANITIZE),
        hints,
        true
      );
    }
    return markdownFallback(prepared, hints);
  }

  function fillMessageBody(container, role, text, sourceHints) {
    const body = document.createElement("div");
    body.className = "msg-body";

    if (role === "assistant") {
      body.innerHTML = renderAssistantHtml(text, sourceHints);
      body.querySelectorAll("a").forEach((a) => {
        const href = normalizeSourceUrl(a.getAttribute("href") || a.href);
        if (href && isPlausibleSourceUrl(href)) {
          a.setAttribute("href", href);
          a.textContent = href;
          a.classList.add("prose-citation-link");
        }
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      });
    } else {
      body.textContent = text;
    }
    container.appendChild(body);
  }

  function appendMessage(role, text, sources) {
    const div = document.createElement("div");
    div.className = "msg " + role;
    fillMessageBody(div, role, text, role === "assistant" ? sources : null);

    if (sources && sources.length) {
      const details = document.createElement("details");
      details.className = "sources";
      const summary = document.createElement("summary");
      summary.textContent = "Sources";
      details.appendChild(summary);
      const ul = document.createElement("ul");
      sources.forEach((url) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        const href = normalizeSourceUrl(url);
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = href;
        li.appendChild(a);
        ul.appendChild(li);
      });
      details.appendChild(ul);
      div.appendChild(details);
    }

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setStatus(text) {
    statusEl.textContent = text || "";
  }

  const MQ_DESKTOP_TYPING =
    "(min-width: 769px) and (hover: hover) and (pointer: fine)";

  /** On phones, keep the keyboard from covering the new assistant reply. */
  function refocusOrDismissKeyboard() {
    if (window.matchMedia(MQ_DESKTOP_TYPING).matches) {
      input.focus();
      return;
    }
    input.blur();
    window.requestAnimationFrame(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  appendMessage(
    "assistant",
    "Ask me anything about Santosha Pilates. I'll search the site content and cite sources when I can."
  );

  clearBtn.addEventListener("click", () => {
    messagesEl.innerHTML = "";
    sessionStorage.removeItem(SESSION_KEY);
    appendMessage(
      "assistant",
      "Chat cleared. Ask a new question about Santosha Pilates."
    );
    setStatus("");
  });

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (sendBtn.disabled) return;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event("submit", { cancelable: true }));
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    appendMessage("user", query);
    input.value = "";
    sendBtn.disabled = true;
    setStatus("Retrieving and generating answer…");

    try {
      const res = await fetch(API_BASE + "/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Embed-Session-Id": sessionId(),
        },
        body: JSON.stringify({ query }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail = data.detail || res.statusText || "Request failed";
        appendMessage("error", typeof detail === "string" ? detail : JSON.stringify(detail));
        setStatus(
          res.status === 429
            ? "Turn limit reached — click Clear under the message box for a new session."
            : ""
        );
        return;
      }

      const answer = data.answer || "(No answer returned.)";
      const displaySources = mergeDisplaySources(data.sources || [], answer);
      const answerForDisplay = enrichAnswerWithSourceLinks(answer, displaySources);
      appendMessage("assistant", answerForDisplay, displaySources);
      if (data.turnsRemaining != null) {
        setStatus("Turns remaining (approx.): " + data.turnsRemaining);
      } else {
        setStatus("");
      }
    } catch (err) {
      appendMessage("error", "Could not reach the assistant. Is the dev server and RAG API running?");
      setStatus("");
    } finally {
      sendBtn.disabled = false;
      refocusOrDismissKeyboard();
    }
  });
})();
