---
name: showcase-auto-research
description: Audit chrome-platform-showcase coverage, build missing demos, and run critique, conformance, validation, and goal-setting workflows. Trigger when the user asks to run showcase auto research, fill demo-pending releases, critique demos, generate conformance suites, validate demos, or turn critique open questions into demo work.
---

# Showcase Auto Research

Use this skill in `/home/paulkinlan/chrome-platform-showcase` to run the manual auto-research loop.
This is not the remote Claude routine.

## First Steps

1. Read `CLAUDE.md`, `AGENTS.md`, `.claude/routine-prompt.md`, and `.claude/auto-research.md`.
2. Read `lib/chromestatus.ts` and the milestone renderer in `server.ts` so coverage uses the same ChromeStatus listing and slug rules as the site.
3. Read `lib/critique.ts` for critique shape when writing `_questions.json`.
4. Read `lib/conformance.ts` for conformance shape when writing `conformance.json`.
5. Start from a current checkout:

```bash
git pull --rebase
git status --short
```

## Modes

Infer the mode from the user prompt:

- `coverage`, `pending`, or `build`: inventory the milestone and build missing feature and uber demos.
- `critique`: write missing `_questions.json` files for demos that exist.
- `conformance`: write missing `conformance.json` files for features that exist.
- `all` or `auto-research`: **coverage/build first**, then critique and conformance. Never treat critique + conformance coverage as release coverage.
- `validate`: exercise every implemented concept and conformance route in the requested scope.
- `goals` or `goal-setting`: fix one concrete open question and re-critique.

If the user provides milestones, use those. If not:

- Coverage/build and `all`: inspect the newest two tracked milestones and select those with pending demos. At the time of execution, derive this from ChromeStatus and the rendered milestone pages; do not rely on hard-coded milestone numbers.
- Critique fallback, only when the newest releases have no pending demos: `v138`, `v150`.
- Conformance fallback, only when the newest releases have no pending demos: `v140`, `v130`.
- Goal-setting: choose one actionable `major` or `moderate` open question.

Ask before launching more than six milestones or a full sweep; the operator manual calls out quota
risk for large fan-out runs. A request for “all demos” or a “full sweep” is already authorization.

## Mandatory Coverage And Build Pass

Run this pass before critique or conformance in `all` / `auto-research` mode.

### Build the coverage inventory

For each target milestone:

1. Fetch the ChromeStatus milestone listing used by the server. Use `features_by_type` membership for the milestone; never infer the milestone from a feature detail response.
2. Deduplicate cards by ChromeStatus feature ID. A feature can appear in more than one status section, but one implementation satisfies that feature ID.
3. Derive each slug from the milestone listing name with the same slug function as `server.ts`. Do not use the feature-detail name.
4. Compare the complete unique feature-ID set with disk and with the rendered milestone page:
   - implemented feature: `v<N>/<slug>/index.html` exists and the milestone card links to `/v<N>/<slug>/`;
   - pending feature: the card links only to ChromeStatus, says `demo pending`, or the canonical feature folder/index is absent;
   - incomplete feature: the feature index exists but has no interactive concept pages, lacks the mandatory ChromeStatus link, or only contains static code/reference cards;
   - pending uber demo: `/v<N>/uber-demo/index.html` is absent or the milestone page says it has not been built.
5. Print and preserve an exact inventory before building:

```text
v<N> unique tracked features: <total>
implemented: <implemented>
pending: <pending>
incomplete: <incomplete>
uber demo: implemented | pending
```

The denominator is the unique ChromeStatus feature-ID set, not the number of folders already on disk. Never report a milestone as complete after inspecting only implemented folders.

### Build every pending item in scope

For each pending or incomplete feature:

1. Read `.claude/routine-prompt.md`, the milestone listing entry, ChromeStatus detail, linked spec, and existing neighboring demos.
2. Build `v<N>/<canonical-slug>/index.html` plus interactive concept pages for **every distinct use case**. Two or three concepts are a floor, not a cap.
3. Follow all project invariants: real interaction, exact feature probes, graceful unsupported/flag/device fallbacks, CSS variables, WCAG AA, keyboard/accessibility semantics, and a `chromestatus.com/feature/<id>` link on every page.
4. For HTTP/header/cache/redirect behavior, add the required server route as a manual top-level change; do not fake the contract in client-side text.
5. Use `chrome-devtools-mcp` on every new concept. Exercise every visible control, inspect the accessibility tree where needed, inspect console/network/telemetry, and verify the fallback path when the current browser lacks the feature.
6. **Visually inspect the rendered result, not only DOM text or console state.** Capture a full-page screenshot before and after the primary interaction at desktop width, plus a mobile screenshot when layout changes. Reject pages with detached popovers, wrong float/shape sides, text crossing shapes, gradient/content bleed, clipped controls, unreadable code, low contrast, overlap, or an unsupported fallback that looks like the feature worked.
7. For text and code surfaces, inspect computed foreground/background colors and run a contrast audit. A clean console does not make unreadable output valid.
8. Commit and push one feature at a time, staging only that feature and any route code it requires:

```bash
git add v<N>/<feature>/ server.ts && git commit -m "add v<N> <feature> demos" && git push
```

Omit `server.ts` when it was not changed. Build the uber demo after the per-feature batch and commit it separately.

### Prove the coverage gap closed

After building, regenerate the inventory from ChromeStatus, disk, and the rendered local milestone page. A target milestone is complete only when:

