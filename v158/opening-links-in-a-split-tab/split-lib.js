// Shared helpers for the "Opening links in a split tab" demos (v158).
// Nothing here simulates a split: these helpers tokenise a window-features
// string the way HTML does, predict which container a browser will use, and
// collect the report that pane.html posts back after a REAL window.open().
(function () {
  "use strict";

  var PANE_URL = "/v158/opening-links-in-a-split-tab/pane.html";

  // HTML "tokenize the features argument" (simplified but faithful for the
  // separators the spec uses: whitespace, "=" and ",").
  function tokenize(features) {
    var out = new Map();
    var s = String(features || "");
    var i = 0;
    function isSep(c) {
      return c === " " || c === "\t" || c === "\n" || c === "\f" || c === "\r" || c === "=" ||
        c === ",";
    }
    function isWs(c) {
      return c === " " || c === "\t" || c === "\n" || c === "\f" || c === "\r";
    }
    while (i < s.length) {
      var name = "", value = "";
      while (i < s.length && isSep(s[i])) i++;
      while (i < s.length && !isSep(s[i])) name += s[i++];
      name = name.toLowerCase();
      while (i < s.length && isWs(s[i])) i++;
      if (i < s.length && (s[i] === "=" || s[i] === ",")) {
        // HTML: skip separators up to and including the first "," — but a
        // value follows only after "=".
        var sawEq = false;
        while (i < s.length && isSep(s[i]) && s[i] !== ",") {
          if (s[i] === "=") sawEq = true;
          i++;
        }
        if (sawEq) {
          while (i < s.length && isWs(s[i])) i++;
          while (i < s.length && !isSep(s[i])) value += s[i++];
        }
      }
      if (name) out.set(name, value.toLowerCase());
    }
    return out;
  }

  // HTML "parse a boolean feature".
  function parseBool(value) {
    if (value === "" || value === "yes" || value === "true") return true;
    var n = parseInt(value, 10);
    return !isNaN(n) && n !== 0;
  }

  function isSet(map, name, dflt) {
    return map.has(name) ? parseBool(map.get(name)) : dflt;
  }

  // HTML "checking if a popup window is requested", optionally with the
  // explainer's split amendment: a truthy split suppresses the legacy
  // heuristic, and only an explicit truthy popup still yields a popup.
  function popupRequested(features, splitAware) {
    var t = tokenize(features);
    if (t.size === 0) return false;
    if (splitAware && t.has("split") && parseBool(t.get("split"))) {
      return t.has("popup") ? parseBool(t.get("popup")) : false;
    }
    if (t.has("popup")) return parseBool(t.get("popup"));
    var location = isSet(t, "location", false);
    var toolbar = isSet(t, "toolbar", false);
    if (!location && !toolbar) return true;
    if (!isSet(t, "menubar", false)) return true;
    if (!isSet(t, "resizable", true)) return true;
    if (!isSet(t, "scrollbars", false)) return true;
    if (!isSet(t, "status", false)) return true;
    return false;
  }

  function hasApi() {
    return "windowFeatures" in HTMLAnchorElement.prototype;
  }

  function nonce() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  // Resolve with the pane's first report for this nonce, from either the
  // opener path (postMessage) or BroadcastChannel (noopener opens), or with
  // null after `ms`.
  function waitForReport(n, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var bc = ("BroadcastChannel" in window) ? new BroadcastChannel("sts-split-pane") : null;
      function finish(v) {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMsg);
        if (bc) bc.close();
        clearTimeout(timer);
        resolve(v);
      }
      function accept(d, via) {
        if (d && d.type === "pane-report" && d.nonce === n) finish(Object.assign({ via: via }, d));
      }
      function onMsg(ev) {
        if (ev.origin !== location.origin || ev.origin === "null") return;
        accept(ev.data, "postMessage via window.opener");
      }
      window.addEventListener("message", onMsg);
      if (bc) {
        bc.onmessage = function (ev) {
          accept(ev.data, "BroadcastChannel (no opener)");
        };
      }
      var timer = setTimeout(function () {
        finish(null);
      }, ms || 4000);
    });
  }

  function paneUrl(mode, n, extra) {
    var u = new URL(PANE_URL, location.href);
    u.searchParams.set("mode", mode || "report");
    if (n) u.searchParams.set("nonce", n);
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        u.searchParams.set(k, extra[k]);
      });
    }
    return u.pathname + u.search;
  }

  window.SplitTabLab = {
    PANE_URL: PANE_URL,
    tokenize: tokenize,
    parseBool: parseBool,
    popupRequested: popupRequested,
    hasApi: hasApi,
    nonce: nonce,
    waitForReport: waitForReport,
    paneUrl: paneUrl,
  };
})();
