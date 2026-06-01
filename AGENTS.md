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
```

`deno fmt` intentionally excludes HTML, CSS, and generated demo JSON/JS. Do not mass-format demo
HTML or CSS unless the task specifically requires it.

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
- If a local rule changes a `button` background, also set `color`; the global button style sets
  both.
- Concept pages must be genuinely interactive. Do not ship static code cards. Use real controls,
  live output, feature detection, graceful fallback, and server routes where HTTP/header behavior is
  the feature.
- Build every distinct use case identified for an API. Two or three concepts is a floor, not a cap.
- Automated routine-style work should normally stay inside `v<N>/`. Top-level files are only edited
  for explicit maintenance tasks, route support, shared fixes, or user-directed changes.

## Demo Quality

Each concept should demonstrate a distinct API surface, real-world use case, failure mode, or edge
case. For removals and deprecations, pair detection with a working replacement pattern. For origin
trial, flag-gated, OS-specific, or device-specific features, show capability detection and a useful
fallback rather than skipping the interaction.

For HTTP, header, MIME, cache, redirect, or negotiation features, wire the relevant route in
`server.ts` and have the concept page fetch it and surface status, headers, and body in-page.

## Auto-Research, Conformance, And Goal-Setting

The self-critique and conformance workflow is manual/local-session work, not part of the remote
routine. Read `.claude/auto-research.md` before running it; this section is the short operational
version for other agents.

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
changes/interactivity in the browser (using a browser subagent or devtools). Verify that the page is
robust and check its `/conformance/` page. If the browser being used is older than the target
milestone `v<N>` (e.g. testing `v150` Canary on an older Chrome version), do not fail the page or
the run solely because the API is unsupported. Instead, verify that capability detection works and
the page degrades gracefully with a clean fallback warning/banner rather than completely failing,
rendering a blank screen, or throwing uncaught console crashes. Score the six rubric fields in
`lib/critique.ts` honestly. The most important output is `openQuestions`, with `severity` and
`suggestedSlug` when a new concept page should be built.

For a conformance pass, skip features that already have `conformance.json`. Write 3-10 assertions
covering distinct spec contracts. Use only real `css-supports`, `exists`, `typeof`, `script`, or
`throws` checks; do not invent API names or broad "exists" checks that miss the actual contract.

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
- If escaping, route rendering, or `/features` changed, inspect quoted text in attributes and verify
  no injected markup escapes the expected tree.
- If `public/styles.css` changed, check a mobile-width page and at least one existing demo for
  layout and contrast regressions.
