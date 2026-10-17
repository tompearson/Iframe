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

  function appendMessage(role, text, sources) {
    const div = document.createElement("div");
    div.className = "msg " + role;
    div.textContent = text;

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
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = url;
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

      appendMessage("assistant", data.answer || "(No answer returned.)", data.sources || []);
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
      input.focus();
    }
  });
})();
