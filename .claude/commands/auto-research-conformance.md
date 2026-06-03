---
description: Run the auto-research conformance pass for selected Chrome milestones.
argument-hint: "[v140 v130 ...]"
---

Run the chrome-platform-showcase conformance pass from the repository root.

Before doing work, read `CLAUDE.md`, `AGENTS.md`, `.claude/auto-research.md`, and
`lib/conformance.ts`.

Milestones from the user:

```text
$ARGUMENTS
```

If no milestones are supplied, use the current thinnest conformance coverage batch from the operator
manual: `v140`, `v130`, `v131`, `v147`.

For each milestone:

1. Walk feature folders at `v<N>/<feature>/`.
2. Skip any feature that already has `conformance.json`.
3. Read the feature page, concepts, ChromeStatus detail, and linked spec where available.
4. Derive 3-10 assertions covering distinct spec contracts. Use only real `css-supports`, `exists`,
   `typeof`, `script`, or `throws` checks; do not invent API names.
5. Write `v<N>/<feature>/conformance.json` using `v149/css-gap-decorations/conformance.json` as the
   exact shape.
6. Start the local server and use `chrome-devtools-mcp` only to open the feature's `/conformance/`
   route and confirm the assertions execute in-browser. Use Chrome Canary when useful for future
   milestones. If `chrome-devtools-mcp` is unavailable, mark the browser verification blocked and do
   not substitute another browser tool.
7. Commit and push each generated `conformance.json` on its own:
   `git add <file> && git commit -m "conformance: v<N>/<feature>" && git push`.

Use subagents if available, one per milestone, with at most four running at once. If a push races,
pull/rebase and retry the push for the already-created commit. After the pass, run `deno fmt` and
`deno check server.ts`; commit/push relevant formatting changes only.
