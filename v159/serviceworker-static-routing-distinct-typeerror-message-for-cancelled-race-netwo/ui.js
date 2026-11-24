// Small page-side helpers shared by the concept pages (rendering only — every
// value shown comes from harness.js, i.e. from a real raced request).
import { GENERIC_MESSAGE, RACE_CANCELLED_MESSAGE, ready } from "./harness.js";

export const FEATURE_NAME = "ServiceWorkerRaceNetworkRequestAbortedErrorMessage";

export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const ENABLE_STEPS =
  `Chrome 160+ and Canary: on by default. Chrome 159: gated by the Finch feature <code>${FEATURE_NAME}</code> ` +
  `(default-off in the 159 build, so it depends on a server-side field-trial rollout — Chrome for Testing 159.0.8154.13, which has no field trials, still returned <code>"${GENERIC_MESSAGE}"</code>). ` +
  `To force it on 159, relaunch Chrome with <code>--enable-features=${FEATURE_NAME}</code>. There is no chrome://flags entry ` +
  `and it is not a Blink runtime feature, so <code>--enable-experimental-web-platform-features</code> does not toggle it. ` +
  `Older Chrome always reports <code>"${GENERIC_MESSAGE}"</code>. Firefox and Safari have no signal on this change, and TypeError messages are implementation-defined, so WPT asserts only the error type.`;

// Renders the service-worker readiness note; resolves with ready()'s state or null.
export async function showStatus(note) {
  note.className = "note";
  note.textContent = "Registering this feature's service worker and its static routes…";
  try {
    const state = await ready();
    if (!state.ok) {
      note.className = "note warn";
      note.innerHTML = `<strong>Static routing is not usable here.</strong> ${esc(state.reason)} ` +
        `Every button below still runs, but requests are not raced, so no race cancellation can happen — ` +
        `results will say so rather than pretend. ${ENABLE_STEPS}`;
      return state;
    }
    const routes = state.report.routes.map((r) =>
      `<code>${esc(r.pathname)}</code> → <code>${esc(r.source)}</code> ${
        r.ok ? "accepted" : "rejected: " + esc(r.error)
      }`
    ).join("; ");
    note.className = "note good";
    note.innerHTML =
      `<strong>Service worker active</strong> (requests issued from ${esc(state.context.via)}). ` +
      `<code>InstallEvent.addRoutes()</code> accepted: ${routes}. <br>${ENABLE_STEPS}`;
    return state;
  } catch (error) {
    note.className = "note warn";
    note.innerHTML = `<strong>Could not start the service worker:</strong> ${
      esc(error.message)
    }. ${ENABLE_STEPS}`;
    return null;
  }
}

export function verdictFor(fetchOutcome) {
  if (!fetchOutcome) return { cls: "", text: "no report" };
  if (fetchOutcome.settled === "fulfilled") {
    return { cls: "fulfilled", text: `fulfilled · HTTP ${fetchOutcome.status}` };
  }
  if (fetchOutcome.classification === "race-cancelled") {
    return { cls: "race-cancelled", text: "race cancelled (distinct message)" };
  }
  if (fetchOutcome.classification === "network-error") {
    return { cls: "network-error", text: `TypeError · "${fetchOutcome.message}"` };
  }
  return { cls: "", text: `${fetchOutcome.name}: ${fetchOutcome.message}` };
}

export function engineReading(fetchOutcome) {
  if (!fetchOutcome || fetchOutcome.settled !== "rejected") return null;
  if (fetchOutcome.message === RACE_CANCELLED_MESSAGE) {
    return "This browser emits the distinct race-cancellation message (Chrome 159+ behaviour with the feature on).";
  }
  if (fetchOutcome.message === GENERIC_MESSAGE) {
    return `This browser reports the cancellation as the generic "${GENERIC_MESSAGE}" — Chrome before 159, or 159 with ${FEATURE_NAME} not yet enabled.`;
  }
  return `This browser used another message: "${fetchOutcome.message}".`;
}
