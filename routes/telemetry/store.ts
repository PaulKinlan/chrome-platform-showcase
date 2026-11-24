import { platform } from "../../lib/platform.ts";
import {
  allowedKinds,
  allowedSeverities,
  type DemoTelemetryEvent,
  type JsonRecord,
  type MinimalKv,
  TELEMETRY_TTL_MS,
} from "./types.ts";

const recentDemoTelemetry: DemoTelemetryEvent[] = [];
let kvPromise: Promise<MinimalKv | null> | null = null;

export function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

export function stringValue(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  return value.slice(0, max);
}

export function parsePageParts(page: string): {
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

function getDemoKv(): Promise<MinimalKv | null> {
  if (kvPromise) return kvPromise;
  kvPromise = (async () => {
    // Deno KV under Deno; the Cloudflare KV adapter under Workers; null when
    // neither is configured (telemetry is then accepted but not stored).
    try {
      return (await platform().openKv()) as unknown as MinimalKv | null;
    } catch {
      return null;
    }
  })();
  return kvPromise;
}

export function sanitizePayload(payload: JsonRecord): JsonRecord {
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

export function validPagePath(page: string): boolean {
  return /^\/v\d+\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)?\/?$/.test(page) ||
    page === "/" || page === "";
}

export function normalizeTelemetryPayload(payload: JsonRecord): JsonRecord | null {
  const kind = stringValue(payload.kind, 80) ?? "demo.telemetry";
  if (!allowedKinds.has(kind)) return null;
  const severity = stringValue(payload.severity, 40);
  if (severity && !allowedSeverities.has(severity)) return null;
  const page = stringValue(payload.page, 1000) ?? "";
  if (!validPagePath(page)) return null;

  if (kind === "demo.batch") {
    const events = Array.isArray(payload.events) ? payload.events.slice(0, 80) : [];
    const validEvents = events
      .map((event) => normalizeTelemetryPayload(objectValue(event)))
      .filter((event): event is JsonRecord => Boolean(event));
    return sanitizePayload({
      ...payload,
      kind,
      severity: severity ?? "info",
      page,
      events: validEvents,
    });
  }

  return sanitizePayload({ ...payload, kind, severity: severity ?? "info", page });
}

export function normalizeBrowserReportPayload(payload: unknown): JsonRecord {
  const reports = Array.isArray(payload) ? payload : [payload];
  return sanitizePayload({
    kind: "browser.report",
    severity: "warning",
    page: "",
    reports: reports.slice(0, 20).map((report) => objectValue(report)),
  });
}

export async function storeTelemetryEvent(event: DemoTelemetryEvent): Promise<void> {
  recentDemoTelemetry.unshift(event);
  recentDemoTelemetry.splice(100);

  const kv = await getDemoKv();
  if (!kv) return;
  const day = event.receivedAt.slice(0, 10);
  await kv.set(["demo-telemetry", day, event.receivedAt, event.id], event, {
    expireIn: TELEMETRY_TTL_MS,
  });
}

export function clearRecentTelemetry(): void {
  recentDemoTelemetry.splice(0);
}

export async function readRecentEvents(
  limit: number,
): Promise<{ storage: "kv" | "memory"; events: DemoTelemetryEvent[] }> {
  const kv = await getDemoKv();
  if (!kv) return { storage: "memory", events: recentDemoTelemetry.slice(0, limit) };
  const events: DemoTelemetryEvent[] = [];
  for await (
    const entry of kv.list<DemoTelemetryEvent>({ prefix: ["demo-telemetry"], reverse: true, limit })
  ) {
    events.push(entry.value);
  }
  return { storage: "kv", events };
}

export function summarize(events: DemoTelemetryEvent[]): {
  total: number;
  errors: number;
  assertions: number;
  pages: number;
} {
  const pages = new Set(events.map((event) => event.page));
  return {
    total: events.length,
    errors: events.filter((event) => event.severity === "error" || event.kind.includes("error"))
      .length,
    assertions: events.filter((event) => event.kind.startsWith("assert.")).length,
    pages: pages.size,
  };
}
