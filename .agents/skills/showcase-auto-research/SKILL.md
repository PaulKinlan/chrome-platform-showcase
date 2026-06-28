---
name: showcase-auto-research
description: Run chrome-platform-showcase auto-research, conformance, and goal-setting workflows. Trigger when the user asks to run showcase auto research, critique demos, generate conformance suites, or turn critique open questions into demo work.
---

# Showcase Auto Research

Use this skill in `/home/paulkinlan/chrome-platform-showcase` to run the manual auto-research loop.
This is not the remote Claude routine.

## First Steps

1. Read `CLAUDE.md`, `AGENTS.md`, and `.claude/auto-research.md`.
2. Read `lib/critique.ts` for critique shape when writing `_questions.json`.
3. Read `lib/conformance.ts` for conformance shape when writing `conformance.json`.
4. Start from a current checkout:

```bash
git pull --rebase
git status --short
```

## Modes

Infer the mode from the user prompt:

- `critique`: write missing `_questions.json` files.
- `conformance`: write missing `conformance.json` files.
- `all` or `auto-research`: run a small critique + conformance batch.
- `goals` or `goal-setting`: fix one concrete open question and re-critique.

If the user provides milestones, use those. If not, use conservative defaults:

- Critique default: `v138`, `v150`
- Conformance default: `v140`, `v130`
- Goal-setting default: choose one actionable `major` or `moderate` open question.

Ask before launching more than six milestones or a full sweep; the operator manual calls out quota
risk for large fan-out runs.

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

## After Each Batch

Run:

```bash
deno fmt
deno check server.ts
git status --short
```

If `deno fmt` changed generated JSON, commit and push only those relevant formatting changes. Report
commits, pushed refs, routes to inspect (`/critiques`, `/conformance`), and any blocked milestones.
