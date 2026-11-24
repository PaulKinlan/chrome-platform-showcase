(() => {
  "use strict";

  const endpoint = "/telemetry/demo";
  const batchWindow = 8000;
  const maxEvents = 80;
  const maxString = 500;
  const sessionId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const startedAt = performance.now();
  const queue = [];
  let controller = null;
  let pendingResult = null;

  globalThis.fetchLater ??= function fetchLaterPolyfill(url, init = {}) {
    let timeoutHandle;
    let activated = false;

    function sendNow() {
      if (!(init.signal && init.signal.aborted)) {
        if ("keepalive" in Request.prototype || init.method !== "POST" || init.headers) {
          fetch(url, Object.assign({}, init, { keepalive: true })).catch(() => {});
          activated = true;
        } else if (navigator.sendBeacon) {
          activated = navigator.sendBeacon(url, init.body);
        }
      }
      destroy();
    }

    function destroy() {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimeout(timeoutHandle);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") sendNow();
    }

    if (document.visibilityState === "hidden") {
      queueMicrotask(sendNow);
    } else {
      document.addEventListener("visibilitychange", onVisibilityChange);
      if (typeof init.activateAfter === "number" && init.activateAfter >= 0) {
        timeoutHandle = setTimeout(sendNow, init.activateAfter);
      }
    }

    init.signal?.addEventListener("abort", destroy, { once: true });
    return {
      get activated() {
        return activated;
      },
    };
  };

  function clamp(value, max = maxString) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  }

  function targetSummary(target) {
    if (!(target instanceof Element)) return "";
    const tag = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : "";
    const cls = target.classList?.length ? `.${[...target.classList].slice(0, 3).join(".")}` : "";
    const role = target.getAttribute("role");
    const name = target.getAttribute("aria-label") || target.getAttribute("title") ||
      target.textContent;
    return clamp(
      `${tag}${id}${cls}${role ? `[role=${role}]` : ""}${name ? ` — ${name}` : ""}`,
      220,
    );
  }

  // One small, non-identifying snapshot of the browser per batch, so triage can tell "API missing in
  // Chrome 138" apart from a real demo bug. Major version + coarse device class only.
  function chromeMajor() {
    const brands = navigator.userAgentData?.brands || [];
    const brand = brands.find((b) => /^(Google Chrome|Chromium|Microsoft Edge)$/.test(b.brand));
    if (brand) return Number(brand.version) || null;
    const match = navigator.userAgent.match(/Chrom(?:e|ium)\/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  const env = (() => {
    try {
      return {
        chrome: chromeMajor(),
        platform: clamp(navigator.userAgentData?.platform || navigator.platform || "", 40),
        mobile: navigator.userAgentData?.mobile ??
          matchMedia("(pointer: coarse) and (max-width: 820px)").matches,
        viewport: innerWidth < 640 ? "narrow" : "wide",
        dpr: Math.round((devicePixelRatio || 1) * 10) / 10,
        memory: navigator.deviceMemory ?? null,
        connection: navigator.connection?.effectiveType ?? null,
        secure: isSecureContext,
        crossOriginIsolated: Boolean(globalThis.crossOriginIsolated),
      };
    } catch {
      return {};
    }
  })();

  function baseEvent(kind, data = {}) {
    return {
      kind,
      page: location.pathname,
      pageTitle: document.title,
      sessionId,
      at: new Date().toISOString(),
      t: Math.round(performance.now()),
      visibilityState: document.visibilityState,
      severity: data.severity ||
        (kind.includes("error") || kind.includes("fail") ? "error" : "info"),
      ...data,
    };
  }

  function schedule() {
    if (!queue.length) return;
    if (pendingResult?.activated || queue.length > maxEvents) {
      queue.splice(0, Math.max(0, queue.length - maxEvents));
      controller = null;
      pendingResult = null;
    }
    controller?.abort();
    controller = new AbortController();
    const body = JSON.stringify({
      kind: "demo.batch",
      severity: queue.some((event) => event.severity === "error") ? "error" : "info",
      page: location.pathname,
      sessionId,
      duration: Math.round(performance.now() - startedAt),
      env,
      events: queue.slice(-maxEvents),
    });
    try {
      pendingResult = fetchLater(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: controller.signal,
        activateAfter: batchWindow,
      });
    } catch {
      if (navigator.sendBeacon) navigator.sendBeacon(endpoint, body);
    }
  }

  function track(kind, data = {}) {
    queue.push(baseEvent(kind, data));
    if (queue.length > maxEvents) queue.shift();
    schedule();
  }

  function safeReason(reason) {
    if (reason instanceof Error || reason instanceof DOMException) {
      return {
        errorName: clamp(reason.name, 80),
        message: clamp(reason.message),
        stack: clamp(reason.stack, 1200),
      };
    }
    return { message: clamp(reason) };
  }

  const originalConsole = {};
  for (const level of ["error", "warn"]) {
    originalConsole[level] = console[level];
    console[level] = (...args) => {
      try {
        track(`console.${level}`, {
          severity: level === "error" ? "error" : "warning",
          message: clamp(
            args.map((arg) => typeof arg === "string" ? arg : JSON.stringify(arg)).join(" "),
            1000,
          ),
        });
      } catch {}
      originalConsole[level].apply(console, args);
    };
  }

  window.addEventListener("error", (event) => {
    const target = event.target;
    if (target && target !== window) {
      track("resource.error", {
        severity: "error",
        target: targetSummary(target),
        source: clamp(target.currentSrc || target.src || target.href || "", 1000),
      });
      return;
    }
    track("runtime.error", {
      severity: "error",
      message: clamp(event.message),
      source: clamp(event.filename),
      line: event.lineno,
      column: event.colno,
      errorName: clamp(event.error?.name, 80),
      stack: clamp(event.error?.stack, 1200),
    });
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    track("runtime.unhandledrejection", { severity: "error", ...safeReason(event.reason) });
  });

  document.addEventListener("click", (event) => {
    const interactive = event.target?.closest?.(
      "button, a, input, select, textarea, summary, [role=button], [role=tab], [onclick], [popover], [popovertarget]",
    );
    if (!interactive) return;
    track("interaction.click", { target: targetSummary(interactive) });
  }, { capture: true, passive: true });

  document.addEventListener("submit", (event) => {
    track("interaction.submit", { target: targetSummary(event.target) });
  }, { capture: true });

  window.addEventListener("load", () => {
    const nav = performance.getEntriesByType("navigation")[0];
    track("page.load", {
      duration: Math.round(performance.now()),
      transferSize: Math.round(nav?.transferSize || 0),
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd || 0),
    });
  }, { once: true });

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "largest-contentful-paint") {
          track("perf.lcp", {
            value: Math.round(entry.startTime),
            element: targetSummary(entry.element),
          });
        } else if (entry.entryType === "layout-shift" && !entry.hadRecentInput) {
          track("perf.cls-shift", { value: Number(entry.value.toFixed(4)) });
        } else if (entry.entryType === "event" && entry.duration >= 200) {
          track("perf.slow-interaction", {
            severity: "warning",
            value: Math.round(entry.duration),
            name: entry.name,
            target: targetSummary(entry.target),
          });
        } else if (entry.entryType === "long-animation-frame") {
          track("perf.long-animation-frame", {
            severity: "warning",
            value: Math.round(entry.duration),
          });
        }
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) =>
        !entry.hadRecentInput && track("perf.cls-shift", { value: Number(entry.value.toFixed(4)) })
      )
    ).observe({ type: "layout-shift", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) =>
        entry.duration >= 200 &&
        track("perf.slow-interaction", {
          severity: "warning",
          value: Math.round(entry.duration),
          name: entry.name,
          target: targetSummary(entry.target),
        })
      )
    ).observe({ type: "event", buffered: true, durationThreshold: 200 });
  } catch {}
  try {
    new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) => {
        // Attribute the frame to its heaviest script so triage can name the culprit.
        const top = [...(entry.scripts || [])].sort((a, b) => b.duration - a.duration)[0];
        track("perf.long-animation-frame", {
          severity: "warning",
          value: Math.round(entry.duration),
          blocking: Math.round(entry.blockingDuration || 0),
          script: top
            ? {
              source: clamp(String(top.sourceURL || "").split("?")[0], 300),
              invoker: clamp(top.invoker, 160),
              duration: Math.round(top.duration),
            }
            : null,
        });
      })
    ).observe({ type: "long-animation-frame", buffered: true });
  } catch {}

  // Deprecation and intervention reports are only visible in-page (they never reach the
  // Reporting-Endpoints header). These say "Chrome changed or blocked what this demo did".
  try {
    if (typeof ReportingObserver === "function") {
      new ReportingObserver((reports) => {
        for (const report of reports) {
          const body = report.body || {};
          track(`report.${report.type}`, {
            severity: "warning",
            id: clamp(body.id, 120),
            message: clamp(body.message, 600),
            source: clamp(String(body.sourceFile || "").split("?")[0], 300),
            line: body.lineNumber ?? null,
            column: body.columnNumber ?? null,
            anticipatedRemoval: body.anticipatedRemoval
              ? clamp(String(body.anticipatedRemoval), 40)
              : null,
          });
        }
      }, { types: ["deprecation", "intervention"], buffered: true }).observe();
    }
  } catch {}

  const supportStates = new Set(["supported", "flag", "unsupported", "denied", "error"]);

  window.showcaseTelemetry = Object.assign(window.showcaseTelemetry || {}, {
    track,
    // Record the outcome of a demo's capability check for the exact API it demonstrates, e.g.
    // support("navigator.modelContext", "unsupported", "no global") or support(api, "denied").
    support(api, state, details = "") {
      const outcome = supportStates.has(state) ? state : "error";
      track("api.support", {
        severity: outcome === "error" ? "error" : "info",
        id: clamp(api, 120),
        state: outcome,
        details: clamp(typeof details === "string" ? details : JSON.stringify(details), 300),
      });
      return outcome;
    },
    assert(id, condition, details = {}) {
      const ok = Boolean(condition);
      track(ok ? "assert.pass" : "assert.fail", {
        severity: ok ? "info" : "error",
        id: clamp(id, 120),
        details: typeof details === "string" ? clamp(details, 1000) : details,
      });
      return ok;
    },
    flush() {
      schedule();
    },
  });
})();
