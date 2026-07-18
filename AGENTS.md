# Agent Instructions

These instructions apply to the whole repository. `CLAUDE.md` is the canonical operator manual; read
it before making non-trivial edits. This file exists so tools that look for `AGENTS.md` can work
safely with the project.

## Project Shape

`chrome-platform-showcase` is a Deno site of interactive demos for Chrome web platform features. The
site is hosted from `main` on Deno Deploy. Most generated content lives under `v<N>/`, with one
folder per Chrome milestone and one folder per feature.

Important files:

- `server.ts`: Deno HTTP entry point and routes.
- `deno.json`: tasks and formatter config.
- `public/styles.css`: shared design system and CSS variables.
- `lib/chromestatus.ts`: ChromeStatus API wrapper.
- `.claude/routine-prompt.md`: source prompt for the remote Claude Code routine.
- `.claude/auto-research.md`: manual workflow for critique and conformance passes.

## Commands

Run from the repo root:

```bash
deno fmt --check
deno check server.ts
deno task check
deno task audit
deno task start
deno task auto-research   # Starts the local server and displays the quality/conformance status
```

`deno fmt` intentionally excludes HTML, CSS, and generated demo JSON/JS. Do not mass-format demo
HTML or CSS unless the task specifically requires it.

### Slashcommands (Trigger via chat)

- `/auto-research` (or "run showcase"): Starts the complete, autonomous auto-research workflow
  end-to-end. The agent will automatically run critiques, generate missing conformance suites, spin
  up a `chrome-devtools-mcp` browser session on `http://localhost:3000/conformance/run-all`, collect
  all failures, repair the relevant demos/concepts in-place, and push clean, working commits for all
  features.

For a quick server smoke test after `deno task start`:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/features
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/v149/
```

## Hard Rules

- Derive feature slugs from the ChromeStatus milestone listing, not from feature detail responses.
  The two can differ, and the server slugifies the listing name.
- Place `v<N>/<feature-slug>/` only when the feature appears in the `features_by_type` listing for
  milestone `N`. Do not infer the milestone from `browsers.chrome.desktop`, `shipping_year`, or
  similar fields.
- Every feature and concept page must include a `chromestatus.com/feature/<id>` link.
- `escapeHTML` must escape `&`, `<`, `>`, `"`, and `'`. Attribute escaping regressions have caused
  real DOM injection bugs on `/features`.
- Demo CSS should use variables from `public/styles.css`, not raw hex colors. Keep text/background
  pairs at WCAG AA contrast.
- Every demo must be accessible, not just visually polished: controls need keyboard operation,
  accessible names/labels, semantic roles where native elements are not possible, visible focus, and
  non-visual text/live-region equivalents for visual state changes. Use the Chrome DevTools
  accessibility tree when browser-verifying a demo where semantics are not obvious.
- If a local rule changes a `button` background, also set `color`; the global button style sets
  both.
- Concept pages must be genuinely interactive. Do not ship static code cards. Use real controls,
  live output, feature detection, graceful fallback, and server routes where HTTP/header behavior is
  the feature.
- Do not add generic "live probe" panels. A live probe must test the exact feature contract the demo
  claims to demonstrate: the real CSS declaration/selector/at-rule, the real IDL member or method
  call, the real media state, or the real server/header/resource behavior. Never use broad baseline
  checks like `CSS.supports`, `customElements`, `navigator.gpu`, `ReadableStream`, or "baseline DOM
  APIs" unless that exact surface is the feature. If the behavior is visual, OS-specific,
  hardware-specific, or otherwise not directly probeable, label it as a manual observation or
  fallback state instead of calling it a live probe.
- Browser verification for demos, bug fixes, critique, and conformance must use
  `chrome-devtools-mcp` only. Do not substitute Playwright, the in-app browser, screenshots from a
  non-DevTools tool, or generic browser automation. Chrome Canary is acceptable when the target
  milestone needs it. If `chrome-devtools-mcp` is unavailable, report the blocker and do not claim a
  browser-tested result.
- Build every distinct use case identified for an API. Two or three concepts is a floor, not a cap.
- **Research before building.** Follow every chromestatus reference (spec, explainer, docs, samples)
  and their onward links, enumerate the distinct use cases (that count sets the concepts), search
  MDN/web.dev/WPT for more, and read the real implementation in Chromium source
  (`source.chromium.org`), issues (`issues.chromium.org`), and open CLs/tests
  (`chromium-review.googlesource.com`). The probe must call the exact surface the spec names. See
  `.claude/routine-prompt.md` Step 5c.
