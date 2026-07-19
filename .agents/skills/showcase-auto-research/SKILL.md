---
name: showcase-auto-research
description: Audit chrome-platform-showcase coverage, build missing demos, and run critique, conformance, validation, and goal-setting workflows. Trigger when the user asks to run showcase auto research, fill demo-pending releases, critique demos, generate conformance suites, validate demos, or turn critique open questions into demo work.
---

# Showcase Auto Research

Use this skill in `/home/paulkinlan/chrome-platform-showcase` to run the manual auto-research loop.
This is not the remote Claude routine.

## First Steps

1. Read `CLAUDE.md`, `AGENTS.md`, `.claude/routine-prompt.md`, and `.claude/auto-research.md`.
2. Read `lib/chromestatus.ts` and the milestone renderer in `server.ts` so coverage uses the same
   ChromeStatus listing and slug rules as the site.
3. Read `lib/critique.ts` for critique shape when writing `_questions.json`.
4. Read `lib/conformance.ts` for conformance shape when writing `conformance.json`.
5. Start from a current checkout:

```bash
git pull --rebase
git status --short
```

## Durable demo compatibility contract — stable URLs · additive evolution · non-destructive

Every **published** demo's identity is a durable compatibility contract. "Published" means it is
live to users: it has a real route/URL and a catalogue entry (for this repo: a `built` demo, and any
`blocked`/unsupported entry that is honestly recorded). A published demo's contract covers its
**route/URL, its slug/ID, the model or platform feature it showcases, its core behavior, its
controls, its use-case intent, and all inbound links.** Routine and agent waves MUST preserve these.

- **Append-only identities.** Published slugs/IDs/routes are append-only. NEVER rename, repurpose,
  replace, merge, or delete an existing published demo because a new wave has a different design
  idea. (Catalogue entries that were never published — e.g. `pending` placeholders with no route —
  are not under contract and may be repointed.)
- **Additive evolution.** A newly discovered use case, interaction concept, model/feature
  composition, presentation approach, or a substantially different demo is added as a NEW page with
  a NEW stable slug + catalogue entry. Do NOT overwrite or repurpose an existing demo to make room.
  Existing basic/practical/wild demos stay available after more ambitious ones are added.
- **In-place fixes only when justified.** Change an existing published demo in place ONLY for a
  demonstrated bug, accessibility/runtime/security issue, factual error, compatibility problem, or
  clear quality improvement. Retain prior behavior/identity unless changing it is necessary; state
  the reason + evidence in the commit message; regression-test the change. Default to the SMALLEST
  patch — never regenerate a working page from scratch when a targeted edit suffices.
- **Moves need a tested alias.** If a URL absolutely must move, keep the old route working via a
  tested permanent redirect/alias recorded in the route manifest. Never silently break a route.
- **Blocked stays recorded.** Unsupported/blocked entries remain honestly recorded (status
  `blocked`), never deleted.
- **Read before editing.** Before editing, read the existing implementation, its history/rationale,
  and the route manifest, then make the smallest change that satisfies the goal.
- **Removals/moves are exceptional.** Any removal, rename, route move, or identity change requires
  an explicit reviewed **migration record** (`MIGRATIONS`/`migrations.json`) and must pass the route
  regression gate. Stable does NOT mean frozen — improve existing demos when justified, and add new
  demos/use cases freely; just never replace an old one merely to present a new idea.

**Gate before every push:** run the route regression gate (`deno task check-routes`). It compares
the previously published manifest against the working tree and fails on any missing published ID,
deleted route, renamed/repurposed slug, changed published identity, or unexplained concept-count
reduction — while allowing additive entries, honest `blocked` records, and in-place fixes.
Exceptional removals/moves must be listed in the migration record with reason + evidence.

