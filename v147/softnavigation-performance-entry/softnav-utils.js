const BASE_PATH = "/v147/softnavigation-performance-entry/";

export function getSoftNavigationCapabilities() {
  const observer = globalThis.PerformanceObserver;
  const supportedEntryTypes = typeof observer === "function" &&
      Array.isArray(observer.supportedEntryTypes)
    ? observer.supportedEntryTypes
    : [];
  const entryCtor = globalThis.SoftNavigationEntry ||
    globalThis.PerformanceSoftNavigation ||
    globalThis.PerformanceSoftNavigationTiming;
  const prototype = typeof entryCtor === "function" ? entryCtor.prototype : {};

  return {
    performanceObserver: typeof observer === "function",
    supportedEntryTypes,
    softNavigationType: supportedEntryTypes.includes("soft-navigation"),
    interactionContentfulPaintType: supportedEntryTypes.includes(
      "interaction-contentful-paint",
    ),
    softNavigationInterface: typeof entryCtor === "function",
    navigationType: "navigationType" in prototype,
    interactionId: "interactionId" in prototype,
    largestInteractionContentfulPaint: "largestInteractionContentfulPaint" in prototype,
    legacyLargestIcpMethod: "getLargestInteractionContentfulPaint" in prototype,
    interactionContentfulPaintInterface:
      typeof globalThis.InteractionContentfulPaint === "function",
    navigationId: typeof globalThis.PerformanceEntry === "function" &&
      "navigationId" in PerformanceEntry.prototype,
  };
}

export function buildDemoUrl(conceptSlug, route, sequence) {
  const url = new URL(location.href);
  url.pathname = BASE_PATH + conceptSlug + "/";
  url.searchParams.set("route", stripRoute(route));
  url.searchParams.set("candidate", String(sequence));
  return url.pathname + url.search;
}

export function stripRoute(route) {
  return String(route || "home").replace(/^\/+/, "");
}

export function routePath(route) {
  return "/" + stripRoute(route);
}

export function createInteractionContentfulPaintEntry(scenario) {
  const renderTime = scenario.startTime + scenario.duration;
  return {
    entryType: "interaction-contentful-paint",
    name: "",
    navigationId: scenario.navigationId,
    interactionId: scenario.interactionId,
    startTime: Number(scenario.startTime.toFixed(2)),
    duration: Number(scenario.duration.toFixed(2)),
    renderTime: Number(renderTime.toFixed(2)),
    loadTime: Number(renderTime.toFixed(2)),
    paintTime: Number(renderTime.toFixed(2)),
    presentationTime: Number(renderTime.toFixed(2)),
    size: scenario.paintSize,
    id: scenario.paintId,
    url: scenario.paintUrl || "",
    element: scenario.paintTarget,
  };
}

export function createSoftNavigationEntry(scenario) {
  const icp = createInteractionContentfulPaintEntry(scenario);
  return {
    entryType: "soft-navigation",
    name: new URL(scenario.urlAfter, location.origin).href,
    navigationType: scenario.navigationType,
    interactionId: scenario.interactionId,
    navigationId: scenario.navigationId,
    startTime: Number(scenario.startTime.toFixed(2)),
    duration: Number(scenario.duration.toFixed(2)),
    paintTime: Number((scenario.startTime + scenario.duration).toFixed(2)),
    presentationTime: Number((scenario.startTime + scenario.duration).toFixed(2)),
    largestInteractionContentfulPaint: icp,
  };
}

export function scenarioQualifies(scenario) {
  return Boolean(
    scenario.urlChanged && scenario.activeInteraction && scenario.contentfulPaint,
  );
}

export function scenarioOutcome(scenario) {
  if (scenarioQualifies(scenario)) {
    return "Entry emitted: URL changed inside an active interaction and a contentful paint followed.";
  }
  if (!scenario.urlChanged) {
    return "No entry: no same-document URL change occurred.";
  }
  if (!scenario.activeInteraction) {
    return "No entry: the URL change was not attributed to an active interaction.";
  }
  if (!scenario.contentfulPaint) {
    return "No entry: the URL changed, but no contentful paint was attributed.";
  }
  return "No entry: the soft-navigation heuristic did not fully match.";
}

export function supportSummary(capabilities = getSoftNavigationCapabilities()) {
  if (capabilities.softNavigationType) {
    return "soft-navigation supported - observing native entries and showing fallback scenarios";
  }
  return "soft-navigation not exposed in this browser - showing spec-shaped fallback entries";
}

export function serializeEntry(entry) {
  return JSON.stringify(entry, null, 2);
}

export function applyNavigation(type, url, state) {
  if (type === "replace") {
    history.replaceState(state, "", url);
    return true;
  }
  if (type === "traverse") {
    history.pushState({ ...state, traverseSeed: true }, "", url);
    history.back();
    return true;
  }
  history.pushState(state, "", url);
  return true;
}