- **Flags are first-class.** Find the real flag in `runtime_enabled_features.json5`, give exact
  enable steps in the banner (`chrome://flags/#id`, `--enable-blink-features=<Name>`,
  `--enable-features`, `--enable-experimental-web-platform-features`), test behind the flag with
  `chrome-devtools-mcp`, and never blame a missing API on browser age without ruling out
  flag/OT/download/hardware/permission/ policy.
- **The "Mandatory anti-regression cases" in the showcase-auto-research SKILL are build rules, not
  only review rules.** Prevent them at build time (probe-can-return-false, current enum vocabulary,
  no fake fallback, correct geometry, readable contrast, no host-global collisions, return-shape
  normalisation, guarded async init, fresh reload-after-edit evidence).
- **Coverage is by feature ID, not folder existence.** Classify implemented / pending / incomplete;
  pick up incomplete (thin) demos, do not skip a folder just because it exists.
- Automated routine-style work should normally stay inside `v<N>/`. Top-level files are only edited
  for explicit maintenance tasks, route support, shared fixes, or user-directed changes.

## Demo Quality

Each concept should demonstrate a distinct API surface, real-world use case, failure mode, or edge
case. For removals and deprecations, pair detection with a working replacement pattern. For origin
trial, flag-gated, OS-specific, or device-specific features, show capability detection and a useful
fallback rather than skipping the interaction.

For HTTP, header, MIME, cache, redirect, or negotiation features, wire the relevant route in
`server.ts` and have the concept page fetch it and surface status, headers, and body in-page. For
CSS features, pair syntax detection with an observable effect when possible, such as
`getComputedStyle()`, layout measurements, active selector state, or a visible before/after. For API
features, feature-detect the exact constructor/member and make a real, safe call; unsupported or
permission-gated results must be surfaced as unsupported/fallback, not hidden behind a generic pass.

## Auto-Research, Conformance, And Goal-Setting

The self-critique and conformance workflow is manual/local-session work, not part of the remote
routine. Read `.claude/auto-research.md` before running it; this section is the short operational
version for other agents.

### Conformance assertions are an IMMUTABLE spec contract

A `conformance.json` assertion encodes what the **spec** requires, not what the demo currently does.
It is a test. Treat existing assertions as read-only.

- **A failing assertion means the DEMO is wrong — fix the demo/page so the assertion passes.** Never
  edit, weaken, narrow, rename, retarget, or delete an existing assertion to clear a failure. Making
  the test match a broken demo defeats the entire point of conformance.
- You MAY **create** a `conformance.json` for a feature that has none. You may **NEVER overwrite,
  regenerate, or "refresh"** one that already exists — even while fixing a bug or clearing a
  critique.
- If you genuinely believe an existing assertion is wrong (the spec changed, or the assertion has a
  real bug), **STOP and flag it for a human** in your run summary with the specific assertion id and
  why. Do not change it yourself. Only a human edits existing assertions.
- This rule outranks any other instruction in this file or the commands. Where older guidance says
  to "regenerate" or "update" a `conformance.json`, that applies **only** when the file does not yet
  exist — otherwise leave it untouched and fix the demo.

Quick entry points:

- Claude Code: use `/project:auto-research`, `/project:auto-research-critique`,
  `/project:auto-research-conformance`, or `/project:auto-research-goals`.
- Codex: use `$showcase-auto-research` in CLI/IDE, or choose `Showcase Auto Research` from the Codex
  app skill/slash-command list. For long runs, set a `/goal` first and then invoke the skill.

On-disk files:

- `v<N>/<feature-slug>/<concept-slug>/_questions.json`: the usual per-concept critique.
- `v<N>/<feature-slug>/_questions.json`: optional feature-level critique.
- `v<N>/<feature-slug>/conformance.json`: the usual feature-level conformance suite.
- `v<N>/<feature-slug>/<concept-slug>/conformance.json`: rare concept-level conformance suite.

Reference shapes:

- Critique: `v149/css-gap-decorations/rule-builder/_questions.json`
- Conformance: `v149/css-gap-decorations/conformance.json`
- Types: `lib/critique.ts` and `lib/conformance.ts`