**In chrome-platform-showcase specifically:** the catalogue is the `v<N>/<feature-slug>/` filesystem
tree — every `v<N>/<feature-slug>/index.html` is a published feature demo whose stable identity is
the ChromeStatus feature id linked from its index (concept demos live in
`v<N>/<feature-slug>/<concept-slug>/`; a `blocked` feature carries a `_status.json` marker). Emit
the route manifest with `deno task route-manifest` (or `node scripts/route-manifest.mjs`) and run
the gate with `deno task check-routes` (or `node scripts/check-routes.mjs`) before every push.
Record any exceptional removal/rename/move/identity-change in `migrations.json`
(`{ id, action, from, to, reason, evidence, date }`); a `move`/`alias` there also keeps the old URL
alive via the 301 redirect in `routes/aliases.ts`, and the committed `.route-manifest.baseline.json`
is the offline fallback baseline. Before editing any existing demo in the critique/goal-setting/
triage passes, read its implementation + git history + the manifest first, patch the smallest thing,
and never regenerate a working demo from scratch.

## Mobile + desktop parity — every demo usable on both, or honestly unsupported with recorded evidence

Every existing and future published demo MUST be a usable, polished experience on BOTH mobile and
desktop, unless the underlying platform feature / model / runtime is genuinely unavailable on that
class of device. This sits alongside the durable-demo contract: fix responsiveness in place with
targeted compatibility fixes — never a destructive rewrite, never a new slug to "redo" a demo.

- **Validate a mobile+desktop MATRIX, not just "it loads."** Every autonomous build or fix must
  exercise the demo at, at minimum, one representative **narrow mobile** viewport (≈360×740, touch/
  pointer + DPR≈3) and one **desktop** viewport (≈1280×800, mouse + keyboard), driving every visible
  control and state. Check, on each class: responsive layout with **no unintended horizontal
  overflow or clipped controls/text**; legible font sizes; adequate **tap targets** (≈44px min);
  **focus order
  - visible focus**; dialogs/popovers/menus open, position, dismiss, and trap focus correctly;
    orientation, **dynamic viewport** (dvh/svh, not 100vh traps) and **safe-area** insets where
    relevant; loading / progress / error / **retry** states; **zero console errors**; **no failed
    network requests**; and honest capability handling.
- **Web AI — respect mobile memory/download/storage/backend limits.** Account for constrained
  devices. Do **NOT** auto-download an absent large model just to make a test pass; an
  already-local, current, validated model still auto-initialises per the existing auto-init rule.
  When a device can't run a model, degrade honestly (labelled needs-WebGPU / needs-more-memory /
  too-large-for-this- device) with the requirements — never a blank panel or a faked result.
- **A single-class outcome needs EVIDENCE.** A desktop-only or mobile-only demo is allowed ONLY with
  direct evidence that the API, hardware capability, browser runtime, or model requirement genuinely
  makes the other class unavailable — never because the layout or interaction was left unfinished.
  Then: preserve the stable URL; show a useful, accessible, explicit **unsupported/degraded
  explanation** (requirements + a fallback/alternative where possible); NEVER blank UI, faked
  output, or a hidden/disabled-without-explanation control. Record the **unsupported class +
  evidence** in the catalogue/manifest.
- **Coverage is reported and gated.** Track exact **mobile/desktop tested-vs-total** coverage. A
  build/fix action's completion FAILS when a device class the demo is supposed to support is left
  untested or is broken. The route gate additionally FAILS if any demo is recorded broken on a class
  it claims to support. Apply this to existing demos during audits with targeted compatibility
  fixes, wave by wave — the coverage number is the backlog burn-down, and it never regresses.

**Run the responsive matrix before every push** with `deno task responsive-check` and record each
touched demo's result in `responsive-support.json` (`ok` / `unsupported`+evidence per class).

## modern-web-guidance is mandatory for all frontend work

Before ANY HTML, CSS, or client-side JavaScript implementation or modification — new pages AND
targeted fixes — run/consult the **`modern-web-guidance`** skill FIRST for the specific UI/API
topic, then apply its recommendations (or explicitly justify any exception with evidence). This is
required whenever the change involves: layout, responsive mobile+desktop behavior, forms/controls,
dialogs/popovers/menus, loading/progress/error/retry states, animations/transitions, accessibility
interactions, performance / Core Web Vitals, image/model loading + caching, modern CSS, or browser
APIs.

- **Query the SPECIFIC task, not a generic memory.** A past or generic lookup does NOT count. Search
  the actual thing you're building/fixing (e.g. "responsive control panel without horizontal
  overflow", "accessible popover dismissal", "stream progress without INP regressions"), retain the
  relevant recommendation ids + evidence, and apply them — or record a justified exception.
