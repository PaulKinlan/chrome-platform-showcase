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
    // Does it follow the design system rules (CSS variables / WCAG AA /
    // button colour override / no static-card)?
    design_system: Verdict;
  };

  // Open questions / work items derived from the rubric. Empty list means the
  // page passes the bar with nothing follow-up worth.
  openQuestions: OpenQuestion[];

  // Optional one-paragraph summary the reviewer writes in their own words.
  summary?: string;
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
