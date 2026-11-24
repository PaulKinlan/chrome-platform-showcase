import {
  jsonResponse,
  randomBase64Url,
  TELEMETRY_BODY_LIMIT,
} from "../lib/feature-servers/http-helpers.ts";
import { readBoundedText } from "../lib/request-body.ts";
import { forbiddenResponse, sameOriginRequest } from "../lib/request-guards.ts";

interface ProfileTelemetryEvent {
  id: string;
  receivedAt: string;
  contentType: string;
  bodyBytes: number;
  totalSamples: number | null;
  hotFunctionCount: number | null;
  topFunction: string | null;
  userAgent: string;
}

const profileTelemetryEvents: ProfileTelemetryEvent[] = [];

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export async function renderProfileTelemetryRoute(
  req: Request,
  path: string,
): Promise<Response | null> {
  if (!path.startsWith("/telemetry/profile")) return null;

  if (path === "/telemetry/profile/events" && req.method === "GET") {
    return jsonResponse({ events: profileTelemetryEvents.slice(0, 25) });
  }

  if (path === "/telemetry/profile/reset" && req.method === "POST") {
    if (!sameOriginRequest(req, new URL(req.url))) {
      return forbiddenResponse("Cross-site telemetry resets are not accepted.");
    }
    profileTelemetryEvents.splice(0);
    return jsonResponse({ reset: true, events: [] });
  }

  if (path !== "/telemetry/profile") return null;

  if (req.method === "GET") {
    return jsonResponse({ events: profileTelemetryEvents.slice(0, 25) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST a JSON profiling payload to this endpoint." }, {
      status: 405,
      headers: { allow: "GET, POST" },
    });
  }

  const boundedProfile = await readBoundedText(
    req,
    TELEMETRY_BODY_LIMIT,
    "Profiling payload too large.",
  );
  if (!boundedProfile.ok) return boundedProfile.response;
  const text = boundedProfile.text;
  const bodyBytes = new TextEncoder().encode(text).byteLength;
  let payload: Record<string, unknown> = {};
  try {
    const parsed = text ? JSON.parse(text) : {};
    payload = objectValue(parsed);
  } catch {
    payload = {};
  }
  const hot = Array.isArray(payload.hot) ? payload.hot : [];
  const top = objectValue(hot[0]);
  const event: ProfileTelemetryEvent = {
    id: randomBase64Url(9),
    receivedAt: new Date().toISOString(),
    contentType: req.headers.get("content-type") ?? "",
    bodyBytes,
    totalSamples: typeof payload.totalSamples === "number" ? payload.totalSamples : null,
    hotFunctionCount: hot.length || null,
    topFunction: stringValue(top.name) || null,
    userAgent: req.headers.get("user-agent") ?? "",
  };
  profileTelemetryEvents.unshift(event);
  profileTelemetryEvents.splice(50);

  return jsonResponse({ accepted: true, event, recent: profileTelemetryEvents.slice(0, 5) }, {
    status: 202,
  });
}

export async function handleProfileTelemetryRoute(req: Request): Promise<Response | null> {
  return await renderProfileTelemetryRoute(req, new URL(req.url).pathname);
}
