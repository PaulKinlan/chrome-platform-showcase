import { sourceKeyFrom, telemetryAuthThrottle } from "../../lib/auth-throttle.ts";
import { platform } from "../../lib/platform.ts";
import { readBoundedText } from "../../lib/request-body.ts";
import { forbiddenResponse, sameOriginRequest } from "../../lib/request-guards.ts";
import { htmlResponse, renderAdminDashboard } from "./admin-ui.ts";
import {
  clearRecentTelemetry,
  normalizeBrowserReportPayload,
  normalizeTelemetryPayload,
  objectValue,
  parsePageParts,
  readRecentEvents,
  storeTelemetryEvent,
  stringValue,
} from "./store.ts";
import { buildTriage } from "./triage.ts";
import { type DemoTelemetryEvent, type JsonRecord, TELEMETRY_BODY_LIMIT } from "./types.ts";

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(value, null, 2), { ...init, headers });
}

function randomId(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function configuredPassword(): string | null {
  return platform().env("showcase_password") || platform().env("SHOWCASE_PASSWORD") || null;
}

function unauthorizedResponse(): Response {
  return jsonResponse({
    error: "Telemetry events require the showcase_password environment variable.",
  }, {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="chrome-platform-showcase telemetry", charset="UTF-8"',
    },
  });
}

function throttledResponse(retryAfterSeconds: number): Response {
  // Deliberately says nothing about whether a password is configured, and sends no
  // www-authenticate: this is a wait, not an invitation to retry immediately.
  return jsonResponse({
    error: "Too many failed authentication attempts from this source. Try again later.",
  }, { status: 429, headers: { "retry-after": String(retryAfterSeconds) } });
}

function isAuthorized(req: Request): boolean {
  const password = configuredPassword();
  if (!password) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("basic ")) return false;
  try {
    const decoded = atob(auth.slice(6).trim());
    const separator = decoded.indexOf(":");
    const supplied = separator === -1 ? decoded : decoded.slice(separator + 1);
    return supplied === password;
  } catch {
    return false;
  }
}

/**
 * Gate a protected telemetry request.
 *
 * Order matters. The throttle is consulted BEFORE the credential comparison, so an
 * over-budget source costs nothing to refuse, and the comparison is exactly what an
 * attacker is trying to spend. A successful authentication clears the source's
 * record, so a valid credential is not refused BECAUSE of earlier failures once an
 * attempt is available; an over-budget source waits at most one refill interval
 * rather than being banned. While a competing flood from the same address consumes
 * each refilled attempt, even a valid credential is refused — that limit is stated in
 * lib/auth-throttle.ts and asserted in the suite.
 *
 * Returns a response to send, or null to continue.
 */
function checkAccess(req: Request, remoteAddr?: string | null): Response | null {
  const key = sourceKeyFrom(remoteAddr);
  const decision = telemetryAuthThrottle.check(key);
  if (!decision.allowed) return throttledResponse(decision.retryAfterSeconds);
  if (isAuthorized(req)) {
    telemetryAuthThrottle.recordSuccess(key);
    return null;
  }
  telemetryAuthThrottle.recordFailure(key);
  return unauthorizedResponse();
}

function sameOriginTelemetry(req: Request, url: URL): boolean {
  return sameOriginRequest(req, url);
}

