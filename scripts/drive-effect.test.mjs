// Effect classification for the interactive demo driver
// (bead chrome_platform_showcase-c3p, from the mvw review).
//
// The driver decided "did anything happen?" from one CUMULATIVE MutationObserver
// count plus a single readout comparison taken around the whole interaction
// sequence. Measured on purpose-built fixtures at the base commit:
//
//   - a Run-then-Clear demo reported `PASS ... click: Run, click: Clear (6
//     mutations)` against a BYTE-IDENTICAL screenshot pair. The effect was real,
//     but the total mixed it with the reset, nothing said which action did what,
//     and the pair presented as evidence was worthless;
//   - a demo whose Run only paints a canvas reported `NO-EFFECT — no DOM mutation
//     or readout change observed` while its OWN screenshots differed
//     (711590282133ce74 vs 9e8b1d60f4c2f37e). A demo that plainly responded was
//     graded not-demonstrated, and the run contradicted itself.
//
// So classification is per action now, and the visual signal takes part in the
// decision. Three properties matter as much as the fix: a genuine no-op demo must
// still report NO-EFFECT, an absent screenshot must never count as a change, and a
// differing pair must never be promoted into an attribution it cannot support.
//
// On that last point the project ruling is explicit (coord, 2026-10-08): a
// differing pair is NON-CAUSAL, because an animation, a clock or an autoplay
// produces one identically. A visual-only effect is therefore NOT an ordinary
// PASS — it is reported as VISUAL-ONLY, carries both hashes and the causal limit,
// and is kept out of the pass count.
//
// Run: deno task test-drive-effect

import {
  classifyDriveEffect,
  describeActions,
  DRIVE_STATUS,
  EFFECT_KIND,
  gradeEffectOutcome,
  gradeRun,
  NOT_DEMONSTRATED_STATUSES,
} from "./lib/drive-effect.mjs";

