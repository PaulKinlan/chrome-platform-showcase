// Shared server helper for the `cpu-performance-api` capability-echo endpoint
// across milestones (v151, v152).

import { appendVary } from "./http-helpers.ts";

const V151_CPU_PERFORMANCE_CLIENT_HINTS = [
  "Sec-CH-UA",
  "Sec-CH-UA-Mobile",
  "Sec-CH-UA-Platform",
  "Sec-CH-Device-Memory",
];

async function renderV151CapabilityEcho(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const started = performance.now();
  const delay = Math.min(Math.max(Number(url.searchParams.get("delay") ?? 0), 0), 1200);
  const scenario = url.searchParams.get("scenario") ?? "balanced";
  const tier = Number(url.searchParams.get("tier") ?? 2);
  const profile = tier >= 4 ? "full-fidelity" : tier >= 2 ? "balanced" : "conservative";
  const serverTiming = `app;dur=${Math.round(delay)}, profile;desc="${profile}"`;
  const clientHints = Object.fromEntries(
    V151_CPU_PERFORMANCE_CLIENT_HINTS.map((name) => [name, req.headers.get(name)]),
  );
  const receivedClientHintCount = Object.values(clientHints).filter(Boolean).length;
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "server-timing": serverTiming,
    "accept-ch": V151_CPU_PERFORMANCE_CLIENT_HINTS.join(", "),
    "critical-ch": V151_CPU_PERFORMANCE_CLIENT_HINTS.join(", "),
  });
  appendVary(headers, "X-App-Profile");
  for (const hint of V151_CPU_PERFORMANCE_CLIENT_HINTS) appendVary(headers, hint);

  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  const payload = {
    scenario,
    requestedTier: tier,
    selectedProfile: profile,
    serverTiming,
    negotiation: {
      sentCriticalCH: headers.has("critical-ch"),
      acceptCH: headers.get("accept-ch"),
      criticalCH: headers.get("critical-ch"),
      vary: headers.get("vary"),
      expectedClientHints: V151_CPU_PERFORMANCE_CLIENT_HINTS,
      receivedClientHints: clientHints,
      receivedClientHintCount,
      note: receivedClientHintCount
        ? "The browser sent at least one Sec-CH-* request header to the adaptive route."
        : "No Sec-CH-* request headers were received yet. This can happen before opt-in, in unsupported browsers, or when a client declines a hint.",
    },
    request: {
      method: req.method,
      userAgent: req.headers.get("user-agent") ?? "",
      secFetchMode: req.headers.get("sec-fetch-mode") ?? "",
      secFetchSite: req.headers.get("sec-fetch-site") ?? "",
      accept: req.headers.get("accept") ?? "",
      appProfile: req.headers.get("x-app-profile") ?? "",
      clientHints,
    },
    elapsedMs: Math.round(performance.now() - started),
  };
  return new Response(JSON.stringify(payload, null, 2), { headers });
}

export async function handleCapabilityEchoRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  if (sub !== "/cpu-performance-api/capability-echo") return null;
  return await renderV151CapabilityEcho(req);
}
