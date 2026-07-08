# Auto-research, conformance & goal-setting — operator manual

> How the self-critique loop, the spec-conformance probes, and the goal-setting feedback work, and
> exactly how to re-run them. This is a **manual, local-session** workflow — it is NOT part of the
> remote routine (the routine is fenced out of top-level files and only builds `v<N>/`). Run it from
> `/home/paulkinlan/chrome-platform-showcase/` when you want to grade and harden the corpus.

Inspired by Karpathy's "auto research" idea: the system reviews its own output, writes down what's
missing, and turns those gaps into the next batch of work. Three moving parts:

1. **Auto-research (self-critique)** — a reviewer agent tests each concept page in the browser,
   grades it against a rubric, and writes open questions to disk.
2. **Conformance** — per-feature assertion suites that run client-side, so each browser sees its own
   live pass/fail against what the spec actually promises.
3. **Goal-setting** — the open questions from step 1 become the work-list for the next build pass.
   The loop closes: build → critique → questions → build the answers → re-critique.

All three are **file-on-disk, no database**. Everything is browsable on the live site and
recoverable by re-reading the files.

## 0. Browser testing contract

All browser work in this workflow must use `chrome-devtools-mcp` only. Do not substitute Playwright,
the Codex in-app browser, static screenshots, or generic browser automation. Chrome Canary is
acceptable and preferred when the target milestone likely needs a newer implementation. If
`chrome-devtools-mcp` is unavailable, stop the browser portion, write down that blocker, and do not
claim the page was browser-tested.

For every concept critique or user-reported fix, the reviewer must capture concrete evidence:

- browser/channel and URL tested;
- every visible control clicked, typed into, dragged, or toggled;
- observed DOM/readout/state changes for each interaction;
- accessibility evidence: keyboard path, visible focus, accessible names/labels, role/state for
  custom controls, and Chrome DevTools accessibility tree observations where state is visual-only,
  canvas/SVG-backed, or ARIA-backed;
- console errors and failed network requests;
- unsupported/flag-gated fallback behavior, separated from actual runtime failures;
- the relevant `/conformance/` route result.

A page load without exercising the controls is not a critique. A passing conformance rollup without
testing the changed concept UI is not enough evidence for a bug fix.

Live probes are only evidence when they test the actual feature contract. Do not accept or generate
generic probe panels that check broad baseline surfaces like `CSS.supports`, `customElements`,
`navigator.gpu`, `ReadableStream`, or "baseline DOM APIs" unless that surface is the feature being
demonstrated. CSS probes must use the exact property/value/selector/at-rule and, where possible,
verify an observable computed style, layout measurement, active state, or before/after rendering.
API probes must check the exact constructor/member and make a real, safe call when the API contract
requires one. HTTP/header/cache/redirect probes must use a real `server.ts` route and surface
status, headers, and body. If the behavior is visual, OS-specific, hardware-specific, or
policy-gated and cannot be directly observed, record it as a manual observation or unsupported
fallback, not as a live probe.

---

## 1. Data models & file locations

Two tiny type files define the on-disk shapes. Read them before changing anything:

- `lib/critique.ts` — `CritiqueReport` (the rubric + open questions). Helpers `critiqueFilePath()`
  and `scoreVerdicts()` (pass=1, partial=0.5, fail=0; `n/a` excluded).
- `lib/conformance.ts` — `ConformanceSuite` (list of `ConformanceAssertion`). Helper
  `conformanceFilePath()`.

File paths (both follow the same convention):

```
v<N>/<feature-slug>/_questions.json              feature-level critique
v<N>/<feature-slug>/<concept-slug>/_questions.json   per-concept critique  ← the common one
v<N>/<feature-slug>/conformance.json             feature-level conformance suite
v<N>/<feature-slug>/<concept-slug>/conformance.json  per-concept suite (rare)
```

Reference examples to copy from:

- Critique: `v149/css-gap-decorations/rule-builder/_questions.json`
- Conformance: `v149/css-gap-decorations/conformance.json`

---

## 2. How the site surfaces them

`server.ts` walks the `v<N>/` tree at request time — no build step, no index file. Routes:

| Route                                                                       | Renders                                                              |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `/critiques`                                                                | rollup table of every `_questions.json`, scored, sorted worst-first  |
| `/v<N>/<feature>/critique/` and `/v<N>/<feature>/<concept>/critique/`       | one critique detail page                                             |
| `/conformance`                                                              | rollup of every `conformance.json` and its assertion count           |
| `/v<N>/<feature>/conformance/` and `/v<N>/<feature>/<concept>/conformance/` | runs the suite **in the visitor's browser** and shows live pass/fail |

Relevant functions: `collectCritiques()`, `renderCritiquesIndex()`, `renderCritiqueDetail()`,
`collectConformanceSuites()`, `renderConformanceIndex()`, `renderConformancePage()`. The client-side
assertion runner is the `<script>` at the bottom of `renderConformancePage()`.

These routes need zero maintenance — drop a JSON file next to a page and it appears.

---

## 3. The critique rubric (what the reviewer grades)