let failures = 0;
function section(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n  actual:   ${a}\n  expected: ${e}`);
}

// The initial readouts a demo starts with, and the two states the Run/Clear
// fixture was measured in.
const IDLE = ["idle"];
const RAN = ["ran: 3 rows"];

section("an action that mutates is an effect and is attributed to that action", () => {
  const effect = classifyDriveEffect({
    interactions: [{ action: "click: Run", mutations: 3, readoutsAfter: RAN }],
    readoutsBefore: IDLE,
    visualDelta: true,
  });
  assert(effect.hasEffect, "a mutating action must count as an effect");
  assertEqual(effect.kind, EFFECT_KIND.DOM, "a DOM mutation is a dom-kind effect");
  assertEqual(
    effect.effectiveActions.map((a) => a.action),
    ["click: Run"],
    "attributed to click: Run",
  );
  assertEqual(effect.resetBy, null, "nothing reset anything");
  assertEqual(effect.note, null, "no caveat is needed for a plain attributable effect");
});

section("a run followed by a reset keeps the earlier effect AND names the reset", () => {
  // The measured fixture: Run appends three rows, Clear removes them and puts the
  // readout back, so the screenshot pair hashes the same. The bug was calling this
  // ambiguous; the fixture proves the sequence, so the run states it.
  const effect = classifyDriveEffect({
    interactions: [
      { action: "click: Run", mutations: 3, readoutsAfter: RAN },
      { action: "click: Clear", mutations: 3, readoutsAfter: IDLE },
    ],
    readoutsBefore: IDLE,
    visualDelta: false,
  });
  assert(effect.hasEffect, "a reset must not erase the earlier effect");
  assertEqual(effect.kind, EFFECT_KIND.DOM, "the effect that happened was a DOM effect");
  assertEqual(effect.resetBy, "click: Clear", "the resetting action must be named");
  assert(
    effect.note?.includes("click: Run") && effect.note?.includes("click: Clear"),
    `the note must name both the effect and the reset, got: ${effect.note}`,
  );
  assert(
    effect.note?.includes("not proof"),
    "the note must keep saying the byte-identical pair is not proof",
  );
});

section("no action is reported as a reset unless a readout actually moved first", () => {
  // Clearing an already-empty list changes nothing. Calling that a reset would
  // invent an effect that never happened, so this must stay a no-op.
  const noop = classifyDriveEffect({
    interactions: [
      { action: "click: Clear", mutations: 0, readoutsAfter: IDLE },
      { action: "click: Clear", mutations: 0, readoutsAfter: IDLE },
    ],
    readoutsBefore: IDLE,
    visualDelta: false,
  });
  assert(!noop.hasEffect, "clearing nothing is not an effect");
  assertEqual(noop.kind, EFFECT_KIND.NONE, "and not a visual one either");
  assertEqual(noop.resetBy, null, "a no-op must never be called a reset");
  // A MUTATING action that leaves the readouts alone is still not a reset when no
  // readout ever moved: there was no readout effect for it to undo.
  const mutating = classifyDriveEffect({
    interactions: [
      { action: "click: Clear", mutations: 2, readoutsAfter: IDLE },
      { action: "click: Clear", mutations: 2, readoutsAfter: IDLE },
    ],
    readoutsBefore: IDLE,
    visualDelta: false,
  });
  assertEqual(mutating.resetBy, null, "mutating without a moved readout is not a reset");
  assertEqual(mutating.resetTarget, null, "and it has no target");
});

section("the reset is attributed to the action whose effect it undid, not the first one", () => {
  // A theme toggle can mutate the DOM without touching any readout. Naming it as
  // the target of a later Clear would blame the wrong control.
  const effect = classifyDriveEffect({
    interactions: [
      { action: "click: Toggle Theme", mutations: 1, readoutsAfter: IDLE },
      { action: "click: Run", mutations: 3, readoutsAfter: RAN },
      { action: "click: Clear", mutations: 2, readoutsAfter: IDLE },
    ],
    readoutsBefore: IDLE,
    visualDelta: false,
  });
  assertEqual(effect.resetBy, "click: Clear", "the resetting action is named");
  assertEqual(
    effect.resetTarget,
    "click: Run",
    "the target is the action whose readout effect was undone, not the first effective action",
  );
  assert(
    effect.note?.includes("click: Run") && !effect.note?.includes("Toggle Theme"),
    `the note must not blame the theme toggle, got: ${effect.note}`,
  );
});

section("a reset does not claim a byte-identical pair when the screenshots differ", () => {
  // Run then Clear ends where it started, but Run-Clear-Run does not. Claiming
  // "byte-identical" from the reset alone asserts something the run never saw.
  const single = classifyDriveEffect({
    interactions: [
      { action: "click: Run", mutations: 3, readoutsAfter: RAN },
      { action: "click: Clear", mutations: 2, readoutsAfter: IDLE },
    ],
    readoutsBefore: IDLE,
    visualDelta: false,
  });
  assert(
    single.note?.includes("byte-identical"),
    "a pair that really is identical may say so",
  );
  const differs = classifyDriveEffect({
    interactions: [
      { action: "click: Run", mutations: 3, readoutsAfter: RAN },
      { action: "click: Clear", mutations: 2, readoutsAfter: IDLE },
    ],
    readoutsBefore: IDLE,
    visualDelta: true,
  });
  assert(
    !differs.note?.includes("byte-identical"),
    `the note must not claim a byte-identical pair when the pair differs, got: ${differs.note}`,
  );
  assert(
    differs.note?.includes("not proof"),
    "it must still say the pair is not proof of the earlier effect",
  );
  // The reviewer's Run-Clear-Run case: the page ends changed, so the pair shows
  // whatever came after the reset rather than the effect that was undone.
  const twice = classifyDriveEffect({
    interactions: [
      { action: "click: Run", mutations: 3, readoutsAfter: RAN },
      { action: "click: Clear", mutations: 2, readoutsAfter: IDLE },
      { action: "click: Run", mutations: 3, readoutsAfter: RAN },
    ],
    readoutsBefore: IDLE,
    visualDelta: true,
  });
  assert(
    !twice.note?.includes("byte-identical"),
    `a run that changed the page again must not claim an identical pair, got: ${twice.note}`,
  );
  // No pair captured at all: neither claim is available, so neither is made. The
  // sign-off flagged that the differing branch was previously taken here, which
  // asserted a difference the run never saw.
  const uncaptured = classifyDriveEffect({
    interactions: [
      { action: "click: Run", mutations: 3, readoutsAfter: RAN },
      { action: "click: Clear", mutations: 2, readoutsAfter: IDLE },
    ],
    readoutsBefore: IDLE,
    visualDelta: null,
  });
  assert(
    !uncaptured.note?.includes("byte-identical") &&
      !uncaptured.note?.includes("screenshots differ"),
    `an uncaptured pair must not be described either way, got: ${uncaptured.note}`,
  );
  assert(
    uncaptured.note?.includes("no before/after pair was captured"),
    `it must say no pair exists, got: ${uncaptured.note}`,
  );
  assert(uncaptured.resetBy === "click: Clear", "the reset is still reported");
});

section("a readout-only change is an effect even with no DOM mutation", () => {
  const effect = classifyDriveEffect({
    interactions: [{ action: "select preset: strict", mutations: 0, readoutsAfter: ["strict"] }],
    readoutsBefore: IDLE,
    visualDelta: false,
  });
  assert(effect.hasEffect, "a readout that moved is an effect");
  assertEqual(effect.kind, EFFECT_KIND.DOM, "a readout change is attributable evidence");
  assertEqual(effect.effectiveActions[0].readoutMoved, true, "and is flagged as a readout move");
});

section("a control that only paints is a visual effect, not NO-EFFECT", () => {
  // The measured canvas fixture: one click, no DOM mutation, no readout move, and
  // two different screenshot hashes. Reporting NO-EFFECT here discarded the only
  // evidence the run had.
  const effect = classifyDriveEffect({
    interactions: [{ action: "click: Run", mutations: 0, readoutsAfter: IDLE }],
    readoutsBefore: IDLE,
    visualDelta: true,
  });
  assert(effect.hasEffect, "a differing screenshot pair must not be discarded");
  assertEqual(effect.kind, EFFECT_KIND.VISUAL, "it is visual-kind, not dom-kind");
  assertEqual(effect.effectiveActions, [], "no action-level effect was observed");
  assert(
    effect.note?.includes("NON-CAUSAL") && effect.note?.includes("cannot attribute"),
    `a visual-only effect must carry its non-causality limit, got: ${effect.note}`,
  );
});

section("a visual-only effect is graded VISUAL-ONLY, never PASS", () => {
  // The ruling: a differing pair is non-causal, so it must not be folded into the
  // pass count. The row keeps both hashes so the reviewer can look at the pair.
  const effect = classifyDriveEffect({
    interactions: [{ action: "click: Run", mutations: 0, readoutsAfter: IDLE }],
    readoutsBefore: IDLE,
    visualDelta: true,
  });
  const outcome = gradeEffectOutcome({
    effect,
    exercised: 1,
    beforeHash: "711590282133ce74",
    afterHash: "9e8b1d60f4c2f37e",
  });
  assert(outcome.status !== DRIVE_STATUS.PASS, "a differing pair must not be an ordinary pass");
  assertEqual(outcome.status, DRIVE_STATUS.VISUAL_ONLY, "it is its own status");
  assert(
    outcome.reason.includes("711590282133ce74") && outcome.reason.includes("9e8b1d60f4c2f37e"),
    `the reason must carry BOTH hashes, got: ${outcome.reason}`,
  );
  assert(
    outcome.reason.includes("NON-CAUSAL") && outcome.reason.includes("needs review"),
    `the reason must state the causal limit and the need for review, got: ${outcome.reason}`,
  );
  assert(
    NOT_DEMONSTRATED_STATUSES.includes(DRIVE_STATUS.VISUAL_ONLY),
    "VISUAL-ONLY must be a not-demonstrated status so it stays out of the pass tally",
  );
  assert(
    !NOT_DEMONSTRATED_STATUSES.includes(DRIVE_STATUS.PASS),
    "PASS must never be listed as not-demonstrated",
  );
});

section("only an action-level effect is graded PASS", () => {
  const dom = gradeEffectOutcome({
    effect: classifyDriveEffect({
      interactions: [{ action: "click: Run", mutations: 2, readoutsAfter: RAN }],
      readoutsBefore: IDLE,
      visualDelta: true,
    }),
    exercised: 1,
  });
  assertEqual(dom.status, DRIVE_STATUS.PASS, "an attributable effect is a pass");
  const nothing = gradeEffectOutcome({
    effect: classifyDriveEffect({
      interactions: [{ action: "click: Run", mutations: 0, readoutsAfter: IDLE }],
      readoutsBefore: IDLE,
      visualDelta: false,
    }),
    exercised: 1,
  });
  assertEqual(nothing.status, DRIVE_STATUS.NO_EFFECT, "nothing at all stays NO-EFFECT");
  // No screenshot captured: not a change, so still NO-EFFECT rather than VISUAL-ONLY.
  const noShot = gradeEffectOutcome({
    effect: classifyDriveEffect({
      interactions: [{ action: "click: Run", mutations: 0, readoutsAfter: IDLE }],
      readoutsBefore: IDLE,
      visualDelta: null,
    }),
    exercised: 1,
  });
  assertEqual(noShot.status, DRIVE_STATUS.NO_EFFECT, "an uncaptured pair is not a visual effect");
  // A visual-only row without hashes still states the limit rather than naming a pair.
  const hashless = gradeEffectOutcome({
    effect: classifyDriveEffect({
      interactions: [{ action: "click: Run", mutations: 0, readoutsAfter: IDLE }],
      readoutsBefore: IDLE,
      visualDelta: true,
    }),
    exercised: 2,
  });
  assertEqual(hashless.status, DRIVE_STATUS.VISUAL_ONLY, "still VISUAL-ONLY without hashes");
  assert(hashless.reason.includes("2 control"), "the exercised count is reported");
});

section("nothing changed at all still reports no effect", () => {
  const effect = classifyDriveEffect({
    interactions: [{ action: "click: Run", mutations: 0, readoutsAfter: IDLE }],
    readoutsBefore: IDLE,
    visualDelta: false,
  });
  assert(!effect.hasEffect, "a genuine no-op must stay a no-op");
  assertEqual(effect.kind, EFFECT_KIND.NONE, "kind none");
  assertEqual(effect.note, null, "and needs no caveat");
});

section("a missing screenshot is not a visual effect", () => {
  // `visualDelta` is null when no pair was captured. Reading null as "changed"
  // would turn every screenshot-less run into a pass.
  const effect = classifyDriveEffect({
    interactions: [{ action: "click: Run", mutations: 0, readoutsAfter: IDLE }],
    readoutsBefore: IDLE,
    visualDelta: null,
  });
  assert(!effect.hasEffect, "an uncaptured pair must not count as evidence");
  assertEqual(effect.kind, EFFECT_KIND.NONE, "kind none");
});

section("two actions that both move the readouts are not a reset", () => {
  const effect = classifyDriveEffect({
    interactions: [
      { action: "select preset: prefetch", mutations: 1, readoutsAfter: ["prefetch"] },
      { action: "select preset: strict", mutations: 1, readoutsAfter: ["strict"] },
    ],
    readoutsBefore: IDLE,
    visualDelta: false,
  });
  assertEqual(effect.effectiveActions.length, 2, "both presets did something");
  assertEqual(effect.resetBy, null, "the readouts never went back to their initial values");
});

section("the run summary attributes mutations to actions", () => {
  const summary = describeActions([
    { action: "click: Run", mutations: 3 },
    { action: "click: Clear", mutations: 3 },
  ]);
  assert(
    summary === "click: Run (3 mutations), click: Clear (3 mutations)",
    `unexpected summary: ${summary}`,
  );
  assertEqual(describeActions([{ action: "click: Run", mutations: 1 }]), "click: Run (1 mutation)");
  assertEqual(describeActions([]), "", "no interactions renders nothing");
  assertEqual(describeActions([], "fallback text"), "fallback text");
});

// ── Delayed DOM Mutations & Unrelated DOM Churn Guard (bead 1je) ────────────

let disableDelayedMutations = false;
try {
  disableDelayedMutations = Deno.args.includes("--disable-delayed-mutations") ||
    Deno.env.get("DISABLE_DELAYED_MUTATIONS") === "1";
} catch {
  // permission or environment without env access
}

section(
  "delayed DOM mutations landing 250-550ms after click are attributed and graded PASS",
  () => {
    // A demo whose DOM mutation lands 250-550 ms after the click has 0 mutations
    // in the 200 ms per-action window. Cumulative / settle evidence must attribute
    // the mutation to the action that triggered it and grade PASS.
    const effect = classifyDriveEffect({
      interactions: [{ action: "click: Run Delayed", mutations: 0, readoutsAfter: IDLE }],
      readoutsBefore: IDLE,
      readoutsAfter: IDLE,
      visualDelta: false,
      cumulativeMutations: 7,
      settleMutations: 7,
      stateChanged: true,
      disableDelayedMutations,
    });
    assert(effect.hasEffect, "delayed mutations must count as an effect");
    assertEqual(effect.kind, EFFECT_KIND.DOM, "delayed DOM mutation is a dom-kind effect");
    assertEqual(
      effect.effectiveActions.map((a) => a.action),
      ["click: Run Delayed"],
      "attributed to click: Run Delayed",
    );
    assertEqual(effect.effectiveActions[0].mutations, 7, "attributed 7 mutations");
    assertEqual(effect.effectiveActions[0].delayed, true, "flagged as delayed effect");
    const outcome = gradeEffectOutcome({ effect, exercised: 1 });
    assertEqual(outcome.status, DRIVE_STATUS.PASS, "delayed mutations must grade PASS");
  },
);

section("delayed DOM mutations prevent false VISUAL-ONLY when screenshots differ", () => {
  // If the screenshot pair differs AND delayed DOM mutations landed during settle,
  // the run must be graded PASS, not VISUAL-ONLY (which is not-demonstrated).
  const effect = classifyDriveEffect({
    interactions: [{ action: "click: Run Async", mutations: 0, readoutsAfter: IDLE }],
    readoutsBefore: IDLE,
    readoutsAfter: IDLE,
    visualDelta: true,
    cumulativeMutations: 5,
    settleMutations: 5,
    stateChanged: true,
    disableDelayedMutations,
  });
  assertEqual(effect.kind, EFFECT_KIND.DOM, "DOM effect takes precedence over visual-only");
  const outcome = gradeEffectOutcome({
    effect,
    exercised: 1,
    beforeHash: "711590282133ce74",
    afterHash: "9e8b1d60f4c2f37e",
  });
  assertEqual(outcome.status, DRIVE_STATUS.PASS, "must grade PASS rather than VISUAL-ONLY");
});

section(
  "delayed readout move landing after per-action window is attributed and graded PASS",
  () => {
    const effect = classifyDriveEffect({
      interactions: [{ action: "click: Fetch Data", mutations: 0, readoutsAfter: IDLE }],
      readoutsBefore: IDLE,
      readoutsAfter: ["loaded: 42 records"],
      visualDelta: false,
      cumulativeMutations: 0,
      settleMutations: 0,
      stateChanged: true,
      disableDelayedMutations,
    });
    assert(effect.hasEffect, "delayed readout change must count as an effect");
    assertEqual(effect.kind, EFFECT_KIND.DOM, "readout move is a dom-kind effect");
    assertEqual(effect.effectiveActions[0].readoutMoved, true, "flagged as readout move");
    const outcome = gradeEffectOutcome({ effect, exercised: 1 });
    assertEqual(outcome.status, DRIVE_STATUS.PASS, "delayed readout move grades PASS");
  },
);

section("unrelated pre-action DOM churn with a no-op action does NOT count as demo effect", () => {
  // Page had 5 mutations before any control was exercised, but 0 during action
  // and 0 during settle. This is pre-action churn, not an interaction effect.
  const effect = classifyDriveEffect({
    interactions: [{ action: "click: No-op", mutations: 0, readoutsAfter: IDLE }],
    readoutsBefore: IDLE,
    readoutsAfter: IDLE,
    visualDelta: false,
    cumulativeMutations: 5,
    settleMutations: 0,
    stateChanged: false,
  });
  assert(!effect.hasEffect, "pre-action churn must not count as an effect");
  assertEqual(effect.kind, EFFECT_KIND.NONE, "kind none");
  const outcome = gradeEffectOutcome({ effect, exercised: 1 });
  assertEqual(
    outcome.status,
    DRIVE_STATUS.NO_EFFECT,
    "no-op with pre-action churn stays NO-EFFECT",
  );
});

section("unrelated DOM churn on an un-exercised page does NOT count as demo effect", () => {
  // No controls were exercised (interactions empty). Cumulative mutations cannot
  // be attributed to any action.
  const effect = classifyDriveEffect({
    interactions: [],
    readoutsBefore: IDLE,
    readoutsAfter: IDLE,
    visualDelta: false,
    cumulativeMutations: 10,
    settleMutations: 10,
    stateChanged: true,
  });
  assert(!effect.hasEffect, "un-exercised churn must not count as an effect");
  assertEqual(effect.kind, EFFECT_KIND.NONE, "kind none");
  assertEqual(effect.effectiveActions, [], "no actions to attribute");
});

section("gradeRun grades delayed DOM mutations as PASS end-to-end", () => {
  const verdict = gradeRun({
    driveData: {
      controlsFound: 1,
      controlsExercised: 1,
      actions: ["click: Run Delayed"],
      interactions: [{ action: "click: Run Delayed", mutations: 0, readoutsAfter: IDLE }],
      readoutsBefore: IDLE,
      readoutsAfter: IDLE,
      mutations: 6,
      settleMutations: 6,
      stateChanged: true,
    },
    disableDelayedMutations,
  });
  assertEqual(verdict.status, DRIVE_STATUS.PASS, "gradeRun must grade delayed mutations PASS");
  assertEqual(verdict.effect?.kind, EFFECT_KIND.DOM, "verdict carries dom effect");
});

section("mutation disabling mechanism proves test suite turns red when disabled", () => {
  // Disabling the delayed mutation mechanism reproduces the exact prior defect:
  // per-action 200 ms window saw 0 mutations, so classifyDriveEffect returns
  // kind "none" and gradeRun reports NO-EFFECT (or VISUAL-ONLY when screenshots differ).
  const disabled = classifyDriveEffect({
    interactions: [{ action: "click: Run Delayed", mutations: 0, readoutsAfter: IDLE }],
    readoutsBefore: IDLE,
    readoutsAfter: IDLE,
    visualDelta: false,
    cumulativeMutations: 7,
    settleMutations: 7,
    stateChanged: true,
    disableDelayedMutations: true,
  });
  assertEqual(
    disabled.kind,
    EFFECT_KIND.NONE,
    "disabling delayed mutation handling must yield kind none",
  );
  assertEqual(disabled.effectiveActions, [], "no effective actions when disabled");
  const outcome = gradeEffectOutcome({ effect: disabled, exercised: 1 });
  assertEqual(
    outcome.status,
    DRIVE_STATUS.NO_EFFECT,
    "disabling delayed mutation handling must yield NO-EFFECT (showing red for genuine passes)",
  );

  const visualDisabled = classifyDriveEffect({
    interactions: [{ action: "click: Run Delayed", mutations: 0, readoutsAfter: IDLE }],
    readoutsBefore: IDLE,
    readoutsAfter: IDLE,
    visualDelta: true,
    cumulativeMutations: 7,
    settleMutations: 7,
    stateChanged: true,
    disableDelayedMutations: true,
  });
  assertEqual(
    visualDisabled.kind,
    EFFECT_KIND.VISUAL,
    "disabling delayed mutation handling with visual delta yields visual-kind",
  );
  const visualOutcome = gradeEffectOutcome({ effect: visualDisabled, exercised: 1 });
  assertEqual(
    visualOutcome.status,
    DRIVE_STATUS.VISUAL_ONLY,
    "disabling delayed mutation handling with visual delta yields VISUAL-ONLY",
  );
});

if (failures > 0) {
  console.error(`\ndrive effect tests: ${failures} section(s) failed`);
  Deno.exit(1);
}
console.log("\ndrive effect tests: all sections passed");