- **Canonical source, no stale fork.** Invoke the canonical skill; if the repo needs a scripted
  call, use the published package (`npx -y modern-web-guidance@latest search "<query>"` /
  `retrieve "<id>"`) rather than copying guide text into the repo. Record the skill **source +
  version / update path** in the repo (so routines stay current) — do NOT vendor a stale copy.
- **Process validation — missing guidance is an INCOMPLETE build/critique, not a pass.** Every
  frontend change must identify which guidance was consulted (ids/queries) and how it was applied or
  why excepted. Record this in the demo's critique artifact (`guidanceConsulted`) and enforce it: a
  frontend change with no identified guidance fails completion. Feed the relevant guidance into the
  critique/questions and the immutable conformance assertions — especially responsive UI, control
  semantics, progressive enhancement, and performance.
- **Use guidance intelligently, not to chase novelty.** Prefer supported, progressive, accessible
  solutions; preserve existing stable URLs + demo identities (durable-demo contract); make targeted
  upgrades, not rewrites. chrome-platform-showcase may intentionally demo EXPERIMENTAL Chrome
  features — but the surrounding shell, fallbacks, and controls still follow current guidance +
  capability detection. web-ai-showcase must account for mobile memory/storage/download/performance
  constraints. gendn must keep reference content readable, resilient, and fast. Audit the shared
  shell/design system first, then apply additive or narrowly-scoped improvements backed by
  mobile+desktop browser evidence.

> **How this is wired in chrome-platform-showcase (additive — existing `conformance.json` suites
> stay immutable):** the critique rubric gains a `mobile_desktop_parity` verdict and a
> `guidanceConsulted` array (`lib/critique.ts`); a frontend critique with an empty
> `guidanceConsulted` is INCOMPLETE and the route gate fails a touched demo whose critique records
> one. The two invariants ship as NEW immutable cross-project conformance suites under
> `conformance/cross-project/` (`mobile-desktop-parity.json`, `modern-web-guidance.json`) — no
> existing `v<N>/**/conformance.json` is edited, weakened, or deleted; only new suites are ADDED.
> Per-demo support lives in the git-tracked `responsive-support.json` sidecar (keyed by
> `v<N>/<feature-slug>`, defaulting existing demos to `untested`), merged into the route manifest.
> Validate with `deno task responsive-check` (mobile ≈360×740 DPR3 touch + desktop ≈1280×800;
> asserts no horizontal overflow + console/network clean and screenshots both classes; a
> genuinely-unavailable class is `blocked` with evidence, NEVER a fake pass) and
> `deno task overflow-scan` (cheap seed → `needs-review`, never `ok`). Report coverage with
> `deno task responsive-support report`; the gate (`deno task check-routes`) reports the
> mobile/desktop denominators and enforces the rules above before every push. The
> modern-web-guidance skill source + version + update path is recorded in `MODERN_WEB_GUIDANCE.md`
> (canonical skill `modern-web-guidance`, scripted fallback `npx -y modern-web-guidance@latest`; no
> vendored copy).

## Modes

Infer the mode from the user prompt:

- `coverage`, `pending`, or `build`: inventory the milestone and build missing feature and uber
  demos.
- `critique`: write missing `_questions.json` files for demos that exist.
- `conformance`: write missing `conformance.json` files for features that exist.
- `all` or `auto-research`: **coverage/build first**, then critique and conformance. Never treat
  critique + conformance coverage as release coverage.
- `validate`: exercise every implemented concept and conformance route in the requested scope.
- `triage`: pull `/telemetry/demo/triage`, fix the demos throwing the most real-visitor errors.
- `goals` or `goal-setting`: fix one concrete open question and re-critique.

If the user provides milestones, use those. If not:

- Coverage/build and `all`: inspect the newest two tracked milestones and select those with pending
  demos. At the time of execution, derive this from ChromeStatus and the rendered milestone pages;
  do not rely on hard-coded milestone numbers.
- Critique fallback, only when the newest releases have no pending demos: `v138`, `v150`.
- Conformance fallback, only when the newest releases have no pending demos: `v140`, `v130`.
- Goal-setting: choose one actionable `major` or `moderate` open question.

