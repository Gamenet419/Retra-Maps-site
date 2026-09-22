/* Retra Maps site script. No third-party code and no analytics.
   The only network request is the contact message you choose to send. */
(function () {
  "use strict";

  var CONSENT_KEY = "retra-consent";   // "essential" or "all"
  var THEME_KEY = "retra-theme";       // "light" or "dark"
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Storage helpers (each call is guarded because storage can be blocked) ---------- */
  function getConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function setConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch (e) { /* notice will show again */ }
  }
  function storedTheme() {
    try {
      var t = window.sessionStorage.getItem(THEME_KEY) || window.localStorage.getItem(THEME_KEY);
      return t === "light" || t === "dark" ? t : null;
    } catch (e) { return null; }
  }
  // "Accept" keeps the theme on this device. Otherwise it lasts only until the tab is closed.
  function saveTheme(theme) {
    try {
      if (getConsent() === "all") {
        window.localStorage.setItem(THEME_KEY, theme);
        window.sessionStorage.removeItem(THEME_KEY);
      } else {
        window.sessionStorage.setItem(THEME_KEY, theme);
        window.localStorage.removeItem(THEME_KEY);
      }
    } catch (e) { /* the theme still applies to this page view */ }
  }

  var COLOR_ROLES = {
    accent: { key: "retra-accent", varHue: "--hue", varSat: "--sat", attr: "data-accent", defaultHue: 205, defaultSat: 55 },
    text: { key: "retra-text", varHue: "--text-hue", varSat: "--text-sat", varSatMuted: "--text-sat-muted", attr: "data-text", defaultHue: 205, defaultSat: 12 }
  };

  // Stored as "hue,sat" (e.g. "205,55"). An older build saved a bare hue number for
  // accent only; that still parses fine and falls back to the default saturation.
  function storedColor(role) {
    try {
      var raw = window.sessionStorage.getItem(role.key) || window.localStorage.getItem(role.key);
      if (raw === null) { return null; }
      var parts = raw.split(",");
      var hue = parseInt(parts[0], 10);
      var sat = parts.length > 1 ? parseInt(parts[1], 10) : role.defaultSat;
      if (hue >= 0 && hue <= 360 && sat >= 0 && sat <= 100) { return { hue: hue, sat: sat }; }
      return null;
    } catch (e) { return null; }
  }
  // Same rule as the theme: kept on this device after "Accept", otherwise until the tab closes.
  function saveColor(role, value) {
    try {
      window.sessionStorage.removeItem(role.key);
      window.localStorage.removeItem(role.key);
      if (value === null) { return; }
      var store = getConsent() === "all" ? window.localStorage : window.sessionStorage;
      store.setItem(role.key, value.hue + "," + value.sat);
    } catch (e) { /* the color still applies to this page view */ }
  }
  function applyColor(role, value) {
    if (value === null) {
      root.removeAttribute(role.attr);
      root.style.removeProperty(role.varHue);
      root.style.removeProperty(role.varSat);
      if (role.varSatMuted) { root.style.removeProperty(role.varSatMuted); }
    } else {
      root.style.setProperty(role.varHue, String(value.hue));
      root.style.setProperty(role.varSat, value.sat + "%");
      if (role.varSatMuted) { root.style.setProperty(role.varSatMuted, Math.round(value.sat * 0.45) + "%"); }
      root.setAttribute(role.attr, "custom");
    }
  }

  /* ---------- Theme ---------- */
  var themeButton = document.getElementById("theme-toggle");
  var systemQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

  function currentTheme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function paintThemeButton() {
    if (!themeButton) { return; }
    var next = currentTheme() === "light" ? "dark" : "light";
    var label = themeButton.querySelector(".btn-label");
    if (label) { label.textContent = next === "light" ? "Light mode" : "Dark mode"; }
    themeButton.setAttribute("aria-label", "Switch to " + next + " mode");
  }
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    paintThemeButton();
  }
  if (themeButton) {
    themeButton.hidden = false;
    paintThemeButton();
    themeButton.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      applyTheme(next);
      saveTheme(next);
    });
  }
  if (systemQuery && systemQuery.addEventListener) {
    systemQuery.addEventListener("change", function (event) {
      if (!storedTheme()) { applyTheme(event.matches ? "light" : "dark"); }
    });
  }

  /* ---------- Cookie notice with a real choice ---------- */
  var banner = document.getElementById("consent");

  function padForBanner() {
    if (!banner) { return; }
    document.body.style.paddingBottom = banner.hidden ? "" : banner.offsetHeight + "px";
  }
  function showBanner(moveFocus) {
    if (!banner) { return; }
    banner.hidden = false;
    padForBanner();
    if (moveFocus) {
      var first = document.getElementById("consent-essential");
      if (first) { first.focus({ preventScroll: true }); }
    }
  }
  function choose(value) {
    setConsent(value);
    // Move any color already picked this visit to the right storage for the new choice.
    var t = storedTheme();
    if (t) { saveTheme(t); }
    Object.keys(COLOR_ROLES).forEach(function (key) {
      var c = storedColor(COLOR_ROLES[key]);
      if (c) { saveColor(COLOR_ROLES[key], c); }
    });
    banner.hidden = true;
    padForBanner();
  }
  if (banner) {
    if (getConsent()) {
      banner.hidden = true;
      padForBanner();
    } else {
      showBanner(false);
    }
  }

  var essentialButton = document.getElementById("consent-essential");
  var acceptButton = document.getElementById("consent-accept");
  if (essentialButton) { essentialButton.addEventListener("click", function () { choose("essential"); }); }
  if (acceptButton) { acceptButton.addEventListener("click", function () { choose("all"); }); }
  var reopen = document.getElementById("cookie-settings");
  if (reopen) { reopen.addEventListener("click", function () { showBanner(true); }); }
  window.addEventListener("resize", padForBanner);

  /* ---------- Header: dropdown menu, color pickers, scroll state, progress bar ---------- */
  var header = document.querySelector(".site-header");
  var nav = document.getElementById("site-nav");
  var menuButton = document.getElementById("menu-toggle");

  var openPanels = [];   // every setter below registers itself so closePanels() can reach it
  function closePanels(except) {
    openPanels.forEach(function (setOpen) { if (setOpen !== except) { setOpen(false); } });
  }

  function setMenu(open) {
    if (!nav || !menuButton) { return; }
    nav.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    menuButton.textContent = open ? "Close" : "Menu";
    if (open && header) { header.classList.remove("is-hidden"); }
  }
  openPanels.push(setMenu);

  if (menuButton && nav) {
    menuButton.hidden = false;
    menuButton.addEventListener("click", function () {
      var willOpen = menuButton.getAttribute("aria-expanded") !== "true";
      closePanels(setMenu);
      setMenu(willOpen);
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest && event.target.closest("a")) { setMenu(false); }
    });
  }

  /* Color wheel: hue is the angle around the circle, saturation is the distance from
     the center. Lightness is fixed per theme and role in CSS, so every point on the
     wheel stays readable; the wheel itself is drawn at a constant 50% lightness so the
     visitor sees a normal, familiar color wheel while picking. */
  function initColorPicker(opts) {
    var role = opts.role;
    var button = document.getElementById(opts.buttonId);
    var panel = document.getElementById(opts.panelId);
    var canvas = document.getElementById(opts.canvasId);
    var thumb = document.getElementById(opts.thumbId);
    var hueRange = document.getElementById(opts.hueRangeId);
    var satRange = document.getElementById(opts.satRangeId);
    var swatch = document.getElementById(opts.swatchId);
    var resetButton = document.getElementById(opts.resetId);
    var swatchButtons = panel ? panel.querySelectorAll(".swatch-btn") : [];
    if (!button || !panel || !canvas || !hueRange || !satRange) { return; }

    function setOpen(open) {
      panel.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && header) { header.classList.remove("is-hidden"); }
    }
    openPanels.push(setOpen);
    button.hidden = false;
    button.addEventListener("click", function () {
      var willOpen = button.getAttribute("aria-expanded") !== "true";
      closePanels(setOpen);
      setOpen(willOpen);
      if (willOpen) { hueRange.focus(); }
    });

    var size = canvas.width = canvas.height = 200;
    var ctx = canvas.getContext && canvas.getContext("2d");
    var center = size / 2;
    var radius = center - 2;

    function drawWheel() {
      if (!ctx) { return; }
      var image = ctx.createImageData(size, size);
      var data = image.data;
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          var dx = x - center, dy = y - center;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var i = (y * size + x) * 4;
          if (dist > radius) { continue; }
          var angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
          var sat = Math.min(100, (dist / radius) * 100);
          var rgb = hslToRgb(angle, sat, 50);
          data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    }
    drawWheel();

    function paint(hue, sat) {
      hueRange.value = String(hue);
      satRange.value = String(sat);
      hueRange.setAttribute("aria-valuetext", hue + " degrees");
      satRange.setAttribute("aria-valuetext", sat + "%");
      var rect = { w: canvas.clientWidth || size, h: canvas.clientHeight || size };
      var rad = (hue * Math.PI) / 180;
      var dist = (sat / 100) * (rect.w / 2 - 2);
      var px = rect.w / 2 + Math.cos(rad) * dist;
      var py = rect.h / 2 + Math.sin(rad) * dist;
      if (thumb) { thumb.style.left = px + "px"; thumb.style.top = py + "px"; thumb.style.setProperty("--wheel-thumb", "hsl(" + hue + " " + sat + "% 50%)"); }
      if (swatch) { swatch.style.background = "hsl(" + hue + " " + sat + "% 50%)"; }
    }

    function current() { return { hue: parseInt(hueRange.value, 10), sat: parseInt(satRange.value, 10) }; }
    function set(hue, sat, persist) {
      hue = ((Math.round(hue) % 360) + 360) % 360;
      sat = Math.max(0, Math.min(100, Math.round(sat)));
      paint(hue, sat);
      applyColor(role, { hue: hue, sat: sat });
      if (persist) { saveColor(role, { hue: hue, sat: sat }); }
    }

    var start = storedColor(role);
    paint(start ? start.hue : role.defaultHue, start ? start.sat : role.defaultSat);
    if (start) { applyColor(role, start); }

    function fromPoint(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      var x = clientX - rect.left - rect.width / 2;
      var y = clientY - rect.top - rect.height / 2;
      var dist = Math.min(rect.width / 2, Math.sqrt(x * x + y * y));
      var angle = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      var sat = (dist / (rect.width / 2)) * 100;
      set(angle, sat, false);
    }
    var dragging = false;
    canvas.addEventListener("pointerdown", function (event) {
      dragging = true;
      canvas.setPointerCapture(event.pointerId);
      fromPoint(event.clientX, event.clientY);
    });
    canvas.addEventListener("pointermove", function (event) { if (dragging) { fromPoint(event.clientX, event.clientY); } });
    function endDrag() { if (dragging) { dragging = false; saveColor(role, current()); } }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    hueRange.addEventListener("input", function () { set(hueRange.value, satRange.value, false); });
    satRange.addEventListener("input", function () { set(hueRange.value, satRange.value, false); });
    hueRange.addEventListener("change", function () { saveColor(role, current()); });
    satRange.addEventListener("change", function () { saveColor(role, current()); });

    swatchButtons.forEach(function (b) {
      b.addEventListener("click", function () {
        set(parseInt(b.getAttribute("data-hue"), 10), parseInt(b.getAttribute("data-sat"), 10), true);
      });
    });
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        applyColor(role, null);
        saveColor(role, null);
        paint(role.defaultHue, role.defaultSat);
      });
    }
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  initColorPicker({
    role: COLOR_ROLES.accent, buttonId: "accent-toggle", panelId: "accent-panel",
    canvasId: "accent-wheel", thumbId: "accent-thumb", hueRangeId: "accent-hue-range",
    satRangeId: "accent-sat-range", swatchId: "accent-swatch", resetId: "accent-reset"
  });
  initColorPicker({
    role: COLOR_ROLES.text, buttonId: "text-toggle", panelId: "text-panel",
    canvasId: "text-wheel", thumbId: "text-thumb", hueRangeId: "text-hue-range",
    satRangeId: "text-sat-range", swatchId: "text-swatch", resetId: "text-reset"
  });

  function anyPanelOpen() {
    return !!((nav && nav.classList.contains("is-open")) ||
      (header && header.querySelector(".color-panel.is-open")));
  }
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !anyPanelOpen()) { return; }
    var focusTarget = header && header.querySelector('[aria-expanded="true"]');
    closePanels();
    if (focusTarget) { focusTarget.focus(); }
  });
  document.addEventListener("click", function (event) {
    if (!header || header.contains(event.target)) { return; }
    closePanels();
  });

  var lastY = window.pageYOffset || 0;
  var ticking = false;
  var hero = document.querySelector(".hero");

  function onScroll() {
    ticking = false;
    var y = window.pageYOffset || 0;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    if (header) {
      header.classList.toggle("is-scrolled", y > 8);
      header.style.setProperty("--progress", Math.min(1, y / max).toFixed(4));
      var menuOpen = anyPanelOpen();
      var focusInside = false;   // keyboard focus inside the header keeps it visible
      try { focusInside = header.contains(document.activeElement) && document.activeElement.matches(":focus-visible"); } catch (e) { focusInside = false; }
      if (!reduceMotion && !menuOpen && !focusInside) {
        if (y > lastY + 6 && y > 160) { header.classList.add("is-hidden"); }
        else if (y < lastY - 6 || y <= 160) { header.classList.remove("is-hidden"); }
      } else {
        header.classList.remove("is-hidden");
      }
    }
    if (hero && !reduceMotion && y < window.innerHeight * 1.2) {
      hero.style.setProperty("--parallax", Math.round(y * 0.12) + "px");
    }
    lastY = y;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  if (header) {
    header.addEventListener("focusin", function () { header.classList.remove("is-hidden"); });
  }
  onScroll();

  /* ---------- Scroll reveal ---------- */
  var revealItems = document.querySelectorAll("[data-reveal]");
  if (revealItems.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      root.classList.add("reveal-ready");   // content stays visible if this script never runs
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      revealItems.forEach(function (el) { observer.observe(el); });
    }
  }

  /* ---------- Lightbox ---------- */
  var dialog = document.getElementById("lightbox");
  if (dialog && typeof dialog.showModal === "function") {
    var dialogImg = dialog.querySelector("img");
    var dialogCaption = dialog.querySelector(".lightbox-caption");
    var btnPrev = dialog.querySelector("[data-prev]");
    var btnNext = dialog.querySelector("[data-next]");
    var btnClose = dialog.querySelector("[data-close]");
    var current = { items: [], index: 0, opener: null };

    var show = function () {
      var item = current.items[current.index];
      var thumb = item.querySelector("img");
      dialogImg.src = item.getAttribute("href");
      dialogImg.alt = thumb ? thumb.alt : "";
      dialogCaption.textContent = "Image " + (current.index + 1) + " of " + current.items.length;
    };
    var step = function (delta) {
      var n = current.items.length;
      current.index = (current.index + delta + n) % n;
      show();
    };

    document.querySelectorAll("a.shot").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        var group = link.getAttribute("data-gallery");
        current.items = Array.prototype.slice.call(document.querySelectorAll('a.shot[data-gallery="' + group + '"]'));
        current.index = current.items.indexOf(link);
        current.opener = link;
        show();
        dialog.showModal();
        btnClose.focus();
      });
    });

    btnPrev.addEventListener("click", function () { step(-1); });
    btnNext.addEventListener("click", function () { step(1); });
    btnClose.addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (event) { if (event.target === dialog) { dialog.close(); } });
    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    });
    dialog.addEventListener("close", function () {
      dialogImg.removeAttribute("src");
      if (current.opener) { current.opener.focus(); }
    });
  }

  /* ---------- Copy buttons ---------- */
  document.querySelectorAll("[data-copy-target]").forEach(function (button) {
    button.addEventListener("click", function () {
      var source = document.getElementById(button.getAttribute("data-copy-target"));
      var status = document.getElementById(button.getAttribute("data-copy-status"));
      if (!source) { return; }
      var text = source.textContent;
      var done = function (message) { if (status) { status.textContent = message; } };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done("Copied."); }, function () { done("Copy failed. Select the text and copy it by hand."); });
      } else {
        var range = document.createRange();
        range.selectNodeContents(source);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        done("Text selected. Press Ctrl+C or Cmd+C to copy it.");
      }
      window.setTimeout(function () { done(""); }, 4000);
    });
  });

  /* ---------- Contact form ---------- */
  var form = document.getElementById("contact-form");
  if (form) {
    var errorBox = document.getElementById("form-error");
    var successBox = document.getElementById("form-success");
    var submitButton = form.querySelector('button[type="submit"]');

    // A link such as index.html?topic=Data%20deletion%20request#contact preselects the topic.
    try {
      var wanted = new URLSearchParams(window.location.search).get("topic");
      if (wanted) {
        Array.prototype.forEach.call(form.elements["topic"].options, function (option) {
          if (option.value === wanted) { form.elements["topic"].value = wanted; }
        });
      }
    } catch (e) { /* ignore */ }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var problems = [];
      if (!form.elements["name"].value.trim()) { problems.push("Enter your name."); }
      var from = form.elements["email"].value.trim();
      if (!from || from.indexOf("@") < 1) { problems.push("Enter an email address I can reply to."); }
      if (!form.elements["message"].value.trim()) { problems.push("Write a message."); }
      if (!form.elements["adult"].checked) { problems.push("Confirm that you are 18 or older."); }
      if (!form.elements["privacy"].checked) { problems.push("Confirm that you have read the privacy policy."); }

      if (problems.length) {
        errorBox.textContent = problems.join(" ");
        var first = form.querySelector("input:invalid, textarea:invalid, input[type=checkbox]:not(:checked)");
        if (first) { first.focus(); }
        return;
      }
      errorBox.textContent = "";
      submitButton.disabled = true;
      submitButton.textContent = "Sending";

      var body = new URLSearchParams(new window.FormData(form)).toString();
      window.fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body
      }).then(function (response) {
        if (!response.ok) { throw new Error("HTTP " + response.status); }
        form.reset();
        form.hidden = true;
        successBox.hidden = false;
        successBox.focus();
      }).catch(function () {
        errorBox.textContent = "Your message could not be sent. Please try again in a moment, or message me on X instead.";
      }).then(function () {
        submitButton.disabled = false;
        submitButton.textContent = "Send message";
      });
    });
  }
})();
