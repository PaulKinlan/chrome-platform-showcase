// Co-located server handler for v138/pass-sec-purpose-prefetch-header-with-link-rel-prefetch.

import { BoundedSessionStore } from "../../lib/session-store.ts";
import { jsonResponse } from "../../lib/feature-servers/http-helpers.ts";

const PREFETCH_BUDGET_MONITOR_ROUTE =
  "/pass-sec-purpose-prefetch-header-with-link-rel-prefetch/prefetch-budget-monitor/budget-endpoint";
const PREFETCH_BUDGET_MONITOR_LIMIT_KB = 80;

interface PrefetchBudgetEntry {
  id: string;
  nonce: string;
  label: string;
  resource: string;
  receivedAt: string;
  received: {
    secPurpose: string | null;
    purpose: string | null;
    secFetchDest: string | null;
    secFetchMode: string | null;
  };
  decision: "slim" | "blocked" | "full";
  status: number;
  fullKb: number;
  slimKb: number;
  servedKb: number;
  budget: {
    limitKb: number;
    usedKb: number;
    remainingKb: number;
  };
}

interface PrefetchBudgetSession {
  usedKb: number;
  entries: PrefetchBudgetEntry[];
}

const prefetchBudgetSessions = new BoundedSessionStore<PrefetchBudgetSession>();

function getPrefetchBudgetSession(key: string): PrefetchBudgetSession {
  const existing = prefetchBudgetSessions.get(key);
  if (existing) return existing;
  const session = { usedKb: 0, entries: [] };
  prefetchBudgetSessions.set(key, session);
  return session;
}

function resetPrefetchBudgetSession(key: string): PrefetchBudgetSession {
  const session = { usedKb: 0, entries: [] };
  prefetchBudgetSessions.set(key, session);
  return session;
}

function boundedKb(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(500, Math.round(parsed)));
}

function prefetchBudgetSnapshot(session: PrefetchBudgetSession) {
  return {
    limitKb: PREFETCH_BUDGET_MONITOR_LIMIT_KB,
    usedKb: session.usedKb,
    remainingKb: Math.max(0, PREFETCH_BUDGET_MONITOR_LIMIT_KB - session.usedKb),
    entries: session.entries,
  };
}

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  if (sub !== PREFETCH_BUDGET_MONITOR_ROUTE) return null;

  const url = new URL(req.url);
  const sessionKey = (url.searchParams.get("session") || "default").replace(/[^\w.-]/g, "_");
  const session = url.searchParams.get("reset") === "1"
    ? resetPrefetchBudgetSession(sessionKey)
    : getPrefetchBudgetSession(sessionKey);

  if (url.searchParams.get("read") === "1" || url.searchParams.get("reset") === "1") {
    return jsonResponse(prefetchBudgetSnapshot(session), {
      headers: {
        "vary": "Sec-Purpose, Purpose",
      },
    });
  }

  const nonce = (url.searchParams.get("nonce") || crypto.randomUUID()).replace(/[^\w.-]/g, "_");
  const duplicate = session.entries.find((entry) => entry.nonce === nonce);
  if (duplicate) {
    return jsonResponse(duplicate, {
      status: duplicate.status,
      headers: {
        "vary": "Sec-Purpose, Purpose",
      },
    });
  }

  const secPurpose = req.headers.get("sec-purpose");
  const purpose = req.headers.get("purpose");
  const purposeText = `${secPurpose ?? ""} ${purpose ?? ""}`.toLowerCase();
  const isPrefetch = purposeText.includes("prefetch");
  const fullKb = boundedKb(url.searchParams.get("fullKb"), 50);
  const slimKb = boundedKb(url.searchParams.get("slimKb"), Math.max(8, Math.round(fullKb / 3)));
  const resource = url.searchParams.get("resource") || "resource";
  const label = url.searchParams.get("label") || resource;
  const wouldUseKb = session.usedKb + slimKb;
  const decision: PrefetchBudgetEntry["decision"] = isPrefetch
    ? wouldUseKb > PREFETCH_BUDGET_MONITOR_LIMIT_KB ? "blocked" : "slim"
    : "full";
  const servedKb = decision === "blocked" ? 0 : decision === "slim" ? slimKb : fullKb;
  if (decision === "slim") {
    session.usedKb += slimKb;
  }

  const entry: PrefetchBudgetEntry = {
    id: url.searchParams.get("id") || resource,
    nonce,
    label,
    resource,
    receivedAt: new Date().toISOString(),
    received: {
      secPurpose,
      purpose,
      secFetchDest: req.headers.get("sec-fetch-dest"),
      secFetchMode: req.headers.get("sec-fetch-mode"),
    },
    decision,
    status: 200,
    fullKb,
    slimKb,
    servedKb,
    budget: {
      limitKb: PREFETCH_BUDGET_MONITOR_LIMIT_KB,
      usedKb: session.usedKb,
      remainingKb: Math.max(0, PREFETCH_BUDGET_MONITOR_LIMIT_KB - session.usedKb),
    },
  };
  session.entries.push(entry);
  if (session.entries.length > 40) session.entries.splice(0, session.entries.length - 40);

  const headers = new Headers({
    "vary": "Sec-Purpose, Purpose",
    "x-demo-decision": decision,
    "x-demo-sec-purpose": secPurpose ?? "",
    "x-demo-purpose": purpose ?? "",
    "x-demo-served-kb": String(servedKb),
    "x-demo-budget-used-kb": String(session.usedKb),
    "access-control-expose-headers":
      "x-demo-decision, x-demo-sec-purpose, x-demo-purpose, x-demo-served-kb, x-demo-budget-used-kb",
  });

  if (req.method === "HEAD") {
    return new Response(null, { status: entry.status, headers });
  }

  return jsonResponse({
    ...entry,
    bodyKind: decision === "slim"
      ? "speculative slim response"
      : decision === "blocked"
      ? "budget block"
      : "full navigation response",
    note: isPrefetch
      ? "The server observed a prefetch purpose header and applied the speculative budget policy."
      : "No prefetch purpose header was present, so the server used the full navigation path.",
  }, { status: entry.status, headers });
}