Ask before launching more than six milestones or a full sweep; the operator manual calls out quota
risk for large fan-out runs. A request for “all demos” or a “full sweep” is already authorization.

## Mandatory Coverage And Build Pass

Run this pass before critique or conformance in `all` / `auto-research` mode.

### Build the coverage inventory

For each target milestone:

1. Fetch the ChromeStatus milestone listing used by the server. Use `features_by_type` membership
   for the milestone; never infer the milestone from a feature detail response.
2. Deduplicate cards by ChromeStatus feature ID. A feature can appear in more than one status
   section, but one implementation satisfies that feature ID.
3. Derive each slug from the milestone listing name with the same slug function as `server.ts`. Do
   not use the feature-detail name.
4. Compare the complete unique feature-ID set with disk and with the rendered milestone page:
   - implemented feature: `v<N>/<slug>/index.html` exists and the milestone card links to
     `/v<N>/<slug>/`;
   - pending feature: the card links only to ChromeStatus, says `demo pending`, or the canonical
     feature folder/index is absent;
   - incomplete feature: the feature index exists but has no interactive concept pages, lacks the
     mandatory ChromeStatus link, or only contains static code/reference cards;
   - pending uber demo: `/v<N>/uber-demo/index.html` is absent or the milestone page says it has not
     been built.
5. Print and preserve an exact inventory before building:

```text
v<N> unique tracked features: <total>
implemented: <implemented>
pending: <pending>
incomplete: <incomplete>
uber demo: implemented | pending
```

The denominator is the unique ChromeStatus feature-ID set, not the number of folders already on
disk. Never report a milestone as complete after inspecting only implemented folders.

### Build every pending item in scope

For each pending or incomplete feature:

1. Read `.claude/routine-prompt.md`, the milestone listing entry, ChromeStatus detail, linked spec,
   and existing neighboring demos.
2. Build `v<N>/<canonical-slug>/index.html` plus interactive concept pages for **every distinct use
   case**. Two or three concepts are a floor, not a cap.
3. Follow all project invariants: real interaction, exact feature probes, graceful
   unsupported/flag/device fallbacks, CSS variables, WCAG AA, keyboard/accessibility semantics, and
   a `chromestatus.com/feature/<id>` link on every page.
4. For HTTP/header/cache/redirect behavior, add the required server route as a manual top-level
   change; do not fake the contract in client-side text.
5. Use `chrome-devtools-mcp` on every new concept. Exercise every visible control, inspect the
   accessibility tree where needed, inspect console/network/telemetry, and verify the fallback path
   when the current browser lacks the feature. For every API demo, also invoke the exact advertised
   API directly in the page context and compare its real return value or exception with the banner,
   enabled controls, and resulting output. UI state and direct API evidence must agree.
6. **Visually inspect the rendered result, not only DOM text or console state.** Capture a full-page
   screenshot before and after the primary interaction at desktop width, plus a mobile screenshot
   when layout changes. Reject pages with detached popovers, wrong float/shape sides, text crossing
   shapes, gradient/content bleed, clipped controls, unreadable code, low contrast, overlap, or an
   unsupported fallback that looks like the feature worked.
7. For text and code surfaces, inspect computed foreground/background colors and run a contrast
   audit. A clean console does not make unreadable output valid.
8. Treat capability enums and API signatures as versioned contracts. Read current documentation and
   log the actual value returned by the test browser. Do not hard-code only an obsolete vocabulary
   (for example, treating a new `available` result as unavailable because the page only recognizes
   `readily`). Unknown non-error values must be displayed honestly, not collapsed into a false
   unsupported state.
9. Reload from disk after the final edit and repeat the complete control sequence. Evidence captured
   before the last source change is invalid.
10. Commit and push one feature at a time, staging only that feature and any route code it requires:

```bash
git add v<N>/<feature>/ server.ts && git commit -m "add v<N> <feature> demos" && git push
```

Omit `server.ts` when it was not changed. Build the uber demo after the per-feature batch and commit
it separately.

### Prove the coverage gap closed

After building, regenerate the inventory from ChromeStatus, disk, and the rendered local milestone
page. A target milestone is complete only when:

