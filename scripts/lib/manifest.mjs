// Route manifest library for the durable demo compatibility contract.
//
// The catalogue for chrome-platform-showcase is the filesystem: every
// `v<N>/<feature-slug>/index.html` is a PUBLISHED feature demo with a real
// route (`/v<N>/<feature-slug>/`) and a stable identity (the ChromeStatus
// feature id linked from its index, i.e. the feature/spec id). Concept demos
// live in `v<N>/<feature-slug>/<concept-slug>/index.html`.
//
// This module normalises that tree into an append-only manifest of published
// demo identities: `{ id, route, identity, status, aliases, concepts }`.
// It can build the manifest from the working tree (disk) or from a git ref
// (origin/main) so the regression gate can diff a drift-proof baseline against
// the working tree. Portable ESM: runs under both `deno run` and `node`.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const FEATURE_INDEX_RE = /^(v\d+)\/([^/]+)\/index\.html$/;
const CONCEPT_INDEX_RE = /^v\d+\/[^/]+\/([^/]+)\/index\.html$/;
const CHROMESTATUS_RE = /chromestatus\.com\/feature\/(\d+)/;

export const REPO_ROOT = join(new URL(".", import.meta.url).pathname, "..", "..");

function git(args, { cwd = REPO_ROOT } = {}) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
}

function idFromRoute(route) {
  return String(route).replace(/^\/+/, "").replace(/\/+$/, "");
}

function routeFromId(id) {
  return `/${id}/`;
}

function identityFor(id, chromestatusId) {
  return chromestatusId ? `chromestatus:${chromestatusId}` : `slug:${id}`;
}

// Migration records permit exceptional removals/moves/identity changes and keep
// moved routes alive. Schema: { id, action, from, to, reason, evidence, date }.
export function loadMigrations(root = REPO_ROOT) {
  const file = join(root, "migrations.json");
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("migrations.json must be a JSON array");
  }
  return parsed;
}

// Responsive support sidecar (mobile + desktop parity invariant): a git-tracked
// `responsive-support.json` keyed by feature-demo id. Merged into each manifest
// entry as `support`. ADDITIVE — absence yields the honest untested default so
// the gate/coverage never crash on an un-seeded tree.
const DEFAULT_SUPPORT = { desktop: "untested", mobile: "untested" };

