#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env
// Route regression gate for the durable demo compatibility contract.
//
// Enforces: stable URLs, additive evolution, non-destructive demos. It compares
// the previously published manifest (baseline) against the working tree and
// FAILS (exit 1) on any destructive change that is not covered by a reviewed
// migration record.
//
// Baseline = the catalogue at `origin/main`, derived straight from git so it
// can't drift. If that ref is unavailable (offline/CI without a remote), it
// falls back to the committed `.route-manifest.baseline.json` snapshot.
// Current = the working tree.
//
// FAIL when, going baseline -> current:
//   1. a baseline published id is MISSING from current (deleted/renamed), OR
//   2. a baseline `built` route no longer resolves (its index.html is gone), OR
//   3. a baseline id's IDENTITY changed (repurposed slug -> different feature), OR
//   4. a baseline `blocked` id was DELETED (must stay recorded), OR
//   5. the published (built) count dropped and the drop is not covered by
//      migration records, OR
//   6. a feature's concept count dropped (destructive concept deletion) without
//      a covering migration.
// PASS: additive new ids, honest new `blocked` records, in-place fixes that keep
//   the same id + identity + live route, and anything listed in migrations.json.
//
// Usage:
//   deno run --allow-read --allow-run --allow-env scripts/check-routes.mjs
//   node scripts/check-routes.mjs
//   SHOWCASE_BASELINE_REF=<sha> deno run --allow-read --allow-run --allow-env scripts/check-routes.mjs
//
// `--allow-env` lets Deno resolve `git` on PATH for the drift-proof git
// baseline; without it the gate falls back to .route-manifest.baseline.json.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import {
  buildFromDisk,
  buildFromGitRef,
  defaultBaselineRef,
  loadMigrations,
  REPO_ROOT,
  routeFileExists,
} from "./lib/manifest.mjs";
import {
  changedFeatureIds,
  classClaimsSupport,
  classResolved,
  coverage,
  loadSidecar,
  loadSidecarFromRef,
  SUPPORT_CLASSES,
} from "./lib/support.mjs";

// A frontend-touching critique with a present-but-EMPTY `guidanceConsulted`
// array is an explicit incomplete signal (mandatory modern-web-guidance
// invariant). An absent array is a legacy critique the gate does not fail on.
// Returns "empty" | "ok" | "legacy".
function guidanceStatusFor(id) {
  const featureDir = join(REPO_ROOT, id);
  const candidates = [join(featureDir, "_questions.json")];
  try {
    for (const entry of readdirSync(featureDir, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push(join(featureDir, entry.name, "_questions.json"));
    }
  } catch {
    // feature dir unreadable
  }
  let worst = "legacy";
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const c = JSON.parse(readFileSync(file, "utf8"));
      if (!("guidanceConsulted" in c)) continue; // legacy critique, not failed
      if (Array.isArray(c.guidanceConsulted) && c.guidanceConsulted.length > 0) {
        if (worst === "legacy") worst = "ok";
      } else {
        return "empty"; // present-but-empty is an explicit incomplete signal
      }
    } catch {
      // malformed critique: ignore for guidance purposes
    }
  }
  return worst;
}

function idFromRoute(route) {
  return String(route).replace(/^\/+/, "").replace(/\/+$/, "");
}

function loadBaseline() {
  const ref = defaultBaselineRef();
  try {
    const manifest = buildFromGitRef(ref);
    if (manifest.length > 0) return { manifest, source: `git ${ref}` };
  } catch {
    // fall through to the committed snapshot
  }
  const snapshot = join(REPO_ROOT, ".route-manifest.baseline.json");
  if (existsSync(snapshot)) {
    return {
      manifest: JSON.parse(readFileSync(snapshot, "utf8")),
      source: ".route-manifest.baseline.json (fallback)",
    };
  }
  throw new Error(
    "No baseline available: could not read origin/main and no .route-manifest.baseline.json exists.",
  );
}

