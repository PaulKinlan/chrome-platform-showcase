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
  /** No attributable action effect, but delayed DOM mutations or readout moves occurred during settle. */
  DELAYED: "delayed",
  /** No DOM or readout change, but the page visibly changed after the click. */
  VISUAL: "visual",
  /** Nothing changed at all. */
  NONE: "none",
};

/**
 * Driver outcomes. `VISUAL-ONLY` and `DELAYED-CHANGE` are deliberately NOT passes:
 * differing screenshot pairs or aggregate settle changes are non-causal
 * (animations, clocks, autoplays, or ambient churn produce them identically),
 * so they are reported for review rather than counted as passes.
 */
export const DRIVE_STATUS = {
  PASS: "PASS",
  VISUAL_ONLY: "VISUAL-ONLY",
  DELAYED_CHANGE: "DELAYED-CHANGE",
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
  DRIVE_STATUS.DELAYED_CHANGE,
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

  // Reset detection needs the sequence in order: the FIRST action that changed
  // the DOM and left the readouts at their initial values, after some earlier
  // action had moved them. That action is why the screenshot pair is
  // byte-identical — not because nothing happened.
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

  // Delayed / settle evidence:
  // When no action produced an immediate effect in its per-action window,
  // mutations or readout changes may have landed during the post-action settle.
  //
  // However, aggregate settle timing alone CANNOT prove causality: an ambient
  // timer, clock, animation, or page churn produces mutations during settle
  // identically even if the clicked control was a no-op (beads 1je and 1vl).
  //
  // Therefore:
  // 1. Settle mutations or delayed readout moves are preserved as observables,
  //    classified in the distinct non-pass, non-causal outcome DELAYED-CHANGE
  //    (not NO-EFFECT, and NEVER promoted to PASS).
  // 2. Unrelated pre-action churn (settleMutations === 0) or churn on an
  //    un-exercised page (interactions empty) does NOT count as delayed change.
  // 3. stateChanged alone (without settle mutations or readout change) CANNOT
  //    cause PASS or DELAYED-CHANGE.
  const delayedMutations = settleMutations != null
    ? Math.max(0, Number(settleMutations) || 0)
    : (interactions.length > 0
      ? Math.max(0, Number(mutations ?? cumulativeMutations ?? 0) || 0)
      : 0);
  const delayedReadoutMoved = readoutsAfter != null
    ? readoutsMoved(readoutsBefore, readoutsAfter)
    : false;

  const hasDelayedChange = !hasDomEffect && interactions.length > 0 &&
    (delayedMutations > 0 || delayedReadoutMoved);

  let kind = EFFECT_KIND.NONE;
  if (hasDomEffect) {
    kind = EFFECT_KIND.DOM;
  } else if (hasDelayedChange) {
    kind = EFFECT_KIND.DELAYED;
  } else if (visualDelta) {
    kind = EFFECT_KIND.VISUAL;
  }

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
  } else if (kind === EFFECT_KIND.DELAYED) {
    const details = [];
    if (delayedMutations > 0) details.push(`${delayedMutations} settle mutation(s)`);
    if (delayedReadoutMoved) details.push("readout moved during settle");
    note = `delayed change observed during settle (${
      details.join(", ")
    }), but no immediate per-action effect was observed — aggregate settle timing is NON-CAUSAL (ambient timers, clocks or page churn produce it identically), so it cannot attribute the change to the control without a demo-specific assertion`;
  } else if (kind === EFFECT_KIND.VISUAL) {
    note =
      "the before/after screenshots differ, so the page changed after a control was used, but no DOM mutation or readout change was observed — a differing pair is NON-CAUSAL (an animation, clock or autoplay looks the same), so it cannot attribute the change to the control";
  }

  return {
    hasEffect: hasDomEffect || hasDelayedChange || Boolean(visualDelta),
    kind,
    effectiveActions,
    resetBy,
    resetTarget,
    settleMutations: delayedMutations,
    delayedReadoutMoved,
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
  if (effect?.kind === EFFECT_KIND.DELAYED) {
    const details = [];
    if ((effect.settleMutations ?? 0) > 0) {
      details.push(`${effect.settleMutations} settle mutation(s)`);
    }
    if (effect.delayedReadoutMoved) details.push("readout moved");
    const detailStr = details.length ? ` (${details.join(", ")})` : "";
    return {
      status: DRIVE_STATUS.DELAYED_CHANGE,
      reason:
        `${exercised} control(s) exercised, no immediate per-action DOM mutation or readout change; delayed change observed during settle${detailStr} — aggregate settle change is NON-CAUSAL (ambient timers or page churn produce it identically), so this needs review or demo-specific assertion rather than a pass`,
      effect,
    };
  }
  if (effect?.kind === EFFECT_KIND.VISUAL) {
    const pair = beforeHash && afterHash ? ` (${beforeHash} -> ${afterHash})` : "";
    return {
      status: DRIVE_STATUS.VISUAL_ONLY,
      reason:
        `${exercised} control(s) exercised, no DOM mutation and no readout change; the before/after screenshots differ${pair} — a differing pair is NON-CAUSAL (an animation, clock or autoplay looks the same), so this is not evidence that the control did anything and needs review`,
      effect,
    };
  }
  return {
    status: DRIVE_STATUS.NO_EFFECT,
    reason:
      `${exercised} control(s) exercised, no DOM mutation, readout change or screenshot change observed`,
    effect,
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
  });
  if (found === 0) {
    return {
      status: "NO-CONTROLS",
      reason: "no interactive controls found — reference page, not a driven demo",
      effect,
    };
  }
  if (exercised === 0) {
    return {
      status: "NOT-DRIVEABLE",
      reason:
        `${found} control(s) found, none exercisable by the driver (gesture- or selection-dependent?)`,
      effect,
    };
  }
  const outcome = gradeEffectOutcome({ effect, exercised, beforeHash, afterHash });
  return outcome.status === DRIVE_STATUS.PASS
    ? { status: DRIVE_STATUS.PASS, effect }
    : { ...outcome, effect };
}