Six criteria, each a `Verdict` of `pass | partial | fail | n/a` with a one-sentence rationale:

| Criterion         | Question                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `spec_match`      | Does the demo actually demonstrate what the spec promises (not just the easy subset)?               |
| `interactive`     | Is the surface real (controls / live readout / API call), not a styled code-card?                   |
| `blurb_alignment` | Does the feature-index blurb match what the page delivers and the spec's framing?                   |
| `edge_cases`      | Are failure modes / edge cases covered, or only the happy path?                                     |
| `references`      | Does the page cite `chromestatus.com/feature/<id>`? (invariant #3)                                  |
| `design_system`   | CSS variables / WCAG AA / button bg+color override / no static card? (invariants 5–7)               |
| `accessibility`   | Keyboard path, accessible names/labels, semantic roles/states, visible focus, and non-visual state? |

The valuable output is **`openQuestions`** — each is a work item with `title`, `detail`, optional
`severity` (`minor`/`moderate`/`major`) and optional `suggestedSlug` (the slug to use if the answer
is "build a new concept page"). Empty list = the page clears the bar.

---

## 4. The conformance assertion kinds

Each suite is 3–10 assertions. Five `kind`s, all run client-side (see `lib/conformance.ts` and the
runner in `server.ts`):

| kind           | `test` is…                                  | passes when                                                    |
| -------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `css-supports` | a `"prop: value"` declaration               | `CSS.supports(test)` is true                                   |
| `exists`       | a dotted global path, e.g. `navigator.gpu`  | the path resolves to something defined                         |
| `typeof`       | a dotted path; `expect` = `"function"` etc. | `typeof <path> === expect`                                     |
| `script`       | a JS expression (IIFE ok)                   | the expression is truthy (throwing = fail)                     |
| `throws`       | a JS expression                             | the expression throws (used for "this is now removed/blocked") |

Optional fields: `specSection` (adds a link), `expectedBrowsers` (parity claim for a future
cross-browser matrix job). Assertions should cover the **distinct contracts the spec text makes**,
not one big "does it exist" check.

---

## 5. Re-running the passes (the orchestration)

This is a fan-out: one subagent per milestone, each looping over that milestone's concept pages.
Launch them with the `Agent` tool, `run_in_background: true`. Each subagent must use
`chrome-devtools-mcp` for browser work; if the MCP is not exposed to that subagent, that milestone's
browser pass is blocked rather than downgraded to a different browser tool. Coverage as of
2026-06-01 is in the "current state" section below — target the gaps, don't redo what exists.

### Per-subagent prompt skeleton (critique pass)

> You are a reviewer for chrome-platform-showcase at `/home/paulkinlan/chrome-platform-showcase`.
> For milestone **v<N>**, walk every concept page (`v<N>/<feature>/<concept>/index.html`). **Skip
> any page that already has a sibling `_questions.json`** — idempotent resume. For each remaining
> page: read its HTML, read the feature index, fetch `chromestatus.com/api/v0/features/<id>` (strip
> the `)]}'` prefix) and the spec if linked. Start the local server (`deno task start`) in the
> background, then use `chrome-devtools-mcp` to navigate to the concept page and test its actual
> interactivity/changes in Chrome or Chrome Canary. Click/type/drag every visible control, verify
> the live DOM/readout changes after each interaction, inspect console and network logs, and open
> the feature or concept `/conformance/` route. Record the tested URL, browser/channel, exercised
> controls, console/network result, and conformance route in the critique summary or rationale.
> Reject any "live probe" that checks unrelated baseline APIs instead of the feature's actual CSS,
> IDL, media, or server contract. The probe and the conformance assertions should agree on the same
> observable behavior. **Browser version exception**: Milestone `v<N>` might represent a future
> release (e.g., `v150` Canary) that is newer than the browser environment you are running. If the
> API is missing or fails feature-detection because the browser is too old, **do not fail the page
> or the run**. Instead, verify that the page has capability detection and displays a clean,
> friendly fallback warning or a behind-a-flag note rather than completely crashing, throwing
> unhandled exceptions, or rendering a broken blank screen. Do not score the page as `fail` on the
> rubric solely due to lack of browser support, as long as this fallback behavior is correctly
> implemented. Score the seven-criterion rubric in `lib/critique.ts` honestly, including
> `accessibility`: keyboard operation, accessible names/labels, semantic roles/states, visible
> focus, and accessibility tree/ARIA/live-region evidence where relevant. Partial/fail are useful,
> don't inflate. Write the `CritiqueReport` JSON to `v<N>/<feature>/<concept>/_questions.json`. Use
> the exact shape of `v149/css-gap-decorations/rule-builder/_questions.json`. Commit and push **each
> file on its own** with a single bash call:
> `git add <file> && git commit -m "critique: v<N>/<feature>/<concept>" && git push` (see the race
> note below). Keep `reviewer` set to your subagent id.

### Per-subagent prompt skeleton (conformance pass)

> Same setup. For milestone **v<N>**, for each feature **without** a `conformance.json`, read the
> spec, derive 3–10 assertions covering the distinct contracts (use the kinds in
> `lib/conformance.ts`), and write `v<N>/<feature>/conformance.json` matching
> `v149/css-gap-decorations/conformance.json`. Real `css-supports` declarations and real global
> paths only — never invent an API name. Before committing, run the feature's `/conformance/` route
> with `chrome-devtools-mcp` and verify that the assertions execute in the browser, even if future
> or flag-gated assertions fail with a clean unsupported state. Commit+push each file with one bash
> call.

### Race note (this WILL bite you)

Sibling agents share one working tree. `git pull --rebase --autostash` sweeps another agent's
untracked file into an unrelated commit, and concurrent stashes corrupt each other. **Mitigation:
one bash call per file** — `git add <file> && git commit -m … && git push` — so the window between
add and commit is minimal, and never `git add -A`. If a push races, the agent should
`git pull --rebase` and retry the push only (its file is already committed).

### Verify after every pass

```bash
deno fmt        # NOT --check — see fmt gotcha below; this normalises the new JSON
deno check server.ts
git add -A && git commit -m "fmt" && git push   # if fmt changed anything
```

---

## 6. The goal-setting loop (closing the cycle)

The point of the critiques is to **drive the next build pass**. To turn open questions into work:

1. Read `/critiques` (or grep the files) for `openQuestions` with `severity: major` / `moderate`
   first.
2. Questions with a `suggestedSlug` → build that new concept folder under the feature
   (`v<N>/<feature>/<suggestedSlug>/index.html`), following the normal build rules in
   `routine-prompt.md` (interactive only, CSS variables, WCAG AA, chromestatus link).
3. Questions without a slug → improve the existing concept page in place (add the edge case, surface
   the missing spec capability, fix the blurb).
4. After answering, **delete or regenerate** that page's `_questions.json` and re-run the critique
   so the score reflects the fix. The loop is: build → critique → answer questions → re-critique.
5. **Do NOT edit the feature/concept `conformance.json`.** Its assertions are the immutable spec
   contract — fix the page so they pass, don't change the test to match the page. (You may only
   _create_ a suite for a feature that has none; never overwrite an existing one.) If the fix
   exposes an assertion that is genuinely wrong, stop and flag it for a human with the assertion id
   rather than changing it.