export async function handleDemoTelemetryRoute(
  req: Request,
  context?: { remoteAddr?: string | null },
): Promise<Response | null> {
  const remoteAddr = context?.remoteAddr ?? null;
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/telemetry/demo")) return null;

  if (url.pathname === "/telemetry/demo/events" && req.method === "GET") {
    const denied = checkAccess(req, remoteAddr);
    if (denied) return denied;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 1000);
    return jsonResponse(await readRecentEvents(limit));
  }

  if (url.pathname === "/telemetry/demo/admin" && req.method === "GET") {
    const denied = checkAccess(req, remoteAddr);
    if (denied) return denied;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 1000);
    const { storage, events } = await readRecentEvents(limit);
    return htmlResponse(renderAdminDashboard(events, storage, limit));
  }

  if (url.pathname === "/telemetry/demo/triage" && req.method === "GET") {
    const denied = checkAccess(req, remoteAddr);
    if (denied) return denied;
    const scan = Math.min(Number(url.searchParams.get("scan") ?? 2000), 5000);
    const { storage, events } = await readRecentEvents(scan);
    const triage = buildTriage(events);
    return jsonResponse({ storage, window: events.length, ...triage });
  }

  if (url.pathname === "/telemetry/demo/reset" && req.method === "POST") {
    const denied = checkAccess(req, remoteAddr);
    if (denied) return denied;
    clearRecentTelemetry();
    return jsonResponse({
      reset: true,
      note: "In-memory telemetry cleared. KV history is retained.",
    });
  }

  if (url.pathname === "/telemetry/demo/report" && req.method === "POST") {
    if (!sameOriginTelemetry(req, url)) {
      return forbiddenResponse("Cross-site reports are not accepted.");
    }
    const body = await readBoundedText(
      req,
      TELEMETRY_BODY_LIMIT,
      "Report payload too large.",
    );
    if (!body.ok) return body.response;
    const text = body.text;
    const bodyBytes = new TextEncoder().encode(text).byteLength;
    let payload: JsonRecord = { kind: "browser.report", severity: "warning", page: "" };
    try {
      payload = normalizeBrowserReportPayload(JSON.parse(text || "[]"));
    } catch {
      payload = normalizeBrowserReportPayload({ type: "unparseable-report" });
    }
    const event: DemoTelemetryEvent = {
      id: randomId(),
      receivedAt: new Date().toISOString(),
      kind: "browser.report",
      page: "",
      release: null,
      featureSlug: null,
      conceptSlug: null,
      severity: "warning",
      userAgent: req.headers.get("user-agent") ?? "",
      bodyBytes,
      payload,
    };
    await storeTelemetryEvent(event);
    return jsonResponse({ accepted: true }, { status: 202 });
  }

  if (url.pathname !== "/telemetry/demo") return null;

  if (req.method === "GET") {
    return jsonResponse({
      endpoint: "/telemetry/demo",
      post: "POST a JSON telemetry payload from /public/demo-telemetry.js.",
      admin: "/telemetry/demo/admin",
      events: "GET /telemetry/demo/events with HTTP Basic auth using showcase_password.",
      triage:
        "GET /telemetry/demo/triage (Basic auth) — flattens batched events, ranks failing demos and error-signature clusters. ?scan=<n> sets the window (default 2000, max 5000).",
      passwordConfigured: Boolean(configuredPassword()),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST a JSON demo telemetry payload to this endpoint." }, {
      status: 405,
      headers: { allow: "GET, POST" },
    });
  }

  if (!sameOriginTelemetry(req, url)) {
    return forbiddenResponse("Cross-site telemetry is not accepted.");
  }
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
    return jsonResponse({ error: "Telemetry must be JSON." }, { status: 415 });
  }

  const body = await readBoundedText(req, TELEMETRY_BODY_LIMIT, "Telemetry payload too large.");
  if (!body.ok) return body.response;
  const text = body.text;
  const bodyBytes = new TextEncoder().encode(text).byteLength;

  let payload: JsonRecord | null = null;
  try {
    payload = normalizeTelemetryPayload(objectValue(JSON.parse(text || "{}")));
  } catch {
    payload = null;
  }
  if (!payload) {
    return jsonResponse({ error: "Telemetry payload did not match the accepted schema." }, {
      status: 400,
    });
  }

  const page = stringValue(payload.page, 1000) ?? url.searchParams.get("page") ?? "";
  const parts = parsePageParts(page);
  const event: DemoTelemetryEvent = {
    id: randomId(),
    receivedAt: new Date().toISOString(),
    kind: stringValue(payload.kind, 80) ?? "demo.telemetry",
    page,
    ...parts,
    severity: stringValue(payload.severity, 40),
    userAgent: req.headers.get("user-agent") ?? "",
    bodyBytes,
    payload,
  };

  await storeTelemetryEvent(event);
  return jsonResponse({ accepted: true, event }, { status: 202 });
}