function index(manifest) {
  const map = new Map();
  for (const entry of manifest) map.set(entry.id, entry);
  return map;
}

function main() {
  const { manifest: baseline, source } = loadBaseline();
  const current = buildFromDisk();
  const migrations = loadMigrations();

  const baseIdx = index(baseline);
  const curIdx = index(current);

  // Migration coverage sets keyed by the affected (source) id.
  const removedOrMovedIds = new Set();
  const identityChangeIds = new Set();
  const touchedIds = new Set();
  for (const m of migrations) {
    const fromId = m.from ? idFromRoute(m.from) : m.id ? idFromRoute(m.id) : null;
    if (fromId) touchedIds.add(fromId);
    if (m.id) touchedIds.add(idFromRoute(m.id));
    if (m.action === "remove" || m.action === "move") {
      if (fromId) removedOrMovedIds.add(fromId);
      if (m.id) removedOrMovedIds.add(idFromRoute(m.id));
    }
    if (m.action === "identity-change") {
      if (fromId) identityChangeIds.add(fromId);
      if (m.id) identityChangeIds.add(idFromRoute(m.id));
    }
  }

  const failures = [];
  let added = 0;
  let fixedInPlace = 0;

  // Baseline -> current checks.
  for (const [id, base] of baseIdx) {
    const cur = curIdx.get(id);

    if (!cur) {
      // (1) missing published id; (4) deleted blocked id.
      if (removedOrMovedIds.has(id)) continue; // reviewed removal/move
      const label = base.status === "blocked" ? "blocked entry deleted" : "published id missing";
      failures.push(`${label}: ${id} (route ${base.route}) removed with no migration record`);
      continue;
    }

    // (2) built route no longer resolves.
    if (base.status === "built" && cur.status === "built" && !routeFileExists(id)) {
      failures.push(`built route deleted: ${id} index.html is gone (route ${base.route})`);
    }

    // (3) identity changed (repurposed slug).
    if (base.identity !== cur.identity && !identityChangeIds.has(id)) {
      failures.push(
        `identity changed: ${id} was ${base.identity}, now ${cur.identity} (no migration record)`,
      );
    } else if (base.identity !== cur.identity) {
      fixedInPlace++;
    }

    // (6) concept-count reduction (destructive concept deletion).
    const baseConcepts = base.concepts?.length ?? 0;
    const curConcepts = cur.concepts?.length ?? 0;
    if (curConcepts < baseConcepts && !touchedIds.has(id)) {
      failures.push(
        `concept count dropped: ${id} had ${baseConcepts} concepts, now ${curConcepts} (no migration record)`,
      );
    }
  }

  for (const [id] of curIdx) {
    if (!baseIdx.has(id)) added++;
  }

  // (5) published (built) count drop backstop.
  const baseBuilt = baseline.filter((m) => m.status === "built").length;
  const curBuilt = current.filter((m) => m.status === "built").length;
  const missingBuilt = [...baseIdx.values()].filter(
    (m) => m.status === "built" && !curIdx.has(m.id) && !removedOrMovedIds.has(m.id),
  );
  if (curBuilt < baseBuilt && missingBuilt.length > 0) {
    // Already reported per-id above; this is the aggregate guard.
    failures.push(
      `built count dropped ${baseBuilt} -> ${curBuilt} with ${missingBuilt.length} unexplained removal(s)`,
    );
  }

  const removedCount = migrations.filter(
    (m) => m.action === "remove" || m.action === "move",
  ).length;

  // ── Mobile + desktop parity invariant ──────────────────────────────────────
  // ADDITIVE checks. They never touch the immutable conformance suites; they
  // read the `responsive-support.json` sidecar and the critique guidance field.
  const curSupport = loadSidecar();
  const baseSupport = (() => {
    const ref = defaultBaselineRef();
    try {
      return loadSidecarFromRef(ref);
    } catch {
      return {};
    }
  })();
  const cov = coverage(curSupport);
  const ref = defaultBaselineRef();
  const touched = changedFeatureIds(ref);

  // (A) GLOBAL: any published demo recorded `broken` on a class it claims to
  // support fails the gate — a demo must never ship broken on a supported class.
  for (const entry of current) {
    if (entry.status !== "built") continue;
    const rec = entry.support ?? { desktop: "untested", mobile: "untested" };
    for (const cls of SUPPORT_CLASSES) {
      if (rec[cls] === "broken" && classClaimsSupport(rec, cls)) {
        failures.push(`${entry.id}: recorded BROKEN on ${cls}, a class it claims to support`);
      }
    }
  }

  // (B) MONOTONIC: a class that was resolved (ok/unsupported) in the baseline
  // must not silently drop back to untested/needs-review/broken without a
  // migration record covering the id.
  for (const [id, base] of Object.entries(baseSupport)) {
    const cur = curSupport[id];
    if (!cur) continue;
    for (const cls of SUPPORT_CLASSES) {
      const wasResolved = base[cls] === "ok" || base[cls] === "unsupported";
      const nowResolved = cur[cls] === "ok" || cur[cls] === "unsupported";
      if (wasResolved && !nowResolved && !touchedIds.has(id)) {
        failures.push(
          `${id}: ${cls} support regressed ${base[cls]} -> ${
            cur[cls]
          } (coverage must be monotonic; record a migration if intentional)`,
        );
      }
    }
  }

  // (C) TOUCHED DEMOS: a supported device class left untested/needs-review/broken
  // for a demo this change touched is a failed completion. `unsupported` needs
  // evidence; that is honest and passes.
  for (const id of touched) {
    const entry = curIdx.get(id);
    if (!entry || entry.status !== "built") continue;
    const rec = entry.support ?? { desktop: "untested", mobile: "untested" };
    for (const cls of SUPPORT_CLASSES) {
      if (classClaimsSupport(rec, cls) && !classResolved(rec, cls)) {
        failures.push(
          `${id}: touched demo left ${cls} = "${
            rec[cls]
          }" — a supported class must be tested (ok) or honestly unsupported+evidence before push`,
        );
      }
    }
    // (D) GUIDANCE: a touched demo whose critique records an empty
    // `guidanceConsulted` is INCOMPLETE (mandatory modern-web-guidance).
    if (guidanceStatusFor(id) === "empty") {
      failures.push(
        `${id}: touched demo has a critique with an EMPTY guidanceConsulted — record which modern-web-guidance was consulted/applied`,
      );
    }
  }

  process.stdout.write(
    `route regression gate (baseline: ${source})\n` +
      `  ${baseline.length} published baseline, ${current.length} current, ` +
      `+${added} added, ~${fixedInPlace} fixed-in-place, ` +
      `${removedCount === 0 ? "0 removed" : `${removedCount} migration record(s)`}\n` +
      `  responsive coverage — desktop: ${cov.desktop.ok}/${cov.total} ok (${cov.testedD} tested, ` +
      `${cov.desktop["needs-review"]} needs-review, ${cov.desktop.untested} untested); ` +
      `mobile: ${cov.mobile.ok}/${cov.total} ok (${cov.testedM} tested, ` +
      `${cov.mobile["needs-review"]} needs-review, ${cov.mobile.untested} untested)\n` +
      `  touched demos this change: ${touched.size}\n`,
  );

  if (failures.length > 0) {
    process.stdout.write(`\nFAIL: ${failures.length} contract violation(s):\n`);
    for (const f of failures) process.stdout.write(`  - ${f}\n`);
    process.stdout.write(
      "\nAn intentional removal/move/identity-change must be recorded in migrations.json " +
        "with { id, action, from, to, reason, evidence, date }.\n",
    );
    process.exit(1);
  }

  process.stdout.write("PASS: no published demo route or identity was destructively changed.\n");
}

main();
