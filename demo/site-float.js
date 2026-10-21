(function () {
  /**
   * RAG smoke prompts aligned with documentation-helper
   * scripts/compare_pinecone_namespaces.py report (20261020 recrawl).
   * Each question should surface its path in chat Sources when live reads
   * santosha-20261020.
   */
  var PROMPTS_URLS_IN_BOTH = [
    "What is Santosha Pilates and what do they offer on their home page?",
    "What is Santosha Movement Society and what is their approach to Pilates?",
    "What topics does the Santosha Pilates blog cover recently?",
    "How do I book private Pilates sessions at Santosha?",
    "What courses or multi-session programs does Santosha Pilates offer?",
    "What is hypermobility on-demand content at Santosha?",
    "Does Santosha offer infant CST or related services — what are they?",
    "Who are the instructors at Santosha Pilates and what are their backgrounds?",
    "What does Santosha's privacy policy say about how they use personal information?",
    "What can I buy in the Santosha Pilates online store?",
  ];

  var PROMPTS_URLS_LATEST_ONLY = [
    "What does Santosha Pilates say on the About page about the studio and what makes it different?",
    "How do I view or checkout items in the cart on the Santosha website?",
    "How can I contact Santosha Pilates — phone, email, or location?",
    "What frequently asked questions does Santosha answer for new clients?",
    "Does Santosha offer classes or programs for hypermobility, and what do they recommend?",
    "What is the Pilates sound bath at Santosha and how do I sign up or learn more?",
    "What postpartum Pilates offerings or guidance does Santosha provide?",
    "What is the Reset program or offering at Santosha Pilates?",
    "How does the SMS video library work for on-demand videos at Santosha?",
    "Are there reviews of the business?",
  ];

  var CLEAR_SAMPLE_LABEL = "Ask your own question";

  var launcher = document.getElementById("chat-launcher");
  var panel = document.getElementById("chat-window");
  var header = document.getElementById("chat-window-header");
  var iframe = document.getElementById("chat-iframe");
  var btnClose = document.getElementById("chat-close");
  var btnMin = document.getElementById("chat-minimize");
  var btnPop = document.getElementById("chat-popout");
  var howToTest = document.getElementById("how-to-test");
  var samplePrompts = document.getElementById("sample-prompts");
  var promptListBoth = document.getElementById("prompt-list-both");
  var promptListLatest = document.getElementById("prompt-list-latest");
  var promptStatus = document.getElementById("prompt-status");

  if (!launcher || !panel || !iframe) return;

  var MQ_MOBILE = "(max-width: 768px)";
  /** Phones + tablets (touch): full-width chat sheet instead of 400px floating box. */
  var MQ_TOUCH_CHAT = "(max-width: 1024px), (hover: none) and (pointer: coarse)";
  var MQ_POPOUT_ENABLED = "(min-width: 769px) and (hover: hover) and (pointer: fine)";

  var embedLoaded = false;
  var pendingQuery = null;
  var popOutWindow = null;
  var panelHiddenForPopOut = false;
  var popOutWatchTimer = null;
  var anchorRight = null;
  var anchorBottom = null;
  var DRAG_THRESHOLD_PX = 6;
  var VIEWPORT_MARGIN = 8;

  function clampAnchor(el) {
    if (!el) return;
    var w = el.offsetWidth;
    var h = el.offsetHeight;
    if (w < 1 || h < 1) {
      w = Math.min(400, window.innerWidth - 24);
      h = Math.min(580, window.innerHeight - 32);
    }
    var maxR = Math.max(VIEWPORT_MARGIN, window.innerWidth - w - VIEWPORT_MARGIN);
    var maxB = Math.max(VIEWPORT_MARGIN, window.innerHeight - h - VIEWPORT_MARGIN);
    if (anchorRight == null) anchorRight = 20;
    if (anchorBottom == null) anchorBottom = 20;
    anchorRight = Math.min(Math.max(VIEWPORT_MARGIN, anchorRight), maxR);
    anchorBottom = Math.min(Math.max(VIEWPORT_MARGIN, anchorBottom), maxB);
  }

  function applyAnchor(el) {
    if (!el) return;
    clampAnchor(el);
    el.style.right = anchorRight + "px";
    el.style.bottom = anchorBottom + "px";
    el.style.left = "auto";
    el.style.top = "auto";
  }

  function clearPanelInlinePosition() {
    panel.style.right = "";
    panel.style.bottom = "";
    panel.style.left = "";
    panel.style.top = "";
    panel.style.width = "";
    panel.style.height = "";
    panel.style.maxHeight = "";
  }

  function isMobileLayout() {
    return window.matchMedia(MQ_MOBILE).matches;
  }

  function isTouchChatLayout() {
    return window.matchMedia(MQ_TOUCH_CHAT).matches;
  }

  function isPopOutEnabled() {
    return window.matchMedia(MQ_POPOUT_ENABLED).matches;
  }

  function syncPanelPosition() {
    if (panel.classList.contains("is-hidden")) return;
    if (isTouchChatLayout()) {
      clearPanelInlinePosition();
      return;
    }
    applyAnchor(panel);
  }

  function syncResponsiveLayout() {
    var chatOpen = launcher.classList.contains("is-hidden");
    document.body.classList.toggle("float-chat-open", chatOpen && isTouchChatLayout());
    if (btnPop) {
      btnPop.disabled = !isPopOutEnabled();
      btnPop.setAttribute("aria-hidden", isPopOutEnabled() ? "false" : "true");
    }
    syncPanelPosition();
  }

  function scrollSamplePromptsIntoView() {
    if (!isMobileLayout() || !samplePrompts || samplePrompts.hidden) return;
    window.requestAnimationFrame(function () {
      samplePrompts.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function syncAnchorFromElement(el) {
    if (!el) return;
    var rect = el.getBoundingClientRect();
    anchorRight = window.innerWidth - rect.right;
    anchorBottom = window.innerHeight - rect.bottom;
  }

  function loadEmbed() {
    if (embedLoaded) return;
    var src = iframe.getAttribute("data-src");
    if (src) iframe.setAttribute("src", src);
    embedLoaded = true;
  }

  function togglePromptPanel(chatOpen) {
    if (samplePrompts) {
      samplePrompts.classList.toggle("is-hidden", !chatOpen);
      samplePrompts.hidden = !chatOpen;
    }
    if (!chatOpen && promptStatus) {
      promptStatus.textContent = "";
    }
  }

  function injectIntoPopOut(text) {
    if (!popOutWindow || popOutWindow.closed) return false;
    try {
      var popInput = popOutWindow.document.getElementById("input");
      if (!popInput) return false;
      popInput.value = String(text).slice(0, 1000);
      popInput.focus();
      popOutWindow.focus();
      return true;
    } catch (_err) {
      return false;
    }
  }

  function focusOrBlurEmbedInput(input, preferFocus) {
    if (!input) return;
    if (preferFocus || window.matchMedia(MQ_POPOUT_ENABLED).matches) {
      input.focus();
      return;
    }
    input.blur();
  }

  function injectIntoPanelIframe(text) {
    try {
      var doc = iframe.contentDocument;
      if (!doc) return false;
      var input = doc.getElementById("input");
      if (!input) return false;
      input.value = String(text).slice(0, 1000);
      focusOrBlurEmbedInput(input, false);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function clearChatInput() {
    if (popOutWindow && !popOutWindow.closed) {
      try {
        var popInput = popOutWindow.document.getElementById("input");
        if (popInput) {
          popInput.value = "";
          popInput.focus();
          popOutWindow.focus();
          if (promptStatus) promptStatus.textContent = "";
          return;
        }
      } catch (_err) {
        /* ignore */
      }
    }
    loadEmbed();
    try {
      var doc = iframe.contentDocument;
      var input = doc && doc.getElementById("input");
      if (input) {
        input.value = "";
        focusOrBlurEmbedInput(input, true);
      }
    } catch (_err) {
      /* ignore */
    }
    if (promptStatus) promptStatus.textContent = "";
  }

  function whenPopOutReady(win, fn) {
    if (!win || win.closed) return;
    if (win.document.readyState === "complete") {
      fn();
      return;
    }
    win.addEventListener("load", fn, { once: true });
  }

  function tryInject(text) {
    if (popOutWindow && !popOutWindow.closed) {
      if (injectIntoPopOut(text)) {
        pendingQuery = null;
        if (promptStatus) promptStatus.textContent = "";
        return;
      }
      pendingQuery = text;
      whenPopOutReady(popOutWindow, function () {
        if (pendingQuery && injectIntoPopOut(pendingQuery)) {
          pendingQuery = null;
          if (promptStatus) promptStatus.textContent = "";
        }
      });
      return;
    }

    loadEmbed();
    if (injectIntoPanelIframe(text)) {
      pendingQuery = null;
      if (promptStatus) promptStatus.textContent = "";
      return;
    }
    pendingQuery = text;
  }

  iframe.addEventListener("load", function () {
    if (!pendingQuery || (popOutWindow && !popOutWindow.closed)) return;
    if (injectIntoPanelIframe(pendingQuery)) {
      pendingQuery = null;
      if (promptStatus) promptStatus.textContent = "";
    }
  });

  function openChat() {
    loadEmbed();
    panel.classList.remove("is-hidden");
    launcher.classList.add("is-hidden");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    togglePromptPanel(true);
    syncResponsiveLayout();
    scrollSamplePromptsIntoView();
  }

  function stopPopOutWatcher() {
    if (popOutWatchTimer) {
      window.clearInterval(popOutWatchTimer);
      popOutWatchTimer = null;
    }
  }

  function hidePanelForPopOut() {
    panel.classList.add("is-hidden");
    panel.setAttribute("aria-hidden", "true");
    panelHiddenForPopOut = true;
    syncResponsiveLayout();
  }

  function restorePanelAfterPopOut() {
    if (!panelHiddenForPopOut) return;
    panelHiddenForPopOut = false;
    if (launcher.classList.contains("is-hidden")) {
      panel.classList.remove("is-hidden");
      panel.setAttribute("aria-hidden", "false");
    }
    syncResponsiveLayout();
  }

  function startPopOutWatcher() {
    stopPopOutWatcher();
    popOutWatchTimer = window.setInterval(function () {
      if (!popOutWindow || popOutWindow.closed) {
        popOutWindow = null;
        stopPopOutWatcher();
        restorePanelAfterPopOut();
      }
    }, 300);
  }

  function closeChat() {
    stopPopOutWatcher();
    panelHiddenForPopOut = false;
    if (popOutWindow && !popOutWindow.closed) {
      popOutWindow.close();
    }
    popOutWindow = null;
    syncAnchorFromElement(panel);
    panel.classList.add("is-hidden");
    launcher.classList.remove("is-hidden");
    applyAnchor(launcher);
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    togglePromptPanel(false);
    syncResponsiveLayout();
  }

  function appendPromptButtons(listEl, prompts) {
    if (!listEl) return;
    prompts.forEach(function (text) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = text;
      btn.addEventListener("click", function () {
        tryInject(text);
      });
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  if (promptListBoth || promptListLatest) {
    appendPromptButtons(promptListBoth, PROMPTS_URLS_IN_BOTH);
    appendPromptButtons(promptListLatest, PROMPTS_URLS_LATEST_ONLY);

    if (promptListLatest) {
      var clearLi = document.createElement("li");
      var clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "sample-prompt-clear";
      clearBtn.textContent = CLEAR_SAMPLE_LABEL;
      clearBtn.addEventListener("click", function () {
        clearChatInput();
      });
      clearLi.appendChild(clearBtn);
      promptListLatest.appendChild(clearLi);
    }

  }

  /* Drag launcher button; short press without move opens chat */
  (function () {
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var startRight = 0;
    var startBottom = 0;

    launcher.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      moved = false;
      dragging = true;
      launcher.setPointerCapture(e.pointerId);
      var rect = launcher.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;
      anchorRight = startRight;
      anchorBottom = startBottom;
    });

    launcher.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      moved = true;
      launcher.classList.add("is-dragging");
      anchorRight = startRight - dx;
      anchorBottom = startBottom - dy;
      applyAnchor(launcher);
    });

    function endLaunchPointer(e) {
      if (!dragging) return;
      dragging = false;
      applyAnchor(launcher);
      launcher.classList.remove("is-dragging");
      try {
        launcher.releasePointerCapture(e.pointerId);
      } catch (_err) {
        /* ignore */
      }
      if (!moved) openChat();
    }

    launcher.addEventListener("pointerup", endLaunchPointer);
    launcher.addEventListener("pointercancel", endLaunchPointer);
  })();

  btnClose && btnClose.addEventListener("click", closeChat);
  btnMin && btnMin.addEventListener("click", closeChat);

  btnPop &&
    btnPop.addEventListener("click", function () {
      if (!isPopOutEnabled()) return;
      var url = iframe.getAttribute("data-src") || "/embed/";
      var features =
        "width=420,height=640,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no";
      popOutWindow = window.open(url, "santoshaAssistant", features);
      if (!popOutWindow) return;
      hidePanelForPopOut();
      startPopOutWatcher();
      popOutWindow.focus();
      if (pendingQuery) {
        var q = pendingQuery;
        whenPopOutReady(popOutWindow, function () {
          if (injectIntoPopOut(q)) {
            pendingQuery = null;
            if (promptStatus) promptStatus.textContent = "";
          }
        });
      }
    });

  /* Drag detached window by header (desktop) */
  if (header) {
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var startRight = 0;
    var startBottom = 0;

    header.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button")) return;
      if (isTouchChatLayout()) return;
      dragging = true;
      header.classList.add("is-dragging");
      header.setPointerCapture(e.pointerId);
      var rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;
      panel.style.right = startRight + "px";
      panel.style.bottom = startBottom + "px";
      panel.style.left = "auto";
      panel.style.top = "auto";
    });

    header.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      anchorRight = startRight - dx;
      anchorBottom = startBottom - dy;
      applyAnchor(panel);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      header.classList.remove("is-dragging");
      applyAnchor(panel);
      try {
        header.releasePointerCapture(e.pointerId);
      } catch (_err) {
        /* ignore */
      }
    }

    header.addEventListener("pointerup", endDrag);
    header.addEventListener("pointercancel", endDrag);
  }

  /* Mobile nav toggle (shared pattern) */
  var navBtn = document.getElementById("nav-toggle");
  var nav = document.getElementById("main-nav");
  if (navBtn && nav) {
    navBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function keepFloatingUiInView() {
    if (!panel.classList.contains("is-hidden")) {
      syncPanelPosition();
    } else if (!launcher.classList.contains("is-hidden")) {
      applyAnchor(launcher);
    }
  }

  window.addEventListener("resize", keepFloatingUiInView);

  [MQ_MOBILE, MQ_TOUCH_CHAT, MQ_POPOUT_ENABLED].forEach(function (query) {
    var mq = window.matchMedia(query);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", syncResponsiveLayout);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(syncResponsiveLayout);
    }
  });

  togglePromptPanel(false);
  keepFloatingUiInView();
  syncResponsiveLayout();
})();