- every unique tracked feature ID maps to its canonical local demo link;
- no card says `demo pending` or links only to ChromeStatus because its demo is absent;
- each feature has interactive concept coverage and the mandatory ChromeStatus reference;
- the requested uber demo exists;
- local routes return 200 and were exercised through `chrome-devtools-mcp`;
- desktop/mobile screenshots show correct geometry, anchoring, clipping, fallback rendering, and
  readable contrast;
- after push/deploy, the live `/v<N>/` page links every implemented card locally and no longer
  labels those cards `demo pending`. If deployment has not updated yet, report
  `live verification: deployment pending` rather than claiming the live gap is closed.

If time or quota stops the batch, report `implemented/total` and list every remaining feature ID +
canonical slug. Do not say “complete,” “clean,” or “all” when pending items remain.

## Uber Demo Design And Integrity

An uber demo is a believable product experience, not a feature checklist arranged in a grid.

1. Start with one user goal and select milestone features only when each one materially improves
   that goal. It is acceptable—and usually necessary—to use stable features from earlier Chrome
   releases as connective tissue. Never distort the information architecture just to place every new
   feature on the same screen.
2. Give behavior APIs real work. A scroll-promise demo needs a genuinely scrollable journey with a
   visible start and destination; cancellation needs an operation that can still be in flight; gap
   decoration needs a real gap; shape clipping must improve a deliberate visual rather than
   mutilating a card border. If removing the API would not change the experience, choose a better
   use case.
3. Keep decorative and structural responsibilities separate. Do not clip the element whose border or
   reading surface must remain intact. Apply experimental shape/paint effects to an inner
   illustration, pseudo-element, or dedicated layer, then inspect the resulting geometry at desktop
   and mobile sizes.
4. Treat feature APIs as versioned inputs at the integration boundary. Normalize documented return
   shapes (string, iterable, array, promise, or void) before array methods, iteration, optional
   chaining, or promise chaining. Report the observed shape and degraded behavior; never turn a
   compatibility difference into a generic parse error or a false success.
5. Derive all counts and summaries from the rendered implementation. If an index links four demos,
   its heading and prose must say four. Verify card/link counts, named feature counts, code
   snippets, and “features at work” tables against the DOM after the final edit.
6. Syntax-check every inline script, including sample HTML/JavaScript strings containing quotes,
   `</script>`, keyboard key names, event-handler attributes, and template literals. Then load the
   real URL—the extracted script passing a parser is necessary but not sufficient.
7. Validate the feature demos used by the uber demo as well as the uber route itself. Initial-load
   console warnings and errors are failures, including browser diagnostics for invalid experimental
   attribute tokens. Exercise every control and inspect console/network again after each
   state-changing sequence.
8. Prefer two focused experiences over one incoherent “everything” page when a release spans
   unrelated surfaces. If a release has multiple uber concepts, label the exact count and explain
   each concept's distinct job; do not leave stale “one/two demos” copy after adding more routes.

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

## Validation Pass

A validation request is exhaustive within its stated scope unless the user explicitly asks for
sampling. Validation is an attempt to falsify the demo, not to collect enough green signals to call
it good.

1. Build an exact route manifest from disk for every `v<N>/<feature>/<concept>/index.html` in scope.
   Report `tested/total`; never call a sample a full sweep.
2. Open every concept through `chrome-devtools-mcp`. Record the exact browser build, URL, and
   initial visible state. A milestone label such as v148/v150 is not evidence of runtime support.
3. Exercise **every visible control**, including repeated clicks, reset/new-session/abort/stop
   paths, boundary slider/select values, keyboard activation, Escape/light-dismiss, and controls
   used in sequences. After each action, inspect both the visual result and the accessibility
   snapshot; verify that labels, expanded/pressed/disabled state, status text, and output all
   describe what actually happened.
4. For API demos, evaluate the exact advertised feature probe and primary API call in the same page
   context. Record returned enum/property values and exceptions. Compare these with the page banner
   and whether the real or simulated path ran. A page fails if the API call succeeds while the page
   says unavailable, if simulation is labelled as native, or if a stale initial warning remains
   after successful use.
