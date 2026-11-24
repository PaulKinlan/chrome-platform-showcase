// Co-located server handler for v131/exempt-speculation-rules-header-from-csp-restrictions.

import {
  evictOldestProbeRecords,
  recordProbeDoc,
  SPECULATION_RULES_PROBE_MAX_RECORDS,
  SPECULATION_RULES_PROBE_TTL_MS,
  sweepExpiredProbeRecords,
} from "../../lib/probe-record-store.ts";
import { jsonResponse } from "../../lib/feature-servers/http-helpers.ts";
import { escapeHTML } from "../../routes/html.ts";

const SPECULATION_RULES_CSP_PREFIX = "/exempt-speculation-rules-header-from-csp-restrictions";
const speculationRulesProbeRecords = new Map<
  string,
  {
    createdAt: number;
    pageLoads: number;
    ruleRequests: string[];
    targetRequests: string[];
  }
>();

function speculationRulesProbeRecord(token: string) {
  const now = Date.now();
  // Only the expired prefix is visited (see lib/probe-record-store.ts), so this
  // is O(expired) rather than the O(n) full sweep it used to be, and the store
  // cannot grow past SPECULATION_RULES_PROBE_MAX_RECORDS.
  sweepExpiredProbeRecords(speculationRulesProbeRecords, now, SPECULATION_RULES_PROBE_TTL_MS);
  const existing = speculationRulesProbeRecords.get(token);
  if (existing) return existing;
  const record = { createdAt: now, pageLoads: 0, ruleRequests: [], targetRequests: [] };
  speculationRulesProbeRecords.set(token, record);
  evictOldestProbeRecords(speculationRulesProbeRecords, SPECULATION_RULES_PROBE_MAX_RECORDS);
  return record;
}

function validSpeculationRulesProbeToken(token: string | null): token is string {
  return !!token && /^[a-zA-Z0-9_-]{8,80}$/.test(token);
}

function safeSpeculationRulesHeaderString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function parseSpeculationRulesHeaderDocs(raw: string | null): string[] {
  const fallback = ["/rules.json"];
  if (!raw) return fallback;
  const docs: string[] = [];
  const pattern = /"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) && docs.length < 4) {
    const value = match[1].replace(/\\(["\\])/g, "$1");
    if (
      value.startsWith("/") &&
      !value.includes("\r") &&
      !value.includes("\n") &&
      value.length <= 120
    ) {
      docs.push(value);
    }
  }
  return docs.length > 0 ? docs : fallback;
}

function normalizeSpeculationRulesCsp(raw: string | null): string {
  const presets: Record<string, string> = {
    none: "",
    self: "script-src 'self'; object-src 'none'; base-uri 'none'",
    strict: "script-src 'strict-dynamic' 'nonce-abc'; object-src 'none'; base-uri 'none'",
    locked: "script-src 'none'; object-src 'none'; base-uri 'none'",
  };
  if (!raw) return presets.self;
  if (raw in presets) return presets[raw];
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") return "";
  if (/[\r\n]/.test(trimmed)) return presets.self;
  return trimmed.slice(0, 240);
}

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  if (!sub.startsWith(`${SPECULATION_RULES_CSP_PREFIX}/`)) return null;
  const route = sub.slice(SPECULATION_RULES_CSP_PREFIX.length);
  const url = new URL(req.url);
  const routePrefix = `/v131${SPECULATION_RULES_CSP_PREFIX}`;
  const token = url.searchParams.get("token");

  if (route === "/spec-rules-csp/header-probe") {
    if (!validSpeculationRulesProbeToken(token)) {
      return jsonResponse({ error: "A token query parameter is required." }, { status: 400 });
    }
    const record = speculationRulesProbeRecord(token);
    const csp = normalizeSpeculationRulesCsp(
      url.searchParams.get("csp") ?? url.searchParams.get("preset"),
    );
    const docs = parseSpeculationRulesHeaderDocs(url.searchParams.get("rules"));
    const ruleUrls = docs.map((doc, index) => {
      const rulesUrl = new URL(
        `${routePrefix}/spec-rules-csp/rules.json`,
        url.origin,
      );
      rulesUrl.searchParams.set("token", token);
      rulesUrl.searchParams.set("doc", doc);
      rulesUrl.searchParams.set("slot", String(index + 1));
      return rulesUrl.pathname + rulesUrl.search;
    });
    const headerValue = ruleUrls.map(safeSpeculationRulesHeaderString).join(", ");
    const headers = new Headers({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "speculation-rules": headerValue,
      "x-demo-speculation-rules": headerValue,
    });
    headers.set("access-control-expose-headers", "Speculation-Rules, X-Demo-Speculation-Rules");
    if (csp) headers.set("content-security-policy", csp);
    if (url.searchParams.get("mode") !== "echo") {
      record.pageLoads += 1;
    }
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>Speculation-Rules header probe</title><p>Speculation-Rules header probe for ${
        escapeHTML(token)
      }</p>`,
      { headers },
    );
  }

  if (route === "/spec-rules-csp/rules.json") {
    if (!validSpeculationRulesProbeToken(token)) {
      return jsonResponse({ error: "A token query parameter is required." }, { status: 400 });
    }
    const record = speculationRulesProbeRecord(token);
    const doc = url.searchParams.get("doc") || "/rules.json";
    recordProbeDoc(record.ruleRequests, doc);
    const target = new URL(
      `${routePrefix}/spec-rules-csp/prefetch-target`,
      url.origin,
    );
    target.searchParams.set("token", token);
    target.searchParams.set("doc", doc);
    const payload = {
      prefetch: [{
        source: "list",
        urls: [target.pathname + target.search],
        eagerness: "moderate",
      }],
    };
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/speculationrules+json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  if (route === "/spec-rules-csp/prefetch-target") {
    if (validSpeculationRulesProbeToken(token)) {
      const record = speculationRulesProbeRecord(token);
      const doc = url.searchParams.get("doc") || "/rules.json";
      recordProbeDoc(record.targetRequests, doc);
    }
    return new Response("prefetch target", {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  if (route === "/spec-rules-csp/probe-status") {
    if (!validSpeculationRulesProbeToken(token)) {
      return jsonResponse({ error: "A token query parameter is required." }, { status: 400 });
    }
    const record = speculationRulesProbeRecord(token);
    return jsonResponse({
      token,
      pageLoads: record.pageLoads,
      ruleRequests: record.ruleRequests,
      targetRequests: record.targetRequests,
    }, {
      headers: { "cache-control": "no-store" },
    });
  }

  return null;
}
