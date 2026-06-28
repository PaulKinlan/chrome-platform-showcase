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
3. Browser work must use `chrome-devtools-mcp` only. If it is unavailable in this session or a
   subagent, mark that browser pass blocked; do not substitute Playwright, the in-app browser, or
   generic browser automation.
4. Critique pass: skip concepts that already have sibling `_questions.json`; use
   `chrome-devtools-mcp` to click/type/drag every visible control, inspect console/network state,
   check the relevant `/conformance/` route, and write files matching
   `v149/css-gap-decorations/rule-builder/_questions.json`.
5. Conformance pass: **only create suites for features that lack one — never overwrite, regenerate,
   or edit an existing `conformance.json`** (its assertions are the immutable spec contract; fix the
   demo to pass, never the test). Write new files matching
   `v149/css-gap-decorations/conformance.json`, then open the suite's `/conformance/` route with
   `chrome-devtools-mcp` to verify the assertions execute. When a failure is from a pre-existing
   suite, repair the demo — do not touch the suite.
6. Commit and push each generated JSON file on its own. Stage only that file; never use `git add -A`
   inside the fan-out.
7. After the batch, run `deno fmt`, `deno check server.ts`, and commit/push only relevant formatting
   changes.
8. Report commits, pushed refs, routes to inspect (`/critiques`, `/conformance`), exact browser
   verification evidence, and any blocked milestones.
