/* Retra Maps site script. No third-party code and no analytics.
   The only network request is the contact message you choose to send. */
(function () {
  "use strict";

  var CONSENT_KEY = "retra-consent";   // "essential" or "all"
  var THEME_KEY = "retra-theme";       // "light" or "dark"
  var ACCENT_KEY = "retra-accent-hue"; // 0–360
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
  function storedAccent() {
    try {
      var h = window.sessionStorage.getItem(ACCENT_KEY) || window.localStorage.getItem(ACCENT_KEY);
      if (h === null || h === "") { return null; }
      var n = parseInt(h, 10);
      return (n >= 0 && n <= 360) ? n : null;
    } catch (e) { return null; }
  }
  function saveAccent(hue) {
    try {
      if (getConsent() === "all") {
        window.localStorage.setItem(ACCENT_KEY, String(hue));
        window.sessionStorage.removeItem(ACCENT_KEY);
      } else {
        window.sessionStorage.setItem(ACCENT_KEY, String(hue));
        window.localStorage.removeItem(ACCENT_KEY);
      }
    } catch (e) { /* accent still applies to this page view */ }
  }

  /* ---------- Theme ---------- */
  var themeButton = document.getElementById("theme-toggle");
  var systemQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

  function currentTheme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function paintThemeButton() {
    if (!themeButton) { return; }
    var next = currentTheme() === "light" ? "dark" : "light";
    themeButton.textContent = next === "light" ? "Light mode" : "Dark mode";
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

  /* ---------- Custom accent color (hue slider) ---------- */
  var accentToggle = document.getElementById("accent-toggle");
  var accentPanel = document.getElementById("accent-panel");
  var accentSlider = document.getElementById("accent-slider");
  var accentSwatch = document.getElementById("accent-swatch");

  function applyAccent(hue) {
    hue = Math.max(0, Math.min(360, Math.round(hue)));
    var isLight = currentTheme() === "light";
    // Map hue to readable accent tones for dark and light themes
    var ice = isLight
      ? "hsl(" + hue + ", 80%, 28%)"
      : "hsl(" + hue + ", 55%, 78%)";
    var iceStrong = isLight
      ? "hsl(" + hue + ", 82%, 20%)"
      : "hsl(" + hue + ", 60%, 88%)";
    root.style.setProperty("--ice", ice);
    root.style.setProperty("--ice-strong", iceStrong);
    if (accentSlider) { accentSlider.value = String(hue); }
    if (accentSwatch) { accentSwatch.style.background = ice; }
  }

  function initAccent() {
    var stored = storedAccent();
    var initial = stored !== null ? stored : 205; // default blue-ish
    applyAccent(initial);
  }

  if (accentToggle && accentPanel) {
    accentToggle.hidden = false;
    accentToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !accentPanel.classList.contains("is-open");
      accentPanel.classList.toggle("is-open", open);
      accentToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!accentPanel.classList.contains("is-open")) { return; }
      if (accentPanel.contains(e.target) || accentToggle.contains(e.target)) { return; }
      accentPanel.classList.remove("is-open");
      accentToggle.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && accentPanel.classList.contains("is-open")) {
        accentPanel.classList.remove("is-open");
        accentToggle.setAttribute("aria-expanded", "false");
        accentToggle.focus();
      }
    });
  }
  if (accentSlider) {
    accentSlider.addEventListener("input", function () {
      var hue = parseInt(accentSlider.value, 10);
      applyAccent(hue);
      saveAccent(hue);
    });
  }
  // Re-apply accent when theme flips so lightness stays readable
  if (themeButton) {
    themeButton.addEventListener("click", function () {
      var hue = accentSlider ? parseInt(accentSlider.value, 10) : (storedAccent() || 205);
      applyAccent(hue);
    });
  }
  initAccent();

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
    var chosen = storedTheme();
    if (chosen) { saveTheme(chosen); }   // move an existing theme choice to the right place
    var accent = storedAccent();
    if (accent !== null) { saveAccent(accent); }
    banner.hidden = true;
    padForBanner();
  }
  if (banner && !getConsent()) { showBanner(false); }

  var essentialButton = document.getElementById("consent-essential");
  var acceptButton = document.getElementById("consent-accept");
  if (essentialButton) { essentialButton.addEventListener("click", function () { choose("essential"); }); }
  if (acceptButton) { acceptButton.addEventListener("click", function () { choose("all"); }); }
  var reopen = document.getElementById("cookie-settings");
  if (reopen) { reopen.addEventListener("click", function () { showBanner(true); }); }
  window.addEventListener("resize", padForBanner);

  /* ---------- Header: side panel menu, scroll state, progress bar ---------- */
  var header = document.querySelector(".site-header");
  var nav = document.getElementById("site-nav");
  var menuButton = document.getElementById("menu-toggle");
  var navBackdrop = document.createElement("button");
  navBackdrop.type = "button";
  navBackdrop.className = "nav-backdrop";
  navBackdrop.setAttribute("aria-label", "Close menu");
  navBackdrop.hidden = true;
  document.body.appendChild(navBackdrop);

  function setMenu(open) {
    if (!nav || !menuButton) { return; }
    nav.classList.toggle("is-open", open);
    navBackdrop.classList.toggle("is-open", open);
    navBackdrop.hidden = !open;
    document.body.classList.toggle("nav-open", open);
    menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    menuButton.textContent = open ? "Close" : "Menu";
    if (open && header) { header.classList.remove("is-hidden"); }
  }
  if (menuButton && nav) {
    menuButton.hidden = false;
    menuButton.addEventListener("click", function () {
      setMenu(menuButton.getAttribute("aria-expanded") !== "true");
    });
    navBackdrop.addEventListener("click", function () { setMenu(false); });
    nav.addEventListener("click", function (event) {
      if (event.target.closest && event.target.closest("a")) { setMenu(false); }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setMenu(false);
        menuButton.focus();
      }
    });
  }

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
      var menuOpen = nav && nav.classList.contains("is-open");
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
