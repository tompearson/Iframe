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

  function markdownLinksForUrls(urls) {
    return urls
      .map((u) => {
        const href = normalizeSourceUrl(u.trim());
        return `[${href}](${href})`;
      })
      .join(" ");
  }

  /** RAG cites as [https://…], [Source: url], or comma-separated lists — not valid GFM links. */
  function prepareAssistantMarkdown(text) {
    let s = String(text || "");
    s = s.replace(/\[([^\]]+)\]/g, (match, inner) => {
      const urls = inner.match(/https?:\/\/[^\s,\]\)]+/gi);
      if (!urls || !urls.length) return match;
      const remainder = inner
        .replace(/https?:\/\/[^\s,\]\)]+/gi, "")
        .replace(/sources?/gi, "")
        .replace(/[:\s,]/g, "");
      if (remainder.length > 0) return match;
      return markdownLinksForUrls(urls);
    });
    s = s.replace(/(?<!\]\()(https?:\/\/[^\s<>\]\)]+)/gi, (raw) => {
      const trimmed = raw.replace(/[.,;:!?)]+$/, "");
      const punct = raw.slice(trimmed.length);
      return markdownLinksForUrls([trimmed]) + punct;
    });
    s = s.replace(
      /(?<!\]\()(?<!\()(?<!\w)(\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*))/gi,
      (path) => {
        const href = normalizeSourceUrl(SANTOSHA_SITE + path);
        return `[${path}](${href})`;
      }
    );
    return s;
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
      if (!href || !/^https?:\/\//i.test(href) || seen.has(href)) return;
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

  /** Fallback when CDN scripts fail to load (offline). */
  function markdownFallback(text) {
    let s = prepareAssistantMarkdown(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    s = s.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
    return s;
  }

  function renderAssistantHtml(text) {
    const raw = prepareAssistantMarkdown(String(text || "").trim());
    if (!raw) return "";

    if (typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
      marked.setOptions({ breaks: true, gfm: true });
      const parsed = marked.parse(raw);
      const clean = DOMPurify.sanitize(parsed, {
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
        ALLOWED_ATTR: ["href", "target", "rel"],
      });
      return clean;
    }
    return markdownFallback(raw);
  }

  function fillMessageBody(container, role, text) {
    const body = document.createElement("div");
    body.className = "msg-body";

    if (role === "assistant") {
      body.innerHTML = renderAssistantHtml(text);
      body.querySelectorAll("a").forEach((a) => {
        const href = normalizeSourceUrl(a.getAttribute("href") || a.href);
        if (href) a.setAttribute("href", href);
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
    fillMessageBody(div, role, text);

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
        setStatus(res.status === 429 ? "Turn limit reached." : "");
        return;
      }

      const answer = data.answer || "(No answer returned.)";
      appendMessage(
        "assistant",
        answer,
        mergeDisplaySources(data.sources || [], answer)
      );
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
