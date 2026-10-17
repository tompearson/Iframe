(function () {
  var launcher = document.getElementById("chat-launcher");
  var panel = document.getElementById("chat-window");
  var header = document.getElementById("chat-window-header");
  var iframe = document.getElementById("chat-iframe");
  var btnClose = document.getElementById("chat-close");
  var btnMin = document.getElementById("chat-minimize");
  var btnPop = document.getElementById("chat-popout");

  if (!launcher || !panel || !iframe) return;

  var embedLoaded = false;

  function loadEmbed() {
    if (embedLoaded) return;
    var src = iframe.getAttribute("data-src");
    if (src) iframe.setAttribute("src", src);
    embedLoaded = true;
  }

  function openChat() {
    loadEmbed();
    panel.classList.remove("is-hidden");
    launcher.classList.add("is-hidden");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
  }

  function closeChat() {
    panel.classList.add("is-hidden");
    launcher.classList.remove("is-hidden");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
  }

  launcher.addEventListener("click", openChat);
  btnClose && btnClose.addEventListener("click", closeChat);
  btnMin && btnMin.addEventListener("click", closeChat);

  btnPop &&
    btnPop.addEventListener("click", function () {
      var url = iframe.getAttribute("data-src") || "/embed/";
      var features =
        "width=420,height=640,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no";
      var win = window.open(url, "santoshaAssistant", features);
      if (win) win.focus();
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
      panel.style.right = Math.max(8, startRight - dx) + "px";
      panel.style.bottom = Math.max(8, startBottom - dy) + "px";
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      header.classList.remove("is-dragging");
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
})();
