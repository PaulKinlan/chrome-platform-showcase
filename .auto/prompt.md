# Autoresearch: Chrome showcase accessibility validation

## Objective
Make accessibility validation a first-class success criterion in `chrome-platform-showcase` so every Chrome release demo is not only interactive and spec-aligned, but also demonstrably accessible. The project already has strong goals around real browser verification, conformance suites, critique reports, contrast, design-system use, and DevTools-backed testing. This session adds accessibility as an explicit project goal and validation layer.

The desired end state is not a keyword-only documentation update. A successful change should make future demo-building and review work ask, record, and enforce accessibility questions such as:

- Is the demo keyboard operable?
- Do buttons and controls have accessible names?
- Are form controls labelled?
- Are live results exposed in a way assistive tech can observe, for example via `aria-live`, semantic output, or clear text updates?
- Are screenshots/visual-only states backed by text alternatives or DOM state?
- Does Chrome DevTools-based verification include the accessibility tree where useful?
- Do static audits catch obvious regressions before commits?

## Metrics
- **Primary**: `a11y_goal_gaps` (count, lower is better) — missing accessibility validation integration points across docs, routine prompt, critique model, and audit tooling.
- **Secondary**:
  - `static_a11y_issues` — objective static HTML issues found in demos by `.auto/measure.sh` (missing alt text, unlabeled controls, unnamed buttons, positive tabindex, clickable non-controls lacking roles).
  - `docs_gaps` — missing documentation/routine accessibility requirements.
  - `code_gaps` — missing typed critique/audit integration.
  - `audit_strict_errors` — strict repository audit errors.

## How to Run
`./.auto/measure.sh` — emits `METRIC name=value` lines.

## Files in Scope
- `AGENTS.md` — repo-wide agent rules. Add the accessibility success criteria and verification requirements here.
- `CLAUDE.md` — canonical operator manual. Add the same accessibility goals where future operators and routine maintainers will see them.
- `.claude/routine-prompt.md` — source prompt for the remote routine. Add a critical rule and build/verification steps so future generated demos are required to be accessible.
- `.claude/auto-research.md` — manual critique/conformance workflow. Add accessibility to the review evidence and goal-setting loop.
- `lib/critique.ts` — typed critique rubric. Add an accessibility verdict so reviewer output records it explicitly.
- `routes/critique-renderers.ts` — only if needed to render new rubric fields cleanly; it currently iterates rubric entries generically.
- `.claude/audit-demos.py` — static audit. Add objective accessibility checks that catch obvious regressions without pretending to replace browser/a11y-tree review.
- `deno.json` — only if needed to wire a new audit command into existing checks.
- Specific `v<N>/.../index.html` demo files — only after the validation process is in place and the metric reveals concrete, low-risk accessibility issues to fix.

## Off Limits
- Do not weaken or edit existing `conformance.json` assertions.
- Do not claim browser/accessibility-tree verification unless `chrome-devtools-mcp` was used.
- Do not mass-format generated demo HTML/CSS.
- Do not change feature slugs or move folders.
- Do not add fake accessibility affordances purely to satisfy the benchmark. Fix the actual semantics.
- Do not overfit to `.auto/measure.sh`: if a page is accessible only according to the script but not in a real browser/accessibility tree, it is not done.

## Constraints
- `deno fmt --check`, `deno check server.ts`, and `deno task check` should pass for kept changes.
- Accessibility validation must combine static checks with explicit DevTools/browser review guidance. Static checks are a safety net, not the full definition of accessible.
- Preserve the existing project rule that browser verification uses `chrome-devtools-mcp` only.
- Keep changes small and reviewable. Prefer one structural improvement per experiment.

## What's Been Tried
- Baseline setup created this playbook and `.auto/measure.sh`. No project behavior changed yet.
