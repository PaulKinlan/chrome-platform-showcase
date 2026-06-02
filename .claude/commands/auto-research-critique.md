---
description: Run the auto-research critique pass for selected Chrome milestones.
argument-hint: "[v138 v150 ...]"
---

Run the chrome-platform-showcase critique pass from the repository root.

Before doing work, read `CLAUDE.md`, `AGENTS.md`, `.claude/auto-research.md`, and `lib/critique.ts`.

Milestones from the user:

```text
$ARGUMENTS
```

If no milestones are supplied, use the current thinnest critique coverage batch from the operator
manual: `v138`, `v150`, `v133`, `v134`.

For each milestone:

1. Walk every concept page at `v<N>/<feature>/<concept>/index.html`.
2. Skip any page that already has a sibling `_questions.json`.
3. Read the concept page, the feature `index.html`, the ChromeStatus detail, and the linked spec
   where available.
4. Score the six-field rubric in `lib/critique.ts` honestly.
5. Write `v<N>/<feature>/<concept>/_questions.json` using
   `v149/css-gap-decorations/rule-builder/_questions.json` as the exact shape.
6. Commit and push each generated `_questions.json` on its own:
   `git add <file> && git commit -m "critique: v<N>/<feature>/<concept>" && git push`.

Use subagents if available, one per milestone, with at most four running at once. If a push races,
pull/rebase and retry the push for the already-created commit. After the pass, run `deno fmt` and
`deno check server.ts`; commit/push relevant formatting changes only.
