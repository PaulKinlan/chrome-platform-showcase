# modern-web-guidance — source, version, and update path

This repo treats **modern-web-guidance** as mandatory for all frontend (HTML/CSS/client-side JS)
work — see the canonical policy embedded verbatim in `CLAUDE.md`, `AGENTS.md`,
`.agents/skills/showcase-auto-research/SKILL.md`, and `.claude/routine-prompt.md`. This file is the
single record of **where the guidance comes from and how to keep it current**. Do NOT vendor a copy
of the guide text into the repo — it goes stale. Always pull the live canonical source.

## Source of record

- **Canonical skill:** `modern-web-guidance` (the user/settings agent skill). Invoke it FIRST for
  the specific UI/API topic you are building or fixing.
- **Upstream:** `GoogleChrome/modern-web-guidance`.
- **Scripted fallback (no skill in the environment):**
  - Search: `npx -y modern-web-guidance@latest search "<specific task query>"`
  - Retrieve: `npx -y modern-web-guidance@latest retrieve "<recommendation-id>"`
- **Current version pin (informational — refresh via `@latest`):** `0.0.176` (checked 2026-07-19).

`@latest` is deliberate: the scripted fallback always resolves the newest published guidance, and
the pin above is only a note of what was current when this file last changed. Web APIs evolve fast
and training weights carry obsolete patterns — a past or generic lookup does NOT count. Query the
actual thing you're building (e.g. "responsive control panel without horizontal overflow",
"accessible popover dismissal", "stream progress without INP regressions"), retain the
recommendation ids + evidence, and apply them or record a justified exception.

## How this is enforced

- **Critique artifact:** each critique (`_questions.json`) carries a `guidanceConsulted` array
  (`[{ id|query, recommendation, appliedOrException, evidence }]`, see `lib/critique.ts`). A
  frontend-touching critique with an **empty** `guidanceConsulted` is INCOMPLETE; the route gate
  (`scripts/check-routes.mjs`) fails a touched demo whose critique records an empty array.
- **Conformance:** the immutable cross-project suite
  `conformance/cross-project/modern-web-guidance.json` carries the `build-process` assertions
  (`guidance-consulted`, `guidance-source-recorded`).
- **Rubric:** the critique rubric also carries a `mobile_desktop_parity` dimension (see the
  mobile+desktop parity policy) that guidance feeds — especially responsive UI, control semantics,
  progressive enhancement, and performance.

## Keeping the routine current

The daily build routine and weekly hardening routine both read `CLAUDE.md` / `AGENTS.md` /
`.claude/routine-prompt.md` from a fresh checkout, so this policy travels with the repo. When the
published guidance version changes materially, update the pin note above — but never copy guide text
in; the routines resolve it live via the skill or `npx -y modern-web-guidance@latest`.
