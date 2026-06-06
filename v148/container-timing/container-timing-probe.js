(function () {
  function supportState() {
    const hasPerformanceObserver = "PerformanceObserver" in window;
    const hasConstructor = typeof window.PerformanceContainerTiming !== "undefined";
    const supportedEntryTypes = hasPerformanceObserver &&
        Array.isArray(PerformanceObserver.supportedEntryTypes)
      ? PerformanceObserver.supportedEntryTypes
      : [];
    const entryTypeListed = supportedEntryTypes.includes("container");

    return {
      entryTypeListed,
      hasConstructor,
      hasPerformanceObserver,
      mode: hasConstructor ? "native" : hasPerformanceObserver ? "fallback" : "unsupported",
      message: hasConstructor
        ? 'Native PerformanceContainerTiming detected. Observing PerformanceObserver type "container".'
        : hasPerformanceObserver
        ? "Container Timing is not enabled in this browser. The demo uses simulated PerformanceContainerTiming-shaped entries."
        : "PerformanceObserver is unavailable. The demo uses a static fallback simulation.",
    };
  }

  function makeEntry(identifier, renderTime, options = {}) {
    const firstRenderTime = options.firstRenderTime ?? Math.max(0, renderTime - 12);
    const width = options.width ?? 320;
    const height = options.height ?? 160;
    const size = options.size ?? Math.round(width * height);
    return {
      duration: 0,
      entryType: "container",
      firstRenderTime,
      identifier,
      lastPaintedElement: options.lastPaintedElement ?? null,
      renderTime,
      rootElement: options.rootElement ?? null,
      size,
      source: options.source ?? "simulated",
      startTime: renderTime,
    };
  }

  function entryTime(entry) {
    return entry.renderTime ?? entry.startTime ?? entry.firstRenderTime ?? 0;
  }

  function observeNative(callback) {
    const state = supportState();
    if (!state.hasConstructor) {
      return { active: false, state };
    }
    try {
      const observer = new PerformanceObserver((list) => {
        callback(
          list.getEntries().map((entry) => ({
            duration: entry.duration,
            entryType: entry.entryType,
            firstRenderTime: entry.firstRenderTime,
            identifier: entry.identifier,
            lastPaintedElement: entry.lastPaintedElement,
            renderTime: entry.renderTime ?? entry.startTime,
            rootElement: entry.rootElement,
            size: entry.size,
            source: "native",
            startTime: entry.startTime,
          })),
        );
      });
      observer.observe({ type: "container", buffered: true });
      return { active: true, observer, state };
    } catch (error) {
      return {
        active: false,
        error,
        state: {
          ...state,
          message:
            `Native observer setup failed: ${error.message}. The demo uses simulated entries.`,
          mode: "fallback",
        },
      };
    }
  }

  window.ContainerTimingProbe = {
    entryTime,
    makeEntry,
    observeNative,
    supportState,
  };
})();
