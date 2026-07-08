type JsonRecord = Record<string, unknown>;

interface DemoTelemetryEvent {
  id: string;
  receivedAt: string;
  kind: string;
  page: string;
  release: string | null;
  featureSlug: string | null;
  conceptSlug: string | null;
  severity: string | null;
  userAgent: string;
  bodyBytes: number;
  payload: JsonRecord;
}

interface MinimalKv {
  set(key: unknown[], value: unknown): Promise<unknown>;
  list<T = unknown>(
    options: { prefix: unknown[]; reverse?: boolean; limit?: number },
  ): AsyncIterable<{
    key: unknown[];
    value: T;
  }>;
}

const recentDemoTelemetry: DemoTelemetryEvent[] = [];
let kvPromise: Promise<MinimalKv | null> | null = null;

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(value, null, 2), { ...init, headers });
}

function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  return value.slice(0, max);
}

function randomId(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getDemoKv(): Promise<MinimalKv | null> {
  if (kvPromise) return kvPromise;
  kvPromise = (async () => {
    const maybeDeno = Deno as unknown as { openKv?: () => Promise<MinimalKv> };
    if (typeof maybeDeno.openKv !== "function") return null;
    try {
      return await maybeDeno.openKv();
    } catch {
      return null;
    }
  })();
  return kvPromise;
}

function parsePageParts(page: string): {
  release: string | null;
  featureSlug: string | null;
  conceptSlug: string | null;
} {
  const parts = page.split("/").filter(Boolean);
  if (!/^v\d+$/.test(parts[0] ?? "")) {
    return { release: null, featureSlug: null, conceptSlug: null };
  }
  return {
    release: parts[0] ?? null,
    featureSlug: parts[1] ?? null,
    conceptSlug: parts[2] && !parts[2].includes(".") ? parts[2] : null,
  };
}

function sanitizePayload(payload: JsonRecord): JsonRecord {
  const sanitized: JsonRecord = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") sanitized[key] = value.slice(0, 2000);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.slice(0, 100).map((item) => objectValue(item));
    } else if (value && typeof value === "object") {
      sanitized[key] = objectValue(value);
    }
  }
  return sanitized;
}

async function storeTelemetryEvent(event: DemoTelemetryEvent): Promise<void> {
  recentDemoTelemetry.unshift(event);
  recentDemoTelemetry.splice(100);

  const kv = await getDemoKv();
  if (!kv) return;
  const day = event.receivedAt.slice(0, 10);
  await kv.set(["demo-telemetry", day, event.receivedAt, event.id], event);
}

async function readRecentFromKv(limit: number): Promise<DemoTelemetryEvent[] | null> {
  const kv = await getDemoKv();
  if (!kv) return null;
  const events: DemoTelemetryEvent[] = [];
  for await (
    const entry of kv.list<DemoTelemetryEvent>({ prefix: ["demo-telemetry"], reverse: true, limit })
  ) {
    events.push(entry.value);
  }
  return events;
}

export async function handleDemoTelemetryRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/telemetry/demo")) return null;

  if (url.pathname === "/telemetry/demo/events" && req.method === "GET") {
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const kvEvents = await readRecentFromKv(limit);
    return jsonResponse({
      storage: kvEvents ? "kv" : "memory",
      events: kvEvents ?? recentDemoTelemetry.slice(0, limit),
    });
  }

  if (url.pathname === "/telemetry/demo/reset" && req.method === "POST") {
    recentDemoTelemetry.splice(0);
    return jsonResponse({
      reset: true,
      note: "In-memory telemetry cleared. KV history is retained.",
    });
  }

  if (url.pathname !== "/telemetry/demo") return null;

  if (req.method === "GET") {
    return jsonResponse({
      endpoint: "/telemetry/demo",
      post: "POST a JSON telemetry payload from /public/demo-telemetry.js.",
      recent: recentDemoTelemetry.slice(0, 25),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST a JSON demo telemetry payload to this endpoint." }, {
      status: 405,
      headers: { allow: "GET, POST" },
    });
  }

  const text = await req.text();
  const bodyBytes = new TextEncoder().encode(text).byteLength;
  if (bodyBytes > 128 * 1024) {
    return jsonResponse({ error: "Telemetry payload too large." }, { status: 413 });
  }

  let payload: JsonRecord = {};
  try {
    payload = sanitizePayload(objectValue(JSON.parse(text || "{}")));
  } catch {
    payload = {};
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
