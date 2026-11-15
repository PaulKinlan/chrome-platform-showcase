// Shared helpers for the "Opening links in a split tab" concepts.
// - probe(): the explainer's own feature detection ('windowFeatures' in
//   HTMLAnchorElement.prototype) plus a reflection round-trip, so an inherited
//   stub cannot read as support.
// - tokenize()/popupRequested(): the HTML Standard's window-features tokenizer and
//   "check if a popup window is requested", so pages can predict what a browser
//   WITHOUT the feature does with a "split" string (spoiler: opens a popup).
// - interpretSplit(): the explainer's rules for split / splitposition / splitsize.
// - waitForReport(): collects the report that ../target.html posts back.
(() => {
  "use strict";
  const TARGET_URL = new URL("./target.html", document.currentScript.src).href;
  const SEP = new Set([" ", "\t", "\n", "\f", "\r", "=", ","]);
  const ALIASES = { screenx: "left", screeny: "top", innerwidth: "width", innerheight: "height" };

  function tokenize(features) {
    const out = new Map();
    let i = 0;
    const s = String(features);
    while (i < s.length) {
      let name = "";
      let value = "";
      while (i < s.length && SEP.has(s[i])) i++;
      while (i < s.length && !SEP.has(s[i])) name += s[i++];
      name = name.toLowerCase();
      name = ALIASES[name] || name;
      while (i < s.length && s[i] !== "=") {
        if (s[i] === "," || !SEP.has(s[i])) break;
        i++;
      }
      if (i < s.length && SEP.has(s[i])) {
        while (i < s.length && SEP.has(s[i])) {
          if (s[i] === ",") break;
          i++;
        }
        while (i < s.length && !SEP.has(s[i])) value += s[i++];
        value = value.toLowerCase();
      }
      if (name !== "") out.set(name, value);
    }
    return out;
  }

  function parseBool(value) {
    if (value === "" || value === "yes" || value === "true") return true;
    const n = parseInt(value, 10);
    return (Number.isNaN(n) ? 0 : n) !== 0;
  }

  function isSet(tokens, name, dflt) {
    return tokens.has(name) ? parseBool(tokens.get(name)) : dflt;
  }

  // HTML: "check if a popup window is requested".
  function popupRequested(tokens) {
    if (tokens.size === 0) return { popup: false, why: "empty feature string" };
    if (tokens.has("popup")) {
      return {
        popup: parseBool(tokens.get("popup")),
        why: `explicit popup=${tokens.get("popup") || "(empty)"}`,
      };
    }
    const location = isSet(tokens, "location", false);
    const toolbar = isSet(tokens, "toolbar", false);
    if (!location && !toolbar) {
      return { popup: true, why: "non-empty string without location/toolbar" };
    }
    if (!isSet(tokens, "menubar", false)) return { popup: true, why: "menubar not set" };
    if (!isSet(tokens, "resizable", true)) return { popup: true, why: "resizable=no" };
    if (!isSet(tokens, "scrollbars", false)) return { popup: true, why: "scrollbars not set" };
    if (!isSet(tokens, "status", false)) return { popup: true, why: "status not set" };
    return { popup: false, why: "location, toolbar, menubar, scrollbars and status all set" };
  }

  // The explainer's rules for supporting browsers.
  function interpretSplit(tokens) {
    const split = tokens.has("split") && parseBool(tokens.get("split"));
    const noopener = (tokens.has("noopener") && parseBool(tokens.get("noopener"))) ||
      (tokens.has("noreferrer") && parseBool(tokens.get("noreferrer")));
    const legacy = popupRequested(tokens);
    let position = null;
    let positionNote = "not given: browser default (likely right / inline-end)";
    if (tokens.has("splitposition")) {
      const v = tokens.get("splitposition");
      if (["left", "right", "top", "bottom"].includes(v)) {
        position = v;
        positionNote = v;
      } else {positionNote =
          `"${v}" is not left/right/top/bottom, so it is ignored (browser default)`;}
    }
    let size = null;
    let sizeNote = "not given: browser default (likely 50%)";
    if (tokens.has("splitsize")) {
      const raw = tokens.get("splitsize");
      const n = /^\d+$/.test(raw) ? Number(raw) : NaN;
      if (Number.isNaN(n)) {
        sizeNote = `"${raw}" is not an integer, so it is ignored (browser default)`;
      } else if (n < 0 || n > 100) {
        sizeNote = `${n} is out of range, so it is ignored (browser default)`;
      } else {
        size = n;
        sizeNote = `${n}% for the new content (browser may clamp extremes)`;
      }
    }
    const popupToo = tokens.has("popup") && parseBool(tokens.get("popup"));
    let supporting;
    if (split) {
      supporting = `Split tab requested${position ? ` on the ${position}` : ""}${
        size != null ? ` at ${size}%` : ""
      }. If the browser declines (narrow window, mobile, already split): ${
        popupToo ? "a POPUP, because popup was also requested" : "an ordinary new tab"
      }.`;
    } else {supporting = legacy.popup
        ? "No split requested: a popup window."
        : "No split requested: an ordinary new tab.";}
    const legacyText = legacy.popup
      ? `POPUP window (${legacy.why})`
      : `ordinary new tab (${legacy.why})`;
    return {
      split,
      noopener,
      position,
      positionNote,
      size,
      sizeNote,
      supporting,
      legacy: legacyText,
      legacyPopup: legacy.popup,
    };
  }

  function probe() {
    const inProto = typeof HTMLAnchorElement !== "undefined" &&
      "windowFeatures" in HTMLAnchorElement.prototype;
    let reflects = false;
    try {
      const a = document.createElement("a");
      a.setAttribute("windowfeatures", "split,splitsize=40");
      reflects = a.windowFeatures === "split,splitsize=40";
    } catch {
      reflects = false;
    }
    return { inProto, reflects, supported: inProto && reflects };
  }

  const FLAG_TEXT =
    "WindowOpenSplitTab (Blink status: experimental). Enable it with --enable-experimental-web-platform-features, or --enable-blink-features=WindowOpenSplitTab, or --enable-features=WindowOpenSplitTab (the browser-side kill switch the Blink side copies when overridden). No chrome://flags entry exists. An origin trial named WindowOpenSplitTab runs M160–M170. The browser also needs a split view UI to honour the request.";

  // Resolves with the report from target.html carrying the given run id, or
  // null after `ms`. Listens on window messages (opener kept) and on the
  // BroadcastChannel the target uses when it has no opener.
  function waitForReport(run, ms = 4000) {
    return new Promise((resolve) => {
      let bc = null;
      const done = (v) => {
        removeEventListener("message", onMsg);
        bc?.close();
        clearTimeout(timer);
        resolve(v);
      };
      const onMsg = (e) => {
        if (e.origin !== location.origin) return;
        if (e.data?.src === "split-tab-target" && e.data.run === String(run)) {
          done(Object.assign({ via: "window.opener.postMessage" }, e.data));
        }
      };
      addEventListener("message", onMsg);
      if ("BroadcastChannel" in self) {
        bc = new BroadcastChannel("split-tab-demo");
        bc.onmessage = (e) => {
          if (e.data?.src === "split-tab-target" && e.data.run === String(run)) {
            done(Object.assign({ via: "BroadcastChannel (no opener)" }, e.data));
          }
        };
      }
      const timer = setTimeout(() => done(null), ms);
    });
  }

  function describeReport(r) {
    if (!r) {
      return "No report arrived from the opened view (it may have been blocked, or not opened at all).";
    }
    return [
      `presentation: ${
        r.toolbarVisible === false
          ? "POPUP window (toolbar.visible=false)"
          : "tab (toolbar.visible=true): split or not cannot be read back, by design"
      }`,
      `opener in the new view: ${r.hasOpener ? "present" : "null"}`,
      `its viewport: ${r.innerWidth}×${r.innerHeight} (screen.availWidth ${r.screenAvailWidth})`,
      `window.name: ${r.name || "(empty)"}`,
      `report channel: ${r.via}`,
    ].join("\n");
  }

  let runCounter = 0;
  function nextRun(prefix) {
    runCounter++;
    return `${prefix}-${Date.now().toString(36)}-${runCounter}`;
  }

  globalThis.SplitTabDemo = Object.freeze({
    TARGET_URL,
    tokenize,
    popupRequested,
    interpretSplit,
    probe,
    waitForReport,
    describeReport,
    nextRun,
    FLAG_TEXT,
  });
})();
