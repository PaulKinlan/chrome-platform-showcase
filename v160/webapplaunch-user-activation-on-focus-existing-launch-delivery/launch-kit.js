// Shared helpers for the "WebAppLaunch: user activation on focus-existing launch delivery"
// concept pages (Chrome 160, chromestatus 5191118118584320).
//
// Everything here reads REAL browser state. Nothing simulates a launch: a launch
// can only be delivered by the browser into an INSTALLED app window, so in a
// normal tab the consumer below simply never fires and the pages say so.
(function () {
  "use strict";

  var DISPLAY_MODES = [
    "window-controls-overlay",
    "tabbed",
    "standalone",
    "minimal-ui",
    "fullscreen",
    "picture-in-picture",
    "browser",
  ];

  function displayMode() {
    for (var i = 0; i < DISPLAY_MODES.length; i++) {
      try {
        if (matchMedia("(display-mode: " + DISPLAY_MODES[i] + ")").matches) return DISPLAY_MODES[i];
      } catch (_) { /* unknown display-mode keyword in this engine */ }
    }
    return "unknown";
  }

  function navigationType() {
    try {
      var e = performance.getEntriesByType("navigation")[0];
      return e ? e.type : "unknown";
    } catch (_) {
      return "unknown";
    }
  }

  // The exact surface the feature is observed through. Returns null when the
  // UserActivation API itself is missing (never coerced to false/true).
  function readActivation() {
    var ua = navigator.userActivation;
    if (!ua) return null;
    return { isActive: ua.isActive === true, hasBeenActive: ua.hasBeenActive === true };
  }

  function context() {
    var mode = displayMode();
    var hasQueue = "launchQueue" in window && !!window.launchQueue &&
      typeof window.launchQueue.setConsumer === "function";
    return {
      hasLaunchQueue: hasQueue,
      hasLaunchParams: typeof window.LaunchParams === "function",
      hasUserActivation: !!navigator.userActivation,
      displayMode: mode,
      // Installed app windows report a non-"browser" display mode. A browser tab
      // cannot receive a launch at all.
      inAppWindow: mode !== "browser" && mode !== "unknown",
      navType: navigationType(),
      secure: window.isSecureContext === true,
      canInstall: typeof navigator.install === "function",
    };
  }

  // Register THE launch consumer for this document. Reads navigator.userActivation
  // as the very first thing inside the callback, before anything could consume it.
  // `onDelivery(snapshot, params)` gets a plain snapshot. Returns false when
  // window.launchQueue is missing (no fake deliveries are ever produced).
  var registered = false;
  function listen(onDelivery) {
    if (registered) throw new Error("LaunchKit.listen: one consumer per document");
    var ctx = context();
    if (!ctx.hasLaunchQueue) return false;
    registered = true;
    var count = 0;
    var registering = true;
    window.launchQueue.setConsumer(function (params) {
      var act = readActivation(); // FIRST: the value the feature changes
      count += 1;
      var at = performance.now();
      var target = params && typeof params.targetURL === "string" ? params.targetURL : null;
      var files = params && params.files ? params.files.length : 0;
      // Heuristic, labelled as such in every page: the first delivery that arrives
      // while setConsumer() is still running or in the first seconds of the
      // document is the NAVIGATING launch that created this document (not covered
      // by the feature). Later deliveries were routed into the live document —
      // what launch_handler "focus-existing" does.
      var kind = count === 1 && (registering || at < 4000) ? "initial" : "live";
      var snap = {
        index: count,
        at: Math.round(at),
        kind: kind,
        isActive: act ? act.isActive : null,
        hasBeenActive: act ? act.hasBeenActive : null,
        targetURL: target,
        files: files,
        hasFocus: document.hasFocus(),
        visibility: document.visibilityState,
        navType: ctx.navType,
      };
      try {
        onDelivery(snap, params);
      } catch (err) {
        console.warn("launch consumer handler failed", err);
      }
    });
    registering = false;
    return true;
  }

  function assert(id, cond, details) {
    try {
      if (window.showcaseTelemetry && typeof window.showcaseTelemetry.assert === "function") {
        window.showcaseTelemetry.assert(id, !!cond, details || {});
      }
    } catch (_) { /* telemetry is best-effort */ }
  }

  function yesNo(v) {
    if (v === null || v === undefined) return '<span class="v-na">n/a</span>';
    return v ? '<span class="v-yes">true</span>' : '<span class="v-no">false</span>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Renders the "where am I running" panel + install control into `root`.
  function renderContext(root) {
    var c = context();
    var rows = [
      ["window.launchQueue", c.hasLaunchQueue ? "present" : "missing"],
      ["navigator.userActivation", c.hasUserActivation ? "present" : "missing"],
      ["display-mode", c.displayMode],
      ["running as", c.inAppWindow ? "installed app window" : "browser tab"],
      ["navigation type", c.navType],
    ];
    var html = '<ul class="ctx-grid">';
    rows.forEach(function (r) {
      html += "<li><strong>" + esc(r[0]) + "</strong>" + esc(r[1]) + "</li>";
    });
    html += "</ul>";
    if (!c.hasLaunchQueue) {
      html +=
        '<p class="note warn">This browser does not expose <code>window.launchQueue</code>, so no launch can ever be delivered here. Launch handling ships in Chromium-based desktop browsers and Android Chrome; Android WebView and iOS have no installed-web-app launch path.</p>';
    } else if (!c.inAppWindow) {
      html +=
        '<p class="note warn"><strong>Needs an installed app.</strong> You are in a browser tab: the browser only delivers <code>LaunchParams</code> into an <em>installed</em> app window, so the launch consumer on this page will not fire here. Install this concept as an app (button below, or the browser menu &rarr; <em>Cast, save, and share &rarr; Install page as app</em>), keep the app window open, then launch it again from one of the triggers on this page. Everything you see in this tab is either the real tab-side baseline or clearly labelled as such.</p>';
    } else {
      html +=
        '<p class="note">Running in an installed app window. Keep this window open and launch the app again (app shortcut, OS launcher, captured link or file) &mdash; with <code>"client_mode": "focus-existing"</code> the launch is delivered here.</p>';
    }
    root.innerHTML = html;
    if (!c.inAppWindow) {
      var bar = document.createElement("div");
      bar.className = "actions";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Install this concept as an app";
      var out = document.createElement("p");
      out.setAttribute("role", "status");
      out.className = "install-status";
      if (!c.canInstall) {
        btn.disabled = true;
        btn.setAttribute("aria-describedby", "install-why");
        out.id = "install-why";
        out.textContent =
          "navigator.install() is not available in this browser; use the browser menu to install instead.";
      } else {
        btn.addEventListener("click", function () {
          out.textContent = "Asking the browser to install…";
          Promise.resolve()
            .then(function () {
              return navigator.install();
            })
            .then(function () {
              out.textContent =
                "Installed (or already installed). Open the app window to continue.";
            })
            .catch(function (e) {
              out.textContent = "Install did not complete: " + (e && e.name ? e.name : e) +
                ". Use the browser menu instead.";
            });
        });
      }
      bar.appendChild(btn);
      root.appendChild(bar);
      root.appendChild(out);
    }
    return c;
  }

  window.LaunchKit = {
    context: context,
    readActivation: readActivation,
    listen: listen,
    assert: assert,
    yesNo: yesNo,
    esc: esc,
    renderContext: renderContext,
  };
})();
