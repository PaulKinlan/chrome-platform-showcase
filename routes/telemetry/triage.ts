import { objectValue, parsePageParts, stringValue } from "./store.ts";
import type {
  DemoTelemetryEvent,
  DeprecationSummary,
  FlatEvent,
  JsonRecord,
  SupportSummary,
  TriageGroup,
} from "./types.ts";

// Chrome major version: the client's UA-CH snapshot (batch `env.chrome`) first, else the stored UA.
function chromeMajorOf(env: JsonRecord, userAgent: string): number | null {
  if (typeof env.chrome === "number" && Number.isFinite(env.chrome)) return Math.trunc(env.chrome);
  const match = userAgent.match(/Chrom(?:e|ium)\/(\d+)/);
  return match ? Number(match[1]) : null;
}

// A stable, human-readable label for grouping like errors across many visitors.
export function eventSignature(kind: string, payload: JsonRecord): string {
  const candidate = stringValue(payload.message, 300) ??
    stringValue(payload.reason, 300) ??
    stringValue(payload.id, 300) ??
    stringValue(payload.detail, 300) ??
    stringValue(payload.text, 300) ??
    stringValue(payload.url, 300) ??
    "";
  // Collapse volatile bits (numbers, hex ids, urls' query) so the same error clusters together.
  const normalized = candidate
    .replace(/https?:\/\/[^\s)]+/g, (u) => u.split("?")[0])
    .replace(/0x[0-9a-f]+/gi, "0x…")
    .replace(/\b\d[\d.,:]*\b/g, "#")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? `${kind}: ${normalized}`.slice(0, 200) : kind;
}

// Client telemetry arrives batched: a stored `demo.batch` event carries the real console/runtime/
// assert events in `payload.events[]`. Flatten so triage sees the individual signals, not the wrapper.
export function flattenEvents(stored: DemoTelemetryEvent[]): FlatEvent[] {
  const flat: FlatEvent[] = [];
  const push = (
    kind: string,
    severity: string | null,
    page: string,
    receivedAt: string,
    payload: JsonRecord,
    chrome: number | null,
  ) => {
    const parts = parsePageParts(page);
    flat.push({
      chrome,
      payload,
      receivedAt,
      kind,
      severity,
      page,
      release: parts.release,
      featureSlug: parts.featureSlug,
      conceptSlug: parts.conceptSlug,
      signature: eventSignature(kind, payload),
    });
  };
  for (const event of stored) {
    const chrome = chromeMajorOf(objectValue(event.payload.env), event.userAgent ?? "");
    if (event.kind === "demo.batch" && Array.isArray(event.payload.events)) {
      for (const raw of event.payload.events as unknown[]) {
        const inner = objectValue(raw);
        const kind = stringValue(inner.kind, 80) ?? "demo.telemetry";
        const page = stringValue(inner.page, 1000) || event.page;
        push(kind, stringValue(inner.severity, 40), page, event.receivedAt, inner, chrome);
      }
    } else {
      push(event.kind, event.severity, event.page, event.receivedAt, event.payload, chrome);
    }
  }
  return flat;
}

function isFailure(event: FlatEvent): boolean {
  return event.severity === "error" ||
    event.kind.includes("error") ||
    event.kind === "assert.fail" ||
    event.kind === "runtime.unhandledrejection" ||
    event.kind === "resource.error";
}

function demoKeyOf(f: FlatEvent): string {
  return f.release
    ? [f.release, f.featureSlug ?? "", f.conceptSlug ?? ""].join("/")
    : f.page || "(unknown)";
}

function bump(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

export function buildTriage(stored: DemoTelemetryEvent[]): {
  scanned: number;
  failures: number;
  demos: TriageGroup[];
  signatures: { signature: string; count: number; demos: string[] }[];
  support: SupportSummary[];
  deprecations: DeprecationSummary[];
} {
  const flat = flattenEvents(stored);
  const failures = flat.filter(isFailure);
  const byDemo = new Map<string, {
    group: TriageGroup;
    sigs: Map<string, number>;
  }>();
  const bySignature = new Map<string, { count: number; demos: Set<string> }>();

  for (const f of failures) {
    const demoKey = demoKeyOf(f);
    let entry = byDemo.get(demoKey);
    if (!entry) {
      entry = {
        group: {
          key: demoKey,
          release: f.release,
          featureSlug: f.featureSlug,
          conceptSlug: f.conceptSlug,
          failures: 0,
          kinds: {},
          chrome: {},
          topSignatures: [],
        },
        sigs: new Map(),
      };
      byDemo.set(demoKey, entry);
    }
    entry.group.failures++;
    entry.group.kinds[f.kind] = (entry.group.kinds[f.kind] ?? 0) + 1;
    bump(entry.group.chrome, f.chrome === null ? "unknown" : String(f.chrome));
    entry.sigs.set(f.signature, (entry.sigs.get(f.signature) ?? 0) + 1);

    const sig = bySignature.get(f.signature) ?? { count: 0, demos: new Set<string>() };
    sig.count++;
    sig.demos.add(demoKey);
    bySignature.set(f.signature, sig);
  }

  const demos = [...byDemo.values()]
    .map(({ group, sigs }) => {
      group.topSignatures = [...sigs.entries()]
        .map(([signature, count]) => ({ signature, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      return group;
    })
    .sort((a, b) => b.failures - a.failures);

  const signatures = [...bySignature.entries()]
    .map(([signature, v]) => ({ signature, count: v.count, demos: [...v.demos].slice(0, 10) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const supportByApi = new Map<string, { summary: SupportSummary; demos: Set<string> }>();
  const deprecationByKey = new Map<string, { summary: DeprecationSummary; demos: Set<string> }>();
  for (const f of flat) {
    if (f.kind === "api.support") {
      const api = stringValue(f.payload.id, 120) ?? "(unnamed)";
      const state = stringValue(f.payload.state, 20) ?? "error";
      const chromeKey = f.chrome === null ? "unknown" : String(f.chrome);
      let entry = supportByApi.get(api);
      if (!entry) {
        entry = { summary: { api, demos: [], states: {}, byChrome: {} }, demos: new Set() };
        supportByApi.set(api, entry);
      }
      bump(entry.summary.states, state);
      bump(entry.summary.byChrome[chromeKey] ??= {}, state);
      entry.demos.add(demoKeyOf(f));
    } else if (f.kind === "report.deprecation" || f.kind === "report.intervention") {
      const type = f.kind.slice("report.".length);
      const id = stringValue(f.payload.id, 120) ?? "";
      const message = stringValue(f.payload.message, 300) ?? "";
      const key = `${type}:${id || message}`;
      let entry = deprecationByKey.get(key);
      if (!entry) {
        entry = { summary: { type, id, message, count: 0, demos: [] }, demos: new Set() };
        deprecationByKey.set(key, entry);
      }
      entry.summary.count++;
      entry.demos.add(demoKeyOf(f));
    }
  }
  const support = [...supportByApi.values()]
    .map(({ summary, demos }) => ({ ...summary, demos: [...demos].slice(0, 10) }))
    .sort((a, b) =>
      Object.values(b.states).reduce((n, v) => n + v, 0) -
      Object.values(a.states).reduce((n, v) => n + v, 0)
    )
    .slice(0, 100);
  const deprecations = [...deprecationByKey.values()]
    .map(({ summary, demos }) => ({ ...summary, demos: [...demos].slice(0, 10) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  return {
    scanned: flat.length,
    failures: failures.length,
    demos,
    signatures,
    support,
    deprecations,
  };
}
