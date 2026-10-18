(function () {
  var SAMPLE_PROMPTS = [
    "What is the Santosha Movement Society and how do I join?",
    "How do I book a private Pilates Movement Therapy session?",
    "What is included in the on-demand video library?",
    "Do you offer classes for hypermobility?",
    "What retreats are scheduled for 2026?",
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
  var promptList = document.getElementById("sample-prompt-list");
  var promptStatus = document.getElementById("prompt-status");

  if (!launcher || !panel || !iframe) return;

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

  var promptButtons = [];
  var spotlightTimer = null;
  var spotlightIndex = 0;
  var spotlightPaused = false;
  var spotlightStopped = false;
  var SPOTLIGHT_INTERVAL_MS = 2800;

  function clearSpotlightClasses() {
    promptButtons.forEach(function (btn) {
      btn.classList.remove("is-spotlight");
    });
  }

  function advanceSpotlight() {
    if (!promptButtons.length || spotlightPaused || spotlightStopped) return;
    clearSpotlightClasses();
    var btn = promptButtons[spotlightIndex];
    btn.classList.add("is-spotlight");
    btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    spotlightIndex = (spotlightIndex + 1) % promptButtons.length;
  }

  function stopPromptSpotlight() {
    if (spotlightTimer) {
      window.clearInterval(spotlightTimer);
      spotlightTimer = null;
    }
    clearSpotlightClasses();
  }

  function startPromptSpotlight() {
    stopPromptSpotlight();
    if (spotlightStopped || !promptButtons.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      advanceSpotlight();
      return;
    }
    spotlightIndex = 0;
    advanceSpotlight();
    spotlightTimer = window.setInterval(advanceSpotlight, SPOTLIGHT_INTERVAL_MS);
  }

  function togglePromptPanel(chatOpen) {
    if (samplePrompts) {
      samplePrompts.classList.toggle("is-hidden", !chatOpen);
      samplePrompts.hidden = !chatOpen;
    }
    if (!chatOpen) {
      stopPromptSpotlight();
      if (promptStatus) promptStatus.textContent = "";
    } else {
      startPromptSpotlight();
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

  function injectIntoPanelIframe(text) {
    try {
      var doc = iframe.contentDocument;
      if (!doc) return false;
      var input = doc.getElementById("input");
      if (!input) return false;
      input.value = String(text).slice(0, 1000);
      input.focus();
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
        input.focus();
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
    spotlightStopped = false;
    panel.classList.remove("is-hidden");
    applyAnchor(panel);
    launcher.classList.add("is-hidden");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    togglePromptPanel(true);
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
  }

  function restorePanelAfterPopOut() {
    if (!panelHiddenForPopOut) return;
    panelHiddenForPopOut = false;
    if (launcher.classList.contains("is-hidden")) {
      panel.classList.remove("is-hidden");
      panel.setAttribute("aria-hidden", "false");
    }
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
  }

  if (promptList) {
    SAMPLE_PROMPTS.forEach(function (text) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = text;
      btn.addEventListener("click", function () {
        spotlightStopped = true;
        stopPromptSpotlight();
        tryInject(text);
      });
      li.appendChild(btn);
      promptList.appendChild(li);
      promptButtons.push(btn);
    });

    var clearLi = document.createElement("li");
    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "sample-prompt-clear";
    clearBtn.textContent = CLEAR_SAMPLE_LABEL;
    clearBtn.addEventListener("click", function () {
      spotlightStopped = true;
      stopPromptSpotlight();
      clearChatInput();
    });
    clearLi.appendChild(clearBtn);
    promptList.appendChild(clearLi);

    promptList.addEventListener("mouseenter", function () {
      spotlightPaused = true;
      clearSpotlightClasses();
      if (spotlightTimer) {
        window.clearInterval(spotlightTimer);
        spotlightTimer = null;
      }
    });
    promptList.addEventListener("mouseleave", function () {
      spotlightPaused = false;
      if (samplePrompts && !samplePrompts.hidden && !spotlightStopped && !spotlightTimer) {
        advanceSpotlight();
        spotlightTimer = window.setInterval(advanceSpotlight, SPOTLIGHT_INTERVAL_MS);
      }
    });
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
      applyAnchor(panel);
    } else if (!launcher.classList.contains("is-hidden")) {
      applyAnchor(launcher);
    }
  }

  window.addEventListener("resize", keepFloatingUiInView);

  togglePromptPanel(false);
  keepFloatingUiInView();
})();
