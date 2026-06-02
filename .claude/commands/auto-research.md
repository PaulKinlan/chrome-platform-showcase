---
description: "Run a small auto-research batch: critique, conformance, and a goal-setting summary."
argument-hint: "[critique|conformance|all] [v138 v150 ...]"
---

Run the chrome-platform-showcase auto-research workflow from the repository root.

Before doing work, read `CLAUDE.md`, `AGENTS.md`, and `.claude/auto-research.md`.

Arguments from the user:

```text
$ARGUMENTS
```

Interpret the arguments this way:

- No arguments: run a conservative default batch:
  - critique: `v138`, `v150`
  - conformance: `v140`, `v130`
  - goal-setting: summarize the highest-priority `major` / `moderate` open questions after the
    batch.
- `critique v<N>...`: run only the critique pass for those milestones.
- `conformance v<N>...`: run only the conformance pass for those milestones.
- `all v<N>...`: run critique and conformance for those milestones.
- More than six milestones, or `full`: confirm with Paul before launching; full fan-out is
  quota-heavy.

Operational rules:

1. Start with `git pull --rebase` and confirm the worktree state.
2. Use subagents if available, one per milestone, with at most four running at once. If subagents
   are unavailable, process the batch serially.
3. Critique pass: skip concepts that already have sibling `_questions.json`; write files matching
   `v149/css-gap-decorations/rule-builder/_questions.json`.
4. Conformance pass: skip features that already have `conformance.json`; write files matching
   `v149/css-gap-decorations/conformance.json`.
5. Commit and push each generated JSON file on its own. Stage only that file; never use `git add -A`
   inside the fan-out.
6. After the batch, run `deno fmt`, `deno check server.ts`, and commit/push only relevant formatting
   changes.
7. Report commits, pushed refs, routes to inspect (`/critiques`, `/conformance`), and any blocked
   milestones.
