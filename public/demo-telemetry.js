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
    if (reason instanceof Error) {
      return { message: clamp(reason.message), stack: clamp(reason.stack, 1200) };
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
      list.getEntries().forEach((entry) =>
        track("perf.long-animation-frame", {
          severity: "warning",
          value: Math.round(entry.duration),
        })
      )
    ).observe({ type: "long-animation-frame", buffered: true });
  } catch {}

  window.showcaseTelemetry = Object.assign(window.showcaseTelemetry || {}, {
    track,
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
