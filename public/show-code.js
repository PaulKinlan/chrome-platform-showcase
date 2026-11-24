// Live-source "Show the code" hydrator.
// Reads the real running source directly from the page so code snippets never
// drift from working demos. Zero dependencies; safe to load on every page with
// `<details class="show-code">`.

const MARKER_START_RE = /^[ \t]*\/\/[ \t]*---[ \t]*demo[ \t]*---[ \t]*$/;
const MARKER_END_RE = /^[ \t]*\/\/[ \t]*---[ \t]*\/demo[ \t]*---[ \t]*$/;
const JS_SCRIPT_TYPES = new Set([
  "",
  "module",
  "text/javascript",
  "application/javascript",
  "text/ecmascript",
  "application/ecmascript",
]);
const IGNORED_SCRIPT_IDS = /(telemetry|conformance|show-code)/i;

/**
 * Normalizes line endings, removes leading/trailing blank lines, and strips
 * common leading indentation across non-empty lines.
 */
export function dedent(raw) {
  const lines = String(raw ?? "").replace(/\r\n?/g, "\n").split("\n");
  let start = 0;
  while (start < lines.length && lines[start].trim() === "") start++;
  let end = lines.length;
  while (end > start && lines[end - 1].trim() === "") end--;

  const slice = lines.slice(start, end);
  let minIndent = Infinity;
  for (const line of slice) {
    if (line.trim() === "") continue;
    const match = line.match(/^[ \t]*/);
    const indent = match ? match[0].length : 0;
    if (indent < minIndent) minIndent = indent;
  }
  if (!Number.isFinite(minIndent) || minIndent === 0) {
    return slice.join("\n").trimEnd();
  }
  return slice
    .map((line) => (line.trim() === "" ? "" : line.slice(minIndent)))
    .join("\n")
    .trimEnd();
}

/**
 * Extracts all `// --- demo ---` ... `// --- /demo ---` regions from a source
 * string. Returns `null` when no complete marked region is present.
 */
export function extractMarkedRegions(source) {
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  const regions = [];
  let collecting = false;
  let current = [];

  for (const line of lines) {
    if (!collecting && MARKER_START_RE.test(line)) {
      collecting = true;
      current = [];
      continue;
    }
    if (collecting && MARKER_END_RE.test(line)) {
      regions.push(dedent(current.join("\n")));
      collecting = false;
      current = [];
      continue;
    }
    if (collecting) {
      current.push(line);
    }
  }

  return regions.length > 0 ? regions.filter(Boolean).join("\n\n") : null;
}

function readElementSource(el) {
  const tag = el.tagName ? el.tagName.toUpperCase() : "";
  if (tag === "SCRIPT" || tag === "STYLE") {
    const raw = el.textContent ?? "";
    const marked = extractMarkedRegions(raw);
    return marked ?? dedent(raw);
  }
  if (tag === "TEMPLATE") {
    return dedent(el.innerHTML ?? "");
  }
  return dedent(el.outerHTML ?? el.textContent ?? "");
}

function isPrimaryInlineScript(script) {
  if (script.hasAttribute("src")) return false;
  if (script.hasAttribute("data-show-code-ignore")) return false;
  const type = (script.getAttribute("type") || "").trim().toLowerCase();
  if (!JS_SCRIPT_TYPES.has(type)) return false;
  const id = script.getAttribute("id") || "";
  if (IGNORED_SCRIPT_IDS.test(id)) return false;
  return (script.textContent || "").trim().length > 0;
}

function extractSource(details, doc) {
  const targetSelector = details.dataset.codeTarget;
  if (targetSelector) {
    try {
      const matches = [...doc.querySelectorAll(targetSelector)];
      if (matches.length > 0) {
        return matches.map(readElementSource).filter(Boolean).join("\n\n");
      }
    } catch {
      return `// Invalid data-code-target selector: ${targetSelector}`;
    }
    return `// No elements matched selector: ${targetSelector}`;
  }

  const inlineScripts = [...doc.querySelectorAll("script")].filter(isPrimaryInlineScript);
  if (inlineScripts.length === 0) {
    return "// No inline script found on this page.";
  }

  const markedParts = [];
  for (const script of inlineScripts) {
    const marked = extractMarkedRegions(script.textContent ?? "");
    if (marked) markedParts.push(marked);
  }
  if (markedParts.length > 0) {
    return markedParts.join("\n\n");
  }

  // Prefer the most substantial inline script if multiple exist.
  let primary = inlineScripts[0];
  for (const script of inlineScripts) {
    if ((script.textContent || "").length > (primary.textContent || "").length) {
      primary = script;
    }
  }
  return dedent(primary.textContent ?? "");
}

function selectCodeElement(codeEl) {
  if (typeof window === "undefined" || typeof window.getSelection !== "function") {
    return false;
  }
  const selection = window.getSelection();
  if (!selection || typeof document.createRange !== "function") return false;
  const range = document.createRange();
  range.selectNodeContents(codeEl);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

async function copyCode(text, codeEl, statusEl) {
  const announce = (message) => {
    statusEl.textContent = "";
    // Force a fresh live-region update even on repeated clicks.
    requestAnimationFrame(() => {
      statusEl.textContent = message;
    });
  };

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      announce("Copied");
      return;
    } catch {
      // Fall through to honest manual-copy fallback below.
    }
  }

  if (selectCodeElement(codeEl)) {
    announce("Clipboard unavailable — code selected; press Ctrl+C or Cmd+C to copy");
  } else {
    announce("Clipboard unavailable — select the code block to copy manually");
  }
}

export function hydrateShowCode(details, doc = document) {
  if (!details || details.dataset.codeHydrated === "true") return;
  details.dataset.codeHydrated = "true";

  const source = extractSource(details, doc);

  const bar = doc.createElement("div");
  bar.className = "show-code-bar";

  const label = doc.createElement("span");
  label.className = "show-code-label";
  label.textContent = details.dataset.codeLabel || "Live page source";

  const actions = doc.createElement("div");
  actions.className = "show-code-actions";

  const status = doc.createElement("span");
  status.className = "show-code-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");

  const copyBtn = doc.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "show-code-copy";
  copyBtn.textContent = "Copy code";

  const pre = doc.createElement("pre");
  pre.setAttribute("tabindex", "0");
  pre.setAttribute("aria-label", "Live demo source code");
  const code = doc.createElement("code");
  code.textContent = source;
  pre.append(code);

  copyBtn.addEventListener("click", () => {
    void copyCode(source, code, status);
  });

  actions.append(status, copyBtn);
  bar.append(label, actions);
  details.append(bar, pre);
}

export function initShowCode(doc = document) {
  const nodes = doc.querySelectorAll("details.show-code");
  for (const details of nodes) {
    if (details.dataset.codeBound === "true") continue;
    details.dataset.codeBound = "true";

    if (details.open) {
      hydrateShowCode(details, doc);
    } else {
      details.addEventListener("toggle", () => {
        if (details.open) hydrateShowCode(details, doc);
      });
    }
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initShowCode(document), { once: true });
  } else {
    initShowCode(document);
  }
}
