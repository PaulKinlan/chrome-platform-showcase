---
description: Use critique open questions to drive the next concrete demo improvement.
argument-hint: "[v<N>/<feature>/<concept> | major | moderate]"
---

Run the chrome-platform-showcase goal-setting loop from the repository root.

Before doing work, read `CLAUDE.md`, `AGENTS.md`, `.claude/auto-research.md`, and
`.claude/routine-prompt.md`.

Target from the user:

```text
$ARGUMENTS
```

If no target is supplied, inspect `_questions.json` files and choose the highest-priority actionable
`major` or `moderate` open question. Prefer work that is concrete, scoped to one feature, and can be
verified in this session.

Goal-setting loop:

1. Read `/critiques` via the local server if it is already running, or grep/read `_questions.json`
   files directly.
2. Pick the top actionable open question.
3. If it has `suggestedSlug`, build that new interactive concept folder under the feature.
4. If it has no `suggestedSlug`, improve the existing concept page in place.
5. Follow `.claude/routine-prompt.md`: interactive only, CSS variables, WCAG AA, chromestatus link,
   and every distinct use case covered.
6. Delete or regenerate the touched page's `_questions.json`, then re-run critique for that touched
   page or milestone so the score reflects the fix.
7. Run relevant checks: at minimum `deno fmt --check`, `deno check server.ts`, and a local smoke
   test when routes or shared rendering changed.
8. Commit and push the fix and updated critique separately when practical.

Do not start a broad rewrite. Ship one coherent answer to the critique, then report the fixed
question, touched files, checks, commit, and URL to inspect.
