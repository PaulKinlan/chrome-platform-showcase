// Cross-project conformance & responsive-support data model (ADDITIVE).
//
// This module adds two cross-project invariants to the showcase WITHOUT touching
// the existing, immutable per-feature `v<N>/<feature-slug>/conformance.json`
// suites (those stay byte-for-byte identical — only ADD new suites/assertions,
// never edit/weaken/delete existing ones):
//
//   1. Mobile + desktop parity — every published demo is a usable, polished
//      experience on BOTH mobile and desktop, or honestly recorded as
//      unsupported on one class WITH evidence.
//   2. Mandatory modern-web-guidance — every frontend change consulted the
//      `modern-web-guidance` skill for its topics and applied/justified them.
//
// The new immutable assertion suites live OUTSIDE the `v<N>/` tree, in
// `conformance/cross-project/*.json`, so the existing browser conformance runner
// (which only scans `v<N>/`) is untouched, and no existing suite array changes.
// These assertions are evaluated by the responsive-check harness + the route
// gate (kinds `device-class` / `responsive` / `build-process`), not by the
// in-page css-supports/exists runner.
//
// The per-demo `support` record is a git-tracked sidecar `responsive-support.json`
// keyed by feature-demo id (`v<N>/<feature-slug>`, the durable-contract unit),
// merged into the route manifest by `scripts/lib/manifest.mjs`.

// ── Cross-project conformance suite ──────────────────────────────────────────

export type CrossAssertionKind =
  // A device class must be supported (`ok`) or honestly `unsupported` WITH
  // evidence — never left `untested`/broken for a touched demo. `test` names
  // the class: "mobile" | "desktop" | "both".
  | "device-class"
  // A responsive/runtime invariant the responsive-check harness verifies per
  // class (no horizontal overflow, no clipped controls, tap targets, focus,
  // dialogs/popovers, dynamic-viewport/safe-area, loading/progress/error/retry,
  // console clean, network clean, honest capability handling). `test` is the
  // invariant key.
  | "responsive"
  // A build-process assertion the gate/validator checks against the demo's
  // critique artifact (e.g. modern-web-guidance was consulted). `test` is the
  // process key.
  | "build-process";

export interface CrossConformanceAssertion {
  id: string;
  description: string;
  kind: CrossAssertionKind;
  // Payload — semantics depend on kind (class name, invariant key, process key).
  test: string;
  // How this assertion is evaluated: the responsive-check harness, or the gate.
  evaluatedBy: "responsive-harness" | "route-gate";
  // Optional link to the canonical policy / guidance.
  specSection?: string;
}

export interface CrossConformanceSuite {
  // Stable suite id, e.g. "cross-project/mobile-desktop-parity".
  id: string;
  title: string;
  // Applies to every published demo, not one feature.
  scope: "all-published-demos";
  generatedAt: string;
  author: string;
  // The canonical policy this suite encodes (verbatim source path/name).
  policy: string;
  assertions: CrossConformanceAssertion[];
}

// ── Per-demo responsive support record ───────────────────────────────────────

export type SupportState =
  // Validated on this class via a real mobile+desktop matrix pass.
  | "ok"
  // Genuinely unavailable on this class (API/hardware/runtime/model) — needs
  // `evidence` and (usually) `unsupportedClass`.
  | "unsupported"
  // Never validated on this class. The honest default for existing demos and
  // the backlog burn-down denominator.
  | "untested"
  // A cheap automated scan flagged a possible problem (e.g. mobile overflow).
  // NOT a pass — a real matrix pass is required to flip it to `ok`/`broken`.
  | "needs-review"
  // A real matrix pass found this class broken on a class the demo should
  // support. The gate FAILS on this.
  | "broken";

export interface SupportRecord {
  desktop: SupportState;
  mobile: SupportState;
  // Which class is genuinely unavailable, when one is `unsupported`.
  unsupportedClass?: "mobile" | "desktop";
  // Why the unsupported/blocked class is genuinely unavailable — API/hardware/
  // runtime/model requirement (required whenever a class is `unsupported`).
  evidence?: string;
  // ISO date of the last harness run that wrote this record.
  lastChecked?: string;
  // How the record was produced: "harness" (real matrix pass), "overflow-scan"
  // (cheap automated seed), or "manual".
  source?: "harness" | "overflow-scan" | "manual" | "seed";
}

export type ResponsiveSupportSidecar = Record<string, SupportRecord>;

export const RESOLVED_STATES: SupportState[] = ["ok", "unsupported"];

// A class is "resolved" (acceptable for a touched demo) only when it is `ok` or
// `unsupported`-with-evidence. `untested`/`needs-review`/`broken` are unresolved.
export function classResolved(record: SupportRecord, cls: "mobile" | "desktop"): boolean {
  const state = record[cls];
  if (state === "ok") return true;
  if (state === "unsupported") return Boolean(record.evidence);
  return false;
}

// A support record claims a class is supported when it is `ok` (or should be —
// anything that is not `unsupported`). `broken` on a supported class fails the
// gate; `unsupported` (with evidence) is honest and passes.
export function classClaimsSupport(record: SupportRecord, cls: "mobile" | "desktop"): boolean {
  return record[cls] !== "unsupported";
}

export function defaultSupport(): SupportRecord {
  return { desktop: "untested", mobile: "untested", source: "seed" };
}