5. Run the feature's conformance route, but never use a passing suite as proof that the demo UI or
   interaction works. Conformance, runtime, accessibility, and visual geometry are independent
   gates.
6. Capture and inspect a full-page desktop screenshot before interaction and after every visually
   distinct state; add a narrow/mobile screenshot for responsive layouts. Scroll through the entire
   capture. Automated clicks, DOM snapshots, and console logs cannot detect wrong visual anchoring,
   float geometry, overlap, bleed, or contrast on their own.
7. Check geometry deliberately: popovers/tooltips must be adjacent to their invokers and remain
   onscreen; `shape-outside` text must wrap without crossing the shape and the shape must be on the
   promised side; gradients/fallbacks must not fill protected content; scrolling/animation stop
   controls must stop at the state they name rather than jump to a later terminal state.
8. Inspect computed foreground/background colors for every code, status, and output surface and run
   a contrast audit. Do not accept inherited colors without checking the effective rendered pair.
9. Inspect console and network after the full interaction sequence, not just initial load. Uncaught
   exceptions, failed resources, duplicate requests, action timeouts, or controls that never settle
   are failures—not warnings to omit from the denominator.
10. Treat capability/version messages as claims that need proof. Detect the exact
    API/property/value; do not tell a Chrome 150 user to “upgrade to 146” or equate a missing flag,
    origin trial, language pack, model download, hardware capability, permission, secure context, or
    enterprise policy with an old browser.
11. Treat capability enums and dictionary members precisely. Consult current docs, accept documented
    old/new aliases only when intentionally supporting both, and never infer support because an API
    silently ignores an unknown dictionary member. Probe the corresponding instance/static property
    or perform the real operation.
12. For unsupported APIs, verify that the fallback is visually coherent, is clearly labelled as
    fallback/simulation, and names the exact missing capability and selected inputs. Never make an
    unsupported fallback visually indistinguishable from native output.
13. Save per-route evidence and verdicts. A route counts as tested only after all applicable gates
    above complete. A milestone is complete only when `tested === total`; list failures, timeouts,
    blocked/device-only routes, and zero-control reference pages separately.
14. For every confirmed bug, reproduce the exact live URL before editing, preserve before evidence,
    fix the demo rather than immutable conformance assertions, reload after the final edit, repeat
    every control, regenerate the concept critique, and capture repaired evidence. Then verify the
    deployed live URL; if it has not updated, say `live verification: deployment pending`.

### Mandatory anti-regression cases

The validation report must explicitly mark each applicable item pass/fail/not-applicable. These are
based on confirmed showcase regressions and may not be silently skipped:

- **Contradictory capability state:** direct API creation/use succeeds while the banner says
  unavailable, upgrade, or simulated.
- **Stale capability vocabulary:** current enum values fall into an old catch-all unsupported
  branch.
- **Misleading upgrade copy:** a missing API/property is blamed on browser age without ruling out
  flags, origin trial, model/language-pack download, hardware, permission, policy, or context
  requirements.
- **Fake feature fallback:** unsupported CSS/API output looks like successful native behavior
  (including gradient content fill).
- **Detached overlay:** popover, tooltip, menu, or hint opens at a viewport corner or away from its
  invoker.
- **Broken shape geometry:** float/shape appears on the wrong side or text overlaps the exclusion
  shape.
- **Broken cancellation:** stop/abort/reset advances to a later state, leaves stale output, or fails
  to restore controls.
- **Unreadable effective colors:** code/status text has insufficient contrast after inheritance and
  computed styles.
- **False support probe:** an ignored unknown option/dictionary member, constructor alone, or
  partial interface exposure is treated as full feature support. Probe the exact method/property
  used by the interaction.
- **Host-language collisions:** a global binding or inline handler name collides with browser
  globals/platform methods (for example `top` or `animate`), or hostile sample strings terminate
  `<script>` parsing or break quote boundaries. Syntax-check extracted inline scripts and load the
  actual page.
- **Stale generated controls:** a control captured before a rerender writes into a removed
  row/label/model entry. Repeatedly add/remove/rebuild controls and ensure delayed handlers guard
  stale nodes and indexes.
- **Return-shape drift:** code unconditionally chains `.then()`/`.catch()` or iterates an API result
  whose documented return shape differs across browser revisions. Record and handle the actual value
  without hiding real errors.
