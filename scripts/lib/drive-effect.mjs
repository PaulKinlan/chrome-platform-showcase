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
  {
    interactions = [],
    readoutsBefore = [],
    readoutsAfter = null,
    visualDelta = null,
    cumulativeMutations = 0,
    settleMutations = null,
    mutations = null,
    stateChanged = null,
    disableDelayedMutations = false,
  } = {},
) {
  const effectiveActions = [];
  let resetBy = null;

  interactions.forEach((interaction, index) => {
    const actionMutations = Number(interaction?.mutations ?? 0) || 0;
    const moved = readoutsMoved(readoutsBefore, interaction?.readoutsAfter);
    if (actionMutations > 0 || moved) {
      effectiveActions.push({
        index,
        action: interaction?.action ?? `action ${index + 1}`,
        mutations: actionMutations,
        readoutMoved: moved,
      });
    }
  });

  // When per-action windows (200 ms) observe no mutations or readout moves,
  // slower DOM effects that land during the post-action settle (250-550 ms after
  // click) are preserved by cumulative run evidence. Settle mutations are
  // attributed to the last exercised action rather than discarded.
  //
  // Unrelated DOM churn is guarded:
  //   * If no controls were exercised (interactions empty), cumulative mutations
  //     cannot be attributed to any action and remain un-promoted.
  //   * If settleMutations is explicitly 0 (pre-action churn occurred before any
  //     click, but nothing happened during or after actions), it is not counted.
  if (!disableDelayedMutations && effectiveActions.length === 0 && interactions.length > 0) {
    const runMutations = settleMutations != null
      ? (Number(settleMutations) || 0)
      : (Number(mutations ?? cumulativeMutations ?? 0) || 0);
    const runMoved = readoutsAfter != null ? readoutsMoved(readoutsBefore, readoutsAfter) : false;
    const hasCumulativeDom = runMutations > 0 || runMoved || Boolean(stateChanged);
    if (hasCumulativeDom) {
      const lastIndex = interactions.length - 1;
      const lastInteraction = interactions[lastIndex];
      effectiveActions.push({
        index: lastIndex,
        action: lastInteraction?.action ?? `action ${lastIndex + 1}`,
        mutations: runMutations,
        readoutMoved: runMoved,
        delayed: true,
      });
    }
  }

  // Reset detection needs the sequence in order: the FIRST action that changed
  // the DOM and left the readouts at their initial values, after some earlier
  // action had moved them. That action is why the screenshot pair is
  // byte-identical — not because nothing happened.
  //
  // The action the reset UNDID is the one that last moved the readouts, which is
  // not the same as the first action to have any effect at all: a theme toggle or
  // a mute button can mutate the DOM without touching a readout, and naming that
  // as the reset's target would blame the wrong control.
  let resetTarget = null;
  if (effectiveActions.length) {
    let movedYet = false;
    for (const interaction of interactions) {
      const actionMutations = Number(interaction?.mutations ?? 0) || 0;
      const moved = readoutsMoved(readoutsBefore, interaction?.readoutsAfter);
      if (moved) {
        movedYet = true;
        resetTarget = interaction?.action ?? null;
        continue;
      }
      if (movedYet && actionMutations > 0) {
        resetBy = interaction?.action ?? null;
        break;
      }
    }
  }

  const hasDomEffect = effectiveActions.length > 0;
  const kind = hasDomEffect
    ? EFFECT_KIND.DOM
    : (visualDelta ? EFFECT_KIND.VISUAL : EFFECT_KIND.NONE);

  let note = null;
  if (resetBy && resetTarget) {
    // The pair is only byte-identical when the reset was the last thing that
    // happened. A later action — or the ambient motion a differing pair cannot be
    // distinguished from — makes that claim false, so it is not made.
    const undone =
      `the effect observed on ${resetTarget} was returned to the initial state by ${resetBy}`;
    note = visualDelta === false
      ? `${undone}, so the before/after screenshots are byte-identical — the earlier effect was real, and the pair is not proof of it`
      : visualDelta === true
      ? `${undone}; the screenshots differ, but the pair shows whatever happened after the reset, so it is not proof of that effect`
      // No pair was captured. Saying "the screenshots differ" here would assert
      // something the run never saw.
      : `${undone}; no before/after pair was captured, so there is no screenshot evidence either way`;
  } else if (kind === EFFECT_KIND.VISUAL) {
    note =
      "the before/after screenshots differ, so the page changed after a control was used, but no DOM mutation or readout change was observed — a differing pair is NON-CAUSAL (an animation, clock or autoplay looks the same), so it cannot attribute the change to the control";
  }

  return {
    hasEffect: hasDomEffect || Boolean(visualDelta),
    kind,
    effectiveActions,
    resetBy,
    resetTarget,
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

/**
 * Turn run evidence into a final verdict.
 *
 * @param {object} input
 * @param {boolean} [input.isSpecCase]
 * @param {object} [input.driveData]
 * @param {string|null} [input.driveError]
 * @param {string[]} [input.errors]
 * @param {boolean|null} [input.visualDelta]
 * @param {string|null} [input.beforeHash]
 * @param {string|null} [input.afterHash]
 * @param {boolean} [input.disableDelayedMutations]
 * @returns {object}
 */
export function gradeRun({
  isSpecCase = false,
  driveData = null,
  driveError = null,
  errors = [],
  visualDelta = null,
  beforeHash = null,
  afterHash = null,
  disableDelayedMutations = false,
}) {
  if (driveError) return { status: "FAIL", reason: driveError };
  if (errors.length) return { status: "FAIL", reason: errors.join("; ") };

  // A spec case carries its own contract, so grade that and nothing else: spec
  // scripts return their own shape and have no controlsFound/controlsExercised.
  const assertMap = driveData && typeof driveData.assert === "object" && driveData.assert;
  if (assertMap) {
    const failed = Object.entries(assertMap).filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length) {
      return {
        status: "FAIL",
        reason: `assertion(s) failed: ${failed.join("; ")}`,
        failedAssertions: failed,
      };
    }
    return { status: "PASS" };
  }
  if (isSpecCase) {
    return {
      status: "NOT-ASSERTED",
      reason: "spec case returned no `assert` map, so it asserted nothing",
    };
  }

  // Generic driver: grade the interaction evidence it already collects.
  const found = driveData?.controlsFound ?? 0;
  const exercised = driveData?.controlsExercised ?? 0;
  const effect = classifyDriveEffect({
    interactions: driveData?.interactions ?? [],
    readoutsBefore: driveData?.readoutsBefore ?? [],
    readoutsAfter: driveData?.readoutsAfter ?? [],
    visualDelta,
    cumulativeMutations: driveData?.mutations ?? 0,
    settleMutations: driveData?.settleMutations ?? null,
    mutations: driveData?.mutations ?? 0,
    stateChanged: driveData?.stateChanged ?? false,
    disableDelayedMutations,
  });
  if (found === 0) {
    return {
      status: "NO-CONTROLS",
      reason: "no interactive controls found — reference page, not a driven demo",
    };
  }
  if (exercised === 0) {
    return {
      status: "NOT-DRIVEABLE",
      reason:
        `${found} control(s) found, none exercisable by the driver (gesture- or selection-dependent?)`,
    };
  }
  const outcome = gradeEffectOutcome({ effect, exercised, beforeHash, afterHash });
  return outcome.status === DRIVE_STATUS.PASS ? { status: DRIVE_STATUS.PASS, effect } : outcome;
}
