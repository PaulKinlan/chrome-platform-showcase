// Effect classification for the interactive demo driver (bead
// chrome_platform_showcase-c3p).
//
// The driver used to answer "did anything happen?" from a single CUMULATIVE
// MutationObserver count plus one readout comparison taken around the whole
// interaction sequence. Two things followed, both measured:
//
//   * a control that only paints — canvas or WebGL — mutates no DOM and moves no
//     readout, so the driver reported `NO-EFFECT` for a demo that visibly
//     responded. Its own before/after screenshots differed, so the report
//     contradicted itself. The screenshot pair is the only evidence it had, and
//     the verdict ignored it.
//   * a run-then-reset demo reported a total that mixed the effect with the reset
//     (`click: Run, click: Clear (6 mutations)`) against a byte-identical
//     screenshot pair, with no way to tell which action did what.
//
// So classification happens per action here, and the visual signal is part of the
// decision rather than a note beside it.
//
// The honest limit, which the wording below keeps: a differing screenshot pair
// shows the page changed after a control was used. It does NOT by itself attribute
// that change to the control — an autoplaying animation or a clock would look the
// same — so a visual-only effect is reported with that limit attached rather than
// as ordinary proof.

export const EFFECT_KIND = {
  /** A control changed the DOM or a readout: attributable to the interaction. */
  DOM: "dom",
  /** No DOM or readout change, but the page visibly changed after the click. */
  VISUAL: "visual",
  /** Nothing changed at all. */
  NONE: "none",
};

/**
 * Driver outcomes. `VISUAL-ONLY` is deliberately NOT a pass: a differing
 * screenshot pair is non-causal (an animation, a clock or an autoplay produces
 * one identically), so the row is reported for review rather than counted.
 */
export const DRIVE_STATUS = {
  PASS: "PASS",
  VISUAL_ONLY: "VISUAL-ONLY",
  NO_EFFECT: "NO-EFFECT",
};

// Indexed but not demonstrated: kept out of the pass tally and listed separately,
// as the showcase-auto-research SKILL requires for zero-control reference pages.
// `UNVERIFIED` (disk-recovered, bead cix) keeps its own separate tally.
export const NOT_DEMONSTRATED_STATUSES = [
  "NO-CONTROLS",
  "NOT-DRIVEABLE",
  "NO-EFFECT",
  "NOT-ASSERTED",
  DRIVE_STATUS.VISUAL_ONLY,
];

/** Two readout snapshots are "moved" when their captured text differs. */
export function readoutsMoved(before, after) {
  return JSON.stringify(before ?? []) !== JSON.stringify(after ?? []);
}

/**
 * Classify one drive's evidence.
 *
 * @param {object} input
 * @param {Array<{action: string, mutations?: number, readoutsAfter?: string[]}>} input.interactions
 *   Per-action evidence, in the order the actions ran.
 * @param {string[]} input.readoutsBefore Snapshot taken before any action.
 * @param {boolean|null} input.visualDelta Whether the before/after screenshots
 *   differ (`null` when a screenshot was not captured).
 * @returns {{hasEffect: boolean, kind: string, effectiveActions: Array<object>,
 *   resetBy: string|null, note: string|null}}
 */
export function classifyDriveEffect(
  { interactions = [], readoutsBefore = [], visualDelta = null } = {},
) {
  const effectiveActions = [];
  let resetBy = null;

  interactions.forEach((interaction, index) => {
    const mutations = Number(interaction?.mutations ?? 0) || 0;
    const moved = readoutsMoved(readoutsBefore, interaction?.readoutsAfter);
    if (mutations > 0 || moved) {
      effectiveActions.push({
        index,
        action: interaction?.action ?? `action ${index + 1}`,
        mutations,
        readoutMoved: moved,
      });
    }
  });

  // Reset detection needs the sequence in order: the FIRST action that changed
  // the DOM and left the readouts at their initial values, after some earlier
  // action had moved them. That action is why the screenshot pair is
  // byte-identical — not because nothing happened.
  if (effectiveActions.length) {
    let movedYet = false;
    for (const interaction of interactions) {
      const mutations = Number(interaction?.mutations ?? 0) || 0;
      const moved = readoutsMoved(readoutsBefore, interaction?.readoutsAfter);
      if (moved) {
        movedYet = true;
        continue;
      }
      if (movedYet && mutations > 0) {
        resetBy = interaction?.action ?? null;
        break;
      }
    }
  }

  const hasDomEffect = effectiveActions.length > 0;
  const kind = hasDomEffect
    ? EFFECT_KIND.DOM
    : (visualDelta ? EFFECT_KIND.VISUAL : EFFECT_KIND.NONE);
  const first = effectiveActions[0]?.action ?? null;

  let note = null;
  if (resetBy && first) {
    note =
      `the effect observed on ${first} was returned to the initial state by ${resetBy}, so the before/after screenshots are byte-identical — the earlier effect was real, and the pair is not proof of it`;
  } else if (kind === EFFECT_KIND.VISUAL) {
    note =
      "the before/after screenshots differ, so the page changed after a control was used, but no DOM mutation or readout change was observed — a differing pair is NON-CAUSAL (an animation, clock or autoplay looks the same), so it cannot attribute the change to the control";
  }

  return {
    hasEffect: hasDomEffect || Boolean(visualDelta),
    kind,
    effectiveActions,
    resetBy,
    note,
  };
}

/**
 * Turn an effect classification into a run outcome.
 *
 * Only an action-level effect is a PASS. A visual-only effect is reported as
 * `VISUAL-ONLY`, which is a not-demonstrated status: it is shown with BOTH
 * screenshot hashes and the causal limit attached, and it is never folded into
 * the pass count.
 */
export function gradeEffectOutcome({ effect, exercised = 0, beforeHash = null, afterHash = null }) {
  if (effect?.kind === EFFECT_KIND.DOM) return { status: DRIVE_STATUS.PASS };
  if (effect?.kind === EFFECT_KIND.VISUAL) {
    const pair = beforeHash && afterHash ? ` (${beforeHash} -> ${afterHash})` : "";
    return {
      status: DRIVE_STATUS.VISUAL_ONLY,
      reason:
        `${exercised} control(s) exercised, no DOM mutation and no readout change; the before/after screenshots differ${pair} — a differing pair is NON-CAUSAL (an animation, clock or autoplay looks the same), so this is not evidence that the control did anything and needs review`,
    };
  }
  return {
    status: DRIVE_STATUS.NO_EFFECT,
    reason:
      `${exercised} control(s) exercised, no DOM mutation, readout change or screenshot change observed`,
  };
}

/**
 * One-line attribution for the run summary, so the mutation total is never
 * presented without saying which action produced it.
 */
export function describeActions(interactions = [], fallback = "") {
  const parts = interactions.map((interaction) => {
    const mutations = Number(interaction?.mutations ?? 0) || 0;
    return `${interaction?.action ?? "action"} (${mutations} mutation${
      mutations === 1 ? "" : "s"
    })`;
  });
  if (!parts.length) return fallback;
  return parts.slice(0, 4).join(", ");
}
