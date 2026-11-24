export type JsonRecord = Record<string, unknown>;

export const TELEMETRY_BODY_LIMIT = 128 * 1024;

// KV events self-expire so the store does not grow unbounded (there is no reader that would
// otherwise prune it). 90 days is plenty for weekly triage while keeping a month-plus of trend.
export const TELEMETRY_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export interface DemoTelemetryEvent {
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

export interface MinimalKv {
  set(key: unknown[], value: unknown, options?: { expireIn?: number }): Promise<unknown>;
  list<T = unknown>(
    options: { prefix: unknown[]; reverse?: boolean; limit?: number },
  ): AsyncIterable<{
    key: unknown[];
    value: T;
  }>;
}

export interface FlatEvent {
  receivedAt: string;
  kind: string;
  severity: string | null;
  page: string;
  release: string | null;
  featureSlug: string | null;
  conceptSlug: string | null;
  signature: string;
  chrome: number | null;
  payload: JsonRecord;
}

export interface TriageGroup {
  key: string;
  release: string | null;
  featureSlug: string | null;
  conceptSlug: string | null;
  failures: number;
  kinds: Record<string, number>;
  // Failures per Chrome major version, so "only fails before Chrome N" is visible at a glance.
  chrome: Record<string, number>;
  topSignatures: { signature: string; count: number }[];
}

export interface SupportSummary {
  api: string;
  demos: string[];
  states: Record<string, number>;
  // state counts per Chrome major: { "142": { unsupported: 3 }, "144": { supported: 9 } }
  byChrome: Record<string, Record<string, number>>;
}

export interface DeprecationSummary {
  type: string;
  id: string;
  message: string;
  count: number;
  demos: string[];
}

export const allowedSeverities = new Set(["info", "warning", "error"]);

export const allowedKinds = new Set([
  "demo.batch",
  "page.load",
  "console.error",
  "console.warn",
  "runtime.error",
  "runtime.unhandledrejection",
  "resource.error",
  "interaction.click",
  "interaction.submit",
  "perf.lcp",
  "perf.cls-shift",
  "perf.slow-interaction",
  "perf.long-animation-frame",
  "assert.pass",
  "assert.fail",
  "browser.report",
  "report.deprecation",
  "report.intervention",
  "api.support",
]);