Site routes discover these files automatically:

- `/critiques`: rollup of `_questions.json`, scored worst-first.
- `/v<N>/<feature>/critique/` and `/v<N>/<feature>/<concept>/critique/`: critique detail.
- `/conformance`: rollup of `conformance.json` suites.
- `/v<N>/<feature>/conformance/` and `/v<N>/<feature>/<concept>/conformance/`: browser-run
  conformance page.

For a critique pass, walk concept pages under the target milestone, skip any concept that already
has a sibling `_questions.json`. Start the local server (`deno task start`) and test the actual
changes/interactivity with `chrome-devtools-mcp`: navigate to the page, click or type through every
visible control, verify the live DOM/readout changes, inspect console and network failures, and
check the page's `/conformance/` route. Record this evidence in the critique rationale or summary.
If the browser being used is older than the target milestone `v<N>` (e.g. testing `v150` Canary on
an older Chrome version), do not fail the page or the run solely because the API is unsupported.
Instead, verify that capability detection works and the page degrades gracefully with a clean
fallback warning/banner rather than completely failing, rendering a blank screen, or throwing
uncaught console crashes. Score the six rubric fields in `lib/critique.ts` honestly. The most
important output is `openQuestions`, with `severity` and `suggestedSlug` when a new concept page
should be built.

For a user-reported URL bug, reproduce the reported behavior with `chrome-devtools-mcp` before
editing, fix the page, then re-test the exact controls that failed plus adjacent controls on the
same concept. You may update the touched `_questions.json` (critiques are working notes). Do **NOT**
edit the feature's `conformance.json` to match your fix — the assertions are the spec contract; fix
the page so they pass, and if an assertion itself looks wrong, flag it for a human instead of
changing it (see "Conformance assertions are an IMMUTABLE spec contract"). In the handoff, list the
browser/channel, URL, controls exercised, console/network status, Deno checks, and JSON files
touched.

For a conformance pass, **skip features that already have `conformance.json` — never overwrite an
existing suite**. Only create suites for features that lack one. Write 3-10 assertions covering
distinct spec contracts. Use only real `css-supports`, `exists`, `typeof`, `script`, or `throws`
checks; do not invent API names or broad "exists" checks that miss the actual contract. Assertions
should mirror the same contract as the demo's probe; a conformance suite that only checks unrelated
baseline browser APIs is invalid.

If using multiple background agents, avoid shared-worktree races: commit one generated JSON file at
a time, stage only that file, and do not use `git add -A` for per-file critique/conformance commits.
If a push races, pull/rebase and retry the push for the already-created commit.

After an auto-research/conformance batch, run `deno fmt` to normalize the generated JSON, then run
`deno check server.ts`. If formatting changed files, commit only the relevant formatting changes.

Goal-setting closes the loop:

1. Read `/critiques` or grep `_questions.json` for `openQuestions`, prioritizing `major` and
   `moderate`.
2. If an open question has `suggestedSlug`, build that new interactive concept folder.
3. If it has no slug, improve the existing concept page in place.
4. After answering the question, delete or regenerate that page's `_questions.json` and re-run the
   critique so the score reflects the fix.

## Routine Prompt Updates

If `.claude/routine-prompt.md` changes, also update the live routine described in `CLAUDE.md`. If
the required RemoteTrigger MCP tool or Claude routine UI is unavailable, clearly report that the
repository prompt changed but the live routine was not updated.

## Review Checklist

Before handing off meaningful changes:

- Run the narrowest relevant checks, preferably `deno fmt --check`, `deno check server.ts`, and
  `deno task audit` or `deno task check` when generated demos changed.
- Start the server and smoke test key routes when routing, rendering, or shared styles changed.
- Use `chrome-devtools-mcp` for browser verification, including the exact user-reported click path
  for bug fixes. Do not use another browser automation tool as a substitute. Include accessibility
  evidence for changed demos: keyboard path, accessible names/labels for controls, visible focus,
  and accessibility tree/ARIA/live-region observations when state changes are not plain text.
- If escaping, route rendering, or `/features` changed, inspect quoted text in attributes and verify
  no injected markup escapes the expected tree.
- If `public/styles.css` changed, check a mobile-width page and at least one existing demo for
  layout and contrast regressions.