- every unique tracked feature ID maps to its canonical local demo link;
- no card says `demo pending` or links only to ChromeStatus because its demo is absent;
- each feature has interactive concept coverage and the mandatory ChromeStatus reference;
- the requested uber demo exists;
- local routes return 200 and were exercised through `chrome-devtools-mcp`;
- desktop/mobile screenshots show correct geometry, anchoring, clipping, fallback rendering, and readable contrast;
- after push/deploy, the live `/v<N>/` page links every implemented card locally and no longer labels those cards `demo pending`. If deployment has not updated yet, report `live verification: deployment pending` rather than claiming the live gap is closed.

If time or quota stops the batch, report `implemented/total` and list every remaining feature ID + canonical slug. Do not say “complete,” “clean,” or “all” when pending items remain.

## Critique Pass

For each target milestone:

1. Walk every concept page at `v<N>/<feature>/<concept>/index.html`.
2. Skip pages that already have sibling `_questions.json`.
3. Read the concept page, feature index, ChromeStatus detail, and linked spec where possible.
4. Score the rubric in `lib/critique.ts` honestly; `partial` and `fail` are useful.
5. Write `v<N>/<feature>/<concept>/_questions.json` matching
   `v149/css-gap-decorations/rule-builder/_questions.json`.
6. Commit and push each generated file on its own with one shell command:

```bash
git add <file> && git commit -m "critique: v<N>/<feature>/<concept>" && git push
```

## Conformance Pass

For each target milestone:

1. Walk feature folders at `v<N>/<feature>/`.
2. Skip features that already have `conformance.json`. **Never overwrite, regenerate, or edit an
   existing suite** — assertions are an immutable spec contract; you only ever _create_ missing
   ones. A failing assertion means fix the demo, not the test; flag a genuinely-wrong assertion for
   a human.
3. Read the feature page, concept pages, ChromeStatus detail, and linked spec where possible.
4. Write 3-10 assertions covering distinct spec contracts.
5. Use only real `css-supports`, `exists`, `typeof`, `script`, or `throws` checks. Do not invent API
   names.
6. Write `v<N>/<feature>/conformance.json` matching `v149/css-gap-decorations/conformance.json`.
7. Commit and push each generated file on its own with one shell command:

```bash
git add <file> && git commit -m "conformance: v<N>/<feature>" && git push
```

## Validation Pass

A validation request is exhaustive within its stated scope unless the user explicitly asks for sampling.

1. Build an exact route manifest from disk for every `v<N>/<feature>/<concept>/index.html` in scope. Report `tested/total`; never call a sample a full sweep.
2. Open every concept through `chrome-devtools-mcp`, exercise every visible control, and run its feature/concept conformance route.
3. Capture and inspect screenshots. Automated clicks, DOM snapshots, and console logs cannot detect wrong visual anchoring, float geometry, overlap, bleed, or contrast on their own.
4. Treat capability/version messages as claims that need proof. Detect the exact API/property/value; do not tell a Chrome 150 user to “upgrade to 146” or equate a missing flag, origin trial, language pack, hardware capability, or permission with an old browser.
5. For unsupported APIs, verify that the fallback is visually coherent and names the exact missing capability and selected inputs (for example, language, quality tier, permission, or device requirement).
6. Save per-route results. A milestone is complete only when `tested === total`; list timeouts and blocked/device-only routes separately.
7. For every confirmed bug, reproduce the exact live URL before editing, fix the demo rather than immutable conformance assertions, re-test adjacent controls, regenerate the concept critique, and capture the repaired screenshot.

## Goal-Setting Pass

Use critique output as the work list:

1. Read `/critiques` if the local server is running, or inspect `_questions.json` files directly.
2. Prioritize `major` and `moderate` `openQuestions`.
3. If an item has `suggestedSlug`, build that new interactive concept folder.
4. If it has no `suggestedSlug`, improve the existing concept page in place.
5. Follow `.claude/routine-prompt.md`: interactive only, CSS variables, WCAG AA, chromestatus link,
   and comprehensive concept coverage.
6. Delete or regenerate the touched page's `_questions.json`.
7. Re-run critique for the touched page or milestone so the score reflects the fix.

Default to one coherent fix per invocation unless the user explicitly asks for a batch.

## Parallelism And Git Safety

Use subagents or background threads if available, one per milestone, with at most four running at
once. If subagents are unavailable, process milestones serially.

Sibling agents share one working tree. Stage only the file being committed; do not use `git add -A`
inside the fan-out. If a push races, pull/rebase and retry the push for the already-created commit.

## Completion Rules

Do not use critique counts or conformance counts as evidence that a release's demos are implemented. These are separate axes:

```text
coverage: <implemented>/<unique tracked> feature demos; uber: implemented | pending
critique: <reports>/<implemented concepts>
conformance: <suites>/<implemented features>
validation: <exercised>/<implemented concepts>
```

For `all`, report all four axes. A no-op is valid only when coverage has zero pending/incomplete features, the uber demo exists, and critique/conformance have no gaps. Check the rendered `/v<N>/` page itself before making that claim.

## After Each Batch

Run:

```bash
deno fmt
deno check server.ts
git status --short
```

If `deno fmt` changed generated JSON, commit and push only those relevant formatting changes. Report:

- coverage before and after (`implemented/unique tracked`, incomplete, uber status);
- every built feature and commit;
- critique, conformance, and validation counts with their own denominators;
- pushed refs and routes to inspect (`/v<N>/`, `/critiques`, `/conformance`);
- every pending feature or blocked milestone.

The final check is visual and literal: open each target `/v<N>/` page and confirm there are no `demo pending` cards left in the requested scope.
