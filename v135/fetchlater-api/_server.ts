// Co-located server handler for v135/fetchlater-api.

import { readBoundedText } from "../../lib/request-body.ts";
import {
  DEMO_BODY_LIMIT,
  jsonResponse,
  randomBase64Url,
} from "../../lib/feature-servers/http-helpers.ts";

interface FetchLaterEvent {
  id: string;
  receivedAt: string;
  method: string;
  path: string;
  body: unknown;
  bodyBytes: number;
  userAgent: string;
}

const fetchLaterEvents: FetchLaterEvent[] = [];

export async function handleFeatureRequest(req: Request, sub: string): Promise<Response | null> {
  if (!sub.startsWith("/fetchlater-api/")) return null;
  const route = sub.slice("/fetchlater-api".length);

  if ((route === "/log" || route === "/echo") && req.method === "POST") {
    const boundedText = await readBoundedText(req, DEMO_BODY_LIMIT);
    if (!boundedText.ok) return boundedText.response;
    const text = boundedText.text;
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    const event: FetchLaterEvent = {
      id: randomBase64Url(9),
      receivedAt: new Date().toISOString(),
      method: req.method,
      path: new URL(req.url).pathname,
      body,
      bodyBytes: new TextEncoder().encode(text).byteLength,
      userAgent: req.headers.get("user-agent") ?? "",
    };
    fetchLaterEvents.unshift(event);
    fetchLaterEvents.splice(50);
    return jsonResponse({
      accepted: true,
      event,
      recent: fetchLaterEvents.slice(0, 10),
    });
  }

  if (route === "/events") {
    return jsonResponse({ events: fetchLaterEvents.slice(0, 25) });
  }

  if (route === "/reset" && req.method === "POST") {
    fetchLaterEvents.splice(0);
    return jsonResponse({ reset: true, events: [] });
  }

  return null;
}