6. Use `chrome-devtools-mcp` to reproduce the old issue and verify the repaired page before closing
   the question. Record the exact controls and observations in the new critique summary.

This is the "research sets its own goals" half of the Karpathy idea: the corpus tells you where it's
weakest (worst-scored pages float to the top of `/critiques`) and hands you a concrete to-do list.

A natural cadence: run a critique sweep, spend a session answering the `major`/`moderate` questions,
re-critique only the touched milestones, repeat.

---

## 7. Current state (snapshot 2026-06-01)

Coverage per milestone (`features` = folders, then `_questions.json` / `conformance.json` counts):

```
v130 26  crit 47  conf 10      v141 26  crit 111 conf 26
v131 37  crit 57  conf 12      v142 23  crit 17  conf 23
v132 40  crit 176 conf 30      v143 27  crit 34  conf 26
v133 39  crit 11  conf 39      v144 43  crit 176 conf 42
v134 28  crit 15  conf 28      v145 40  crit 147 conf 36
v135 41  crit 21  conf 38      v146 28  crit 22  conf 27
v136 37  crit 30  conf 37      v147 41  crit 201 conf 12
v137 23  crit 32  conf 23      v148 42  crit 104 conf 42
v138 33  crit 8   conf 33      v149 43  crit 29  conf 43
v139 34  crit 140 conf 29      v150 45  crit 9   conf 33
v140 29  crit 42  conf 2       v151 13  crit 36  conf 13
```

(`crit` counts per-concept files, so it can exceed the feature count — multiple concepts per
feature. `conf` is mostly feature-level, so it tops out near the feature count.)

**Thinnest critique coverage** (re-run these first): v138, v150, v133, v134, v142. **Thinnest
conformance coverage**: v140 (2!), v130, v131, v147, v150.

### Known gotchas

- **API quota.** A full 22-milestone fan-out is ~44 subagents and will exhaust the extra-usage
  quota. On 2026-06-01 ~13 subagents bricked with "out of extra usage". Run in smaller batches (4–6
  milestones) and watch the quota, or accept that a sweep takes multiple sessions. Because the
  passes are idempotent (skip-if-file-exists), re-launching after a reset just fills the gaps.
- **fmt exclude doesn't catch the JSON.** `deno.json`'s `fmt.exclude` has `v[0-9]*/**/*.json` but it
  does not reliably match `_questions.json` / `conformance.json`, so freshly-written files trip
  `deno fmt --check`. Don't fight it — just run plain `deno fmt` after a pass to normalise them,
  then commit. (If you want a real fix: investigate why the glob misses these names, or add explicit
  `**/_questions.json` + `**/conformance.json` patterns and confirm `--check` goes green.)
- **Stream watchdog stalls.** Long-running subagents occasionally stall with "no progress for 600s".
  Relaunch with the same skip-if-exists prompt; it resumes from where it stopped.
