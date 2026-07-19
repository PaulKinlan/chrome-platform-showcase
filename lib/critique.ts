// Self-critique data model.
//
// A critique is the structured output of a reviewer pass over a single concept
// page. Reviewer agents fetch the concept's HTML, the feature's chromestatus
// detail, and the spec, then score against the rubric below. The output lives
// on disk next to the concept it critiques so it can be browsed without a
// database. A later routine fire reads these files and uses the open questions
// as work items.
//
// File location: v<N>/<feature-slug>/<concept-slug>/_questions.json
// (or v<N>/<feature-slug>/_questions.json for the feature-level summary).

export interface Verdict {
  // One of: "pass" | "partial" | "fail" | "n/a"
  // - pass: the criterion is met without reservation.
  // - partial: met for the common path but missing edge cases / failure modes.
  // - fail: not met.
  // - n/a: this criterion doesn't apply (e.g. interactivity bar for a pure
  //   reference card on a removed feature).
  state: "pass" | "partial" | "fail" | "n/a";
  // One short sentence of rationale. The reviewer agent always writes one.
  rationale: string;
}

export interface OpenQuestion {
  // Short imperative title for the work item ("Add edge case demo for the
  // empty-cell branch", "Verify the spec link still resolves").
  title: string;
  // The angle / use case that's missing. If the answer is "build a new
  // concept page", suggestedSlug is the slug to use; otherwise undefined.
  suggestedSlug?: string;
  // One paragraph of context for the next agent that picks this up.
  detail: string;
  // Optional severity hint. Reviewer agents are encouraged to be honest about
  // priority — most critiques are "minor" or "moderate".
  severity?: "minor" | "moderate" | "major";
}

export interface CritiqueReport {
  // The release the critiqued page lives in (e.g. "v149").
  release: string;
  // The feature slug (e.g. "css-gap-decorations").
  featureSlug: string;
  // The concept slug being critiqued ("rule-builder"), or undefined when this
  // is the feature-level summary.
  conceptSlug?: string;
  // ChromeStatus feature id (number from the URL).
  chromestatusId: number;
  // ISO timestamp when the critique was produced.
  reviewedAt: string;
  // The reviewer's name (subagent id, "manual", or a future bot account).
  reviewer: string;

  // Rubric verdicts.
  rubric: {
    // Does the demo actually demonstrate what the spec promises?
    spec_match: Verdict;
    // Is the interactive surface real (controls / live readout / API call),
    // not just a styled code card?
    interactive: Verdict;
    // Does the blurb on the feature index match the spec's framing of why
    // the feature exists?
    blurb_alignment: Verdict;
    // Are edge cases / failure modes covered, or only the happy path?
    edge_cases: Verdict;
    // Does the page cite the chromestatus.com/feature/<id> reference link?
    references: Verdict;
    // Does the conformance suite prove the real feature contract, including
    // fallback/negative branches where relevant, instead of only checking that
    // a broad API surface exists?
    conformance: Verdict;
    // Is there concrete browser evidence: screenshots/video where useful,
    // console/network clean, controls exercised, and output state verified?
    runtime_evidence: Verdict;
    // Does the page emit useful runtime telemetry for errors, assertions,
    // interactions, and performance so failures can be diagnosed after ship?
    telemetry_health: Verdict;
    // Does it follow the design system rules (CSS variables / WCAG AA /
    // button colour override / no static-card)?
    design_system: Verdict;
    // Is the demo accessible: keyboard-operable controls, useful semantics,
    // accessible names/labels, non-visual state, and clear live updates?
    accessibility: Verdict;
    // ADDITIVE (cross-project mobile+desktop parity invariant): is the demo a
    // usable, polished experience on BOTH a narrow mobile viewport (≈360×740,
    // touch, DPR≈3) and desktop (≈1280×800, mouse+keyboard) — no unintended
    // horizontal overflow / clipped controls, legible text, ≈44px tap targets,
    // correct focus order + visible focus, dialogs/popovers/menus that open,
    // position, dismiss and trap focus, dynamic-viewport/safe-area where
    // relevant, and loading/progress/error/retry states — OR honestly recorded
    // as unsupported on one class WITH evidence (never left unfinished)?
    // Optional so the ~2000 legacy critiques stay valid; a critique written
    // after this dimension shipped should score it. `scoreVerdicts` and the
    // renderers iterate whatever keys are present, so absence is backward
    // compatible.
    mobile_desktop_parity?: Verdict;
  };

  // Open questions / work items derived from the rubric. Empty list means the
  // page passes the bar with nothing follow-up worth.
  openQuestions: OpenQuestion[];

  // ADDITIVE (mandatory modern-web-guidance invariant): which modern-web-guidance
  // recommendations the frontend work consulted, and how each was applied or why
  // excepted. A frontend-touching critique with an EMPTY `guidanceConsulted` is
  // INCOMPLETE — the validator/gate treats an empty-but-present array on a
  // touched demo as a failed completion (see scripts/check-routes.mjs and
  // `guidanceComplete` below). Left optional so the ~2000 legacy critiques stay
  // valid; every critique written after this field shipped must populate it for
  // any frontend change. Query the SPECIFIC task (e.g. "responsive control panel
  // without horizontal overflow"), not a generic memory.
  guidanceConsulted?: GuidanceConsulted[];

  // Optional one-paragraph summary the reviewer writes in their own words.
  summary?: string;
}

// A single modern-web-guidance consultation recorded on a critique.
export interface GuidanceConsulted {
  // The guidance recommendation id (preferred) OR the search query used.
  id?: string;
  query?: string;
  // The recommendation in one line (what the guidance says to do).
  recommendation: string;
  // How it was applied, or a justified exception with evidence.
  appliedOrException: string;
  // Optional supporting evidence (URL, measurement, screenshot path).
  evidence?: string;
}

// A frontend-touching critique is complete only when it identifies at least one
// guidance consultation. A present-but-empty array is an explicit incomplete
// signal; an absent array is a legacy critique the gate does not fail on.
export function guidanceComplete(report: CritiqueReport): boolean {
  return Array.isArray(report.guidanceConsulted) && report.guidanceConsulted.length > 0;
}

// On-disk shape for the per-concept file. We write the report verbatim.
export function critiqueFilePath(
  release: string,
  featureSlug: string,
  conceptSlug?: string,
): string {
  if (conceptSlug) {
    return `${release}/${featureSlug}/${conceptSlug}/_questions.json`;
  }
  return `${release}/${featureSlug}/_questions.json`;
}

// Sums of verdicts that get rolled up. "n/a" is excluded from the score.
export function scoreVerdicts(rubric: CritiqueReport["rubric"]): {
  pass: number;
  partial: number;
  fail: number;
  na: number;
  scored: number;
  ratio: number;
} {
  let pass = 0, partial = 0, fail = 0, na = 0;
  for (const v of Object.values(rubric)) {
    if (v.state === "pass") pass++;
    else if (v.state === "partial") partial++;
    else if (v.state === "fail") fail++;
    else na++;
  }
  const scored = pass + partial + fail;
  // Weighted ratio: pass = 1, partial = 0.5, fail = 0.
  const ratio = scored === 0 ? 1 : (pass + partial * 0.5) / scored;
  return { pass, partial, fail, na, scored, ratio };
}
