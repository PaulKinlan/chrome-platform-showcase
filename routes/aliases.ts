// Durable-URL alias redirects for the demo compatibility contract.
//
// When a published demo route is intentionally moved (recorded in
// migrations.json as an `alias`/`move`), the OLD route must keep working — the
// contract says never silently break a route. This handler reads those records
// and serves a permanent (301) redirect from each old route to its new route,
// preserving any deeper concept path so inbound deep links survive.
//
// migrations.json is the single source of truth for both this live redirect and
// the `scripts/check-routes.mjs` regression gate.

interface MigrationRecord {
  id?: string;
  action?: string;
  from?: string;
  to?: string;
  reason?: string;
  evidence?: string;
  date?: string;
}

function normalizeBase(route: string): string {
  let value = route.trim();
  if (!value.startsWith("/")) value = `/${value}`;
  if (!value.endsWith("/")) value = `${value}/`;
  return value;
}

function loadAliases(): Array<{ from: string; to: string }> {
  const out: Array<{ from: string; to: string }> = [];
  try {
    const raw = Deno.readTextFileSync(new URL("../migrations.json", import.meta.url));
    const records = JSON.parse(raw) as MigrationRecord[];
    if (!Array.isArray(records)) return out;
    for (const record of records) {
      if (record.action !== "alias" && record.action !== "move") continue;
      if (!record.from || !record.to) continue;
      out.push({ from: normalizeBase(record.from), to: normalizeBase(record.to) });
    }
  } catch {
    // No migrations file or malformed JSON: no aliases, never crash the server.
  }
  return out;
}

const ALIASES = loadAliases();

export function handleAliasRoute(req: Request): Response | null {
  if (ALIASES.length === 0) return null;

  const url = new URL(req.url);
  let path = url.pathname;
  if (!path.endsWith("/") && !/\.[a-z0-9]+$/i.test(path)) path += "/";

  for (const alias of ALIASES) {
    if (path === alias.from || path.startsWith(alias.from)) {
      const suffix = path.slice(alias.from.length);
      const location = `${alias.to}${suffix}${url.search}`;
      return new Response(null, {
        status: 301,
        headers: {
          "location": location,
          "cache-control": "public, max-age=86400",
        },
      });
    }
  }

  return null;
}