export function loadSupportSidecar(root = REPO_ROOT) {
  const file = join(root, "responsive-support.json");
  if (!existsSync(file)) return {};
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function loadSupportSidecarFromRef(ref, root = REPO_ROOT) {
  try {
    const raw = execFileSync("git", ["show", `${ref}:responsive-support.json`], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// Aliases keyed by the CURRENT (destination) id: which old routes should still
// resolve to it. Derived from `move`/`alias` migration records.
export function aliasesByDestinationId(migrations) {
  const map = new Map();
  for (const m of migrations) {
    if (m.action !== "move" && m.action !== "alias") continue;
    if (!m.to || !m.from) continue;
    const toId = idFromRoute(m.to);
    if (!map.has(toId)) map.set(toId, []);
    map.get(toId).push(m.from);
  }
  return map;
}

function statusForDisk(root, id) {
  // Forward-looking convention: a feature dir may carry a `_status.json` with
  // `{ "status": "blocked" }` to honestly record an unsupported/blocked demo
  // that has a route + catalogue entry but no runnable happy path. Blocked
  // entries stay under contract and must never be silently deleted.
  const statusFile = join(root, id, "_status.json");
  if (existsSync(statusFile)) {
    try {
      const s = JSON.parse(readFileSync(statusFile, "utf8"))?.status;
      if (s === "blocked") return "blocked";
    } catch {
      // Malformed marker: treat as built rather than crash the gate.
    }
  }
  return "built";
}

function conceptsForDisk(root, id) {
  const dir = join(root, id);
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (existsSync(join(dir, entry.name, "index.html"))) out.push(entry.name);
  }
  return out.sort();
}

// Build the manifest from the working tree.
export function buildFromDisk(root = REPO_ROOT) {
  const migrations = loadMigrations(root);
  const aliasMap = aliasesByDestinationId(migrations);
  const support = loadSupportSidecar(root);
  const entries = [];

  for (const dirent of readdirSync(root, { withFileTypes: true })) {
    if (!dirent.isDirectory() || !/^v\d+$/.test(dirent.name)) continue;
    const release = dirent.name;
    for (const feature of readdirSync(join(root, release), { withFileTypes: true })) {
      if (!feature.isDirectory()) continue;
      const id = `${release}/${feature.name}`;
      const indexPath = join(root, id, "index.html");
      if (!existsSync(indexPath)) continue;
      let chromestatusId = null;
      const match = readFileSync(indexPath, "utf8").match(CHROMESTATUS_RE);
      if (match) chromestatusId = match[1];
      entries.push({
        id,
        route: routeFromId(id),
        identity: identityFor(id, chromestatusId),
        status: statusForDisk(root, id),
        aliases: (aliasMap.get(id) ?? []).slice().sort(),
        concepts: conceptsForDisk(root, id),
        support: support[id] ?? { ...DEFAULT_SUPPORT },
      });
    }
  }
  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return entries;
}

// Build the manifest from a git ref (e.g. origin/main). Drift-proof baseline:
// the catalogue at the ref is enumerated straight from git, so it cannot be
// edited alongside the working-tree change under review.
export function buildFromGitRef(ref, root = REPO_ROOT) {
  const migrations = loadMigrations(root);
  const aliasMap = aliasesByDestinationId(migrations);
  const support = loadSupportSidecarFromRef(ref, root);

  const files = git(["ls-tree", "-r", "--name-only", ref], { cwd: root })
    .split("\n").filter(Boolean);

  const featureIds = new Set();
  const conceptsById = new Map();
  const statusById = new Map();
  for (const path of files) {
    const fm = path.match(FEATURE_INDEX_RE);
    if (fm) {
      const id = `${fm[1]}/${fm[2]}`;
      featureIds.add(id);
      if (!conceptsById.has(id)) conceptsById.set(id, []);
      continue;
    }
    const parts = path.split("/");
    if (parts.length === 4 && parts[3] === "index.html" && CONCEPT_INDEX_RE.test(path)) {
      const id = `${parts[0]}/${parts[1]}`;
      if (!conceptsById.has(id)) conceptsById.set(id, []);
      conceptsById.get(id).push(parts[2]);
    }
    if (parts.length === 3 && parts[2] === "_status.json" && /^v\d+$/.test(parts[0])) {
      const id = `${parts[0]}/${parts[1]}`;
      try {
        const s = JSON.parse(git(["show", `${ref}:${path}`], { cwd: root }))?.status;
        if (s === "blocked") statusById.set(id, "blocked");
      } catch {
        // ignore malformed baseline marker
      }
    }
  }

  // One pass over git-grep gives the ChromeStatus identity per feature index.
  const identityById = new Map();
  let grepOut = "";
  try {
    grepOut = git(
      ["grep", "-oE", "chromestatus\\.com/feature/[0-9]+", ref, "--", "*/index.html"],
      { cwd: root },
    );
  } catch {
    grepOut = "";
  }
  for (const line of grepOut.split("\n")) {
    if (!line) continue;
    const pathMatch = line.match(/:(v\d+\/[^:]+\/index\.html):/);
    if (!pathMatch) continue;
    const fm = pathMatch[1].match(FEATURE_INDEX_RE);
    if (!fm) continue; // only feature-level indexes define identity
    const id = `${fm[1]}/${fm[2]}`;
    if (identityById.has(id)) continue; // first match wins
    const idMatch = line.match(CHROMESTATUS_RE);
    if (idMatch) identityById.set(id, idMatch[1]);
  }

  const entries = [];
  for (const id of featureIds) {
    entries.push({
      id,
      route: routeFromId(id),
      identity: identityFor(id, identityById.get(id) ?? null),
      status: statusById.get(id) ?? "built",
      aliases: (aliasMap.get(id) ?? []).slice().sort(),
      concepts: (conceptsById.get(id) ?? []).slice().sort(),
      support: support[id] ?? { ...DEFAULT_SUPPORT },
    });
  }
  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return entries;
}

export function routeFileExists(id, root = REPO_ROOT) {
  return existsSync(join(root, id, "index.html"));
}

export function serialize(manifest) {
  return JSON.stringify(manifest, null, 2) + "\n";
}

// Small CLI convenience for callers that want the current git HEAD's origin ref.
export function defaultBaselineRef() {
  // Read the env override defensively: under `deno run` without --allow-env,
  // touching process.env throws. An unset/blocked override just means the
  // default ref, so swallow the failure rather than crash the gate.
  try {
    if (process.env && process.env.SHOWCASE_BASELINE_REF) {
      return process.env.SHOWCASE_BASELINE_REF;
    }
  } catch {
    // no env access; fall through to default
  }
  return "origin/main";
}