- **Initialization races:** controls can run before databases, workers, crash contexts, models, or
  adapters are ready. Exercise controls immediately after load and require an explicit initializing
  state or safe queue/guard.
- **Hidden accessibility leaks:** offscreen probe elements remain focusable or named controls are
  generated without programmatic labels. Count accessible names after every rerender, not only
  initial markup.
- **Stale evidence:** the page was not freshly reloaded and fully re-exercised after the last edit.

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

## Telemetry Triage Pass

Real-visitor errors are captured to Deno KV but are only useful if something reads them. This pass
turns them into fixes (it is the telemetry half of the weekly hardening routine):

1. Pull the ranked triage: `GET /telemetry/demo/triage?scan=2000` with HTTP Basic auth using
   `showcase_password` (locally: start `deno task start`, ensure `showcase_password` is set, and
   curl `-u :$showcase_password`). It flattens batched events, ranks demos worst-first by failure
   count, and clusters errors by normalised signature across visitors.
2. Take the top offending demos. For each, open the exact route with `chrome-devtools-mcp`,
   reproduce the error signature, and fix the demo (never the immutable conformance assertions).
   Distinguish a real runtime error from an expected unsupported/flag/permission fallback — the
   latter is not a bug.
3. Re-validate the repaired route (full anti-regression gate), regenerate the touched
   `_questions.json`, and commit one demo at a time.
4. If a signature points at a genuine platform/spec change rather than a demo bug, note it for a
   human instead of masking it.

Report the top failing demos, what was fixed, and the failure count before/after.

## Parallelism And Git Safety

Use subagents or background threads if available, one per milestone, with at most four running at
once. If subagents are unavailable, process milestones serially.

Sibling agents share one working tree. Stage only the file being committed; do not use `git add -A`
inside the fan-out. If a push races, pull/rebase and retry the push for the already-created commit.

## Completion Rules

Do not use critique counts or conformance counts as evidence that a release's demos are implemented.
These are separate axes:

```text
coverage: <implemented>/<unique tracked> feature demos; uber: implemented | pending
critique: <reports>/<implemented concepts>
conformance: <suites>/<implemented features>
validation: <exercised>/<implemented concepts>
```

For `all`, report all four axes. A no-op is valid only when coverage has zero pending/incomplete
features, the uber demo exists, and critique/conformance have no gaps. Check the rendered `/v<N>/`
page itself before making that claim.

## After Each Batch

Run:

```bash
deno fmt
deno check server.ts
deno task responsive-check <touched-id> --merge   # mobile+desktop matrix for each demo you touched
deno task check-routes                             # route + parity gate + coverage report
deno task responsive-support report                # mobile/desktop coverage denominators
git status --short
```

For every demo you built or fixed, run the mobile+desktop matrix
(`deno task responsive-check <id>
--merge`), `Read` both screenshots, and record the result in
`responsive-support.json` (`ok`, or `unsupported`+evidence when a class is genuinely unavailable —
`blocked` with evidence is NEVER a fake pass, and you must not auto-download an absent large model
to force a pass). A cheap `deno task overflow-scan --sample <n>` seeds `needs-review` flags across
the backlog (never `ok`). Consult `modern-web-guidance` FIRST for any HTML/CSS/JS work and record it
in the critique's `guidanceConsulted`. `deno task check-routes` is the route + parity regression
gate — run it before every push. It must PASS (exit 0); a failure means a published demo
route/slug/identity was destructively changed. Fix the change to be additive, or record an
intentional removal/rename/move in `migrations.json`. When new demos land, refresh the baseline
snapshot with `deno task route-manifest --write`.

If `deno fmt` changed generated JSON, commit and push only those relevant formatting changes.
Report:

- coverage before and after (`implemented/unique tracked`, incomplete, uber status);
- every built feature and commit;
- critique, conformance, and validation counts with their own denominators;
- pushed refs and routes to inspect (`/v<N>/`, `/critiques`, `/conformance`);
- every pending feature or blocked milestone.

The final check is visual and literal: open each target `/v<N>/` page and confirm there are no
`demo pending` cards left in the requested scope.
