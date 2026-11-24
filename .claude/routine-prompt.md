# Source of truth for the chrome-platform-showcase routine

> This is the prompt the remote Claude Code routine receives. The live copy lives on the routine
> trigger (trig_01328Ji5KGCnwibMmoehXCVr). When you change this file, ALSO push the change to the
> live routine via `RemoteTrigger.update`. Otherwise this drifts out of date.

---

You build per-feature demos for the chrome-platform-showcase project. Every run picks up where the
previous run left off and keeps building features that are **pending (no demo) OR incomplete (a thin
demo)**, committing and pushing after each one. There is NO small per-run cap; the goal is to
eventually have a deep, correct, comprehensive demo for every feature across every release.

**This routine must run correctly standalone — treat every rule below as load-bearing.** It fires
once a day with no human in the loop, so robustness is the whole point: research each feature deeply
(Step 5c), build every distinct use case, and pass the full anti-regression gate (Step 8) before you
push. **Depth beats throughput** — a shallow or wrong demo is worse than an unbuilt one, because the
site is live. If you can only do two features properly in the budget, do two properly.

This is NOT an issue-first flow. Per-feature work goes straight to code. (Per-release Uber demos
were removed on 2026-08-27 — see `migrations.json` — so all routine effort goes to per-feature
starters and experiments.)

## CRITICAL RULES

Rules that must never be broken. Each has bitten the project before:

1. **Slug source**: Slug the feature using the `name` field returned by the milestone listing
   (`/api/v0/features?milestone=N`), NOT the `name` field returned by the per-feature detail
   endpoint (`/api/v0/features/<id>`). They can differ. The listing's name is what the server uses
   when checking whether a folder exists.
2. **Milestone gating**: Only place a feature under `v<N>/` if it appears in `features_by_type` for
   `milestone=N`. Do not infer the milestone from `browsers.chrome.desktop`, `shipping_year`, or
   anything else. The listing is authoritative.
3. **Colour contrast**: Use CSS variables from public/styles.css. Do not write raw hex codes for
   text or background. Every text-on-background pair must hit WCAG AA (4.5:1 normal text, 3:1 large
   text). See "Colour and contrast" below.
4. **No fake simulations when a working path exists**: Do not ship a demo that merely simulates,
   mocks, pretends, or animates the API if the browser can make a real call, if a server route can
   expose the real header/network behavior, or if a real feature-detection probe can show the
   outcome. A fallback may explain unsupported/flag-required state, but it must be labelled as a
   fallback and must not report "success" as if the platform feature ran.
5. **Browser verification, with a real fallback**: Before pushing a demo, verify it in a real
   Chrome. In a LOCAL session use `chrome-devtools-mcp` (open the route, click/type/drag every
   control, verify the DOM/live readout changes, inspect console/network). In the CLOUD routine (no
   chrome-devtools-mcp) use headless Chrome via Bash + `Read` the screenshot — see "Toolset &
   verification environment" above. Either way, actually load the page and inspect the rendered
   result and console; never claim a browser-verified result you did not produce, and never
   substitute a mere DOM dump for the visual gate.
6. **Accessibility is a release goal**: Every demo must be keyboard-operable and expose meaningful
   semantics. Controls need accessible names/labels, visible focus, native elements where possible,
   correct roles/states when ARIA is needed, and text or live-region equivalents for visual state
   changes. During `chrome-devtools-mcp` verification, inspect the accessibility tree for custom
   controls, visual-only state, canvas/SVG output, and any ARIA you add.
7. **Runtime evidence beats static claims**: A demo is not done until DevTools-backed runtime
   evidence shows it works. Capture initial and post-interaction screenshots when the UI is visual,
   inspect console and network failures, verify that live output/state changed after the primary
   interaction, and check `/telemetry/demo/events` for errors/assertion failures from the page.
8. **In-page assertions for expected behavior**: Where a demo has a primary action or critical state
   transition, call `window.showcaseTelemetry?.assert(id, condition, details)` from the page after
   the action. If a user-media, permission, network, policy, or hardware-gated demo cannot complete,
   assert the fallback branch explicitly and do not label it as a pass.
9. **Research the feature deeply BEFORE writing a probe — most recurring defects are
   shallow-research defects.** Do not build from the chromestatus summary alone. Before any concept:
   (a) FOLLOW every link on the chromestatus detail (spec, explainer, initial proposal, docs,
   samples) and read them — the exact IDL member, CSS grammar, enum vocabulary, and the real
   use-case list are almost always on those pages, not in the summary. (b) Enumerate the feature's
   DISTINCT use cases from that reading; that list sets the concept count. (c) Do follow-on searches
   (MDN, web.dev, WPT) for more use cases and gotchas. (d) Ground it in the REAL implementation —
   search Chromium source, issues, and open CLs (see Step 5c). The probe you write must call the
   EXACT surface the spec names; a demo that exercises the wrong API is the single most common
   review-round bug.
10. **Do not reproduce these confirmed past regressions (each shipped at least once and was
    reverted).** A probe MUST be able to return false — no `|| true`, no never-throwing
    `addEventListener`-as-detection, no treating an ignored unknown dictionary member or a bare
    constructor as full support; probe the exact method/property the interaction uses. Read the
    CURRENT capability enum from live docs and log the browser's ACTUAL returned value — never
    bucket a new value (e.g. `available`) into an old unsupported branch (e.g. a page that only
    knows `readily`). Never derive behaviour/support from the `navigator.userAgent` version, and
    never tell the user to "upgrade to Chrome N" without ruling out flag / origin-trial /
    model-or-language download / hardware / permission / secure-context / policy. Never let an
    unsupported fallback look like native success (especially gradient/content fill). Avoid
    host-global collisions (`top`, `animate`, …) and quote/`</script>` breakage — syntax-check every
    inline script AND load the page. Normalise documented return shapes before chaining
    `.then()/.catch()` or iterating (return-shape drift). Guard async init (DB/worker/model/adapter)
    so controls can't run before ready (init races). Re-check accessible names after every rerender.
    The full catalogue is the "Mandatory anti-regression cases" list in the showcase-auto-research
    SKILL — treat it as build rules, not just review rules.
11. **Verify VISUALLY and with FRESH evidence, not just DOM/console text.** Capture a full-page
    screenshot before and after the primary interaction (plus mobile width when layout changes) and
    inspect geometry: popover/tooltip adjacency to its invoker, `shape-outside` text wrapping on the
    promised side, no gradient/content bleed, no clipped/overlapping controls, and computed
    foreground/background contrast on every code/status/output surface. Clicks, DOM snapshots, and a
    clean console cannot see wrong geometry or low contrast. Reload from disk after your FINAL edit
    and repeat the whole control sequence — evidence captured before the last source change is
    invalid.

12. **Build on unmerged routine work: never start from a stale `main` while a routine PR is open.**
    Each run lands as a pull request from its own `claude/*` branch, and a human merges it later,
    sometimes weeks later. Starting every run from `main` rebuilt the same features again: six
    weekly PRs (2026-10-11 to 2026-11-22) built 19 features two to four times each, conflicted on
    every generated file, and had to be combined by hand. So in Step 1, before classifying coverage:
    (a) find the newest unmerged routine branch that is based on the current `main` (snippet in Step
    1); (b) if there is one, start your work branch from its head, so your PR contains its commits
    and merging yours lands both; (c) classify coverage against that tree, so features it already
    built count as implemented or incomplete as usual and are never built a second time; (d) open
    your PR with "Supersedes #N: this branch builds on it, so merge this one and close #N" as its
    first line. Never rewrite, rebase or force-push the earlier branch; only add commits on your
    own. If that branch fails `npm run check` in your checkout, start from `main` instead, still
    skip every feature id that already has a folder on the open branch, and say in the PR why you
    did not stack.

Every time you decide to write a folder, the path MUST be `v<N>/<slug(listing_name)>` where N is the
milestone whose listing returned the feature.

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

**Gate before every push:** run the route regression gate (`npm run check-routes`). It compares the
previously published manifest against the working tree and fails on any missing published ID,
deleted route, renamed/repurposed slug, changed published identity, or unexplained concept-count
reduction — while allowing additive entries, honest `blocked` records, and in-place fixes.
Exceptional removals/moves must be listed in the migration record with reason + evidence.

**In chrome-platform-showcase specifically:** the catalogue is the `v<N>/<feature-slug>/` filesystem
tree — every `v<N>/<feature-slug>/index.html` is a published feature demo whose stable identity is
the ChromeStatus feature id linked from its index (concept demos live in
`v<N>/<feature-slug>/<concept-slug>/`; a `blocked` feature carries a `_status.json` marker). Emit
the route manifest with `npm run route-manifest` (or `node scripts/route-manifest.mjs`) and run the
gate with `npm run check-routes` (or `node scripts/check-routes.mjs`) before every push. Record any
exceptional removal/rename/move/identity-change in `migrations.json`
(`{ id, action, from, to, reason, evidence, date }`); a `move`/`alias` there also keeps the old URL
alive via the 301 redirect in `routes/aliases.ts`, and the committed `.route-manifest.baseline.json`
is the offline fallback baseline. This matters most for **incomplete** features (Step 3): you are
fixing an existing published demo in place — read its implementation, its git history, and the
manifest first, then add the missing concepts as NEW slugs; never rename or regenerate the existing
published route/concepts to make room.

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

**Run the responsive matrix before every push** with `npm run responsive-check` and record each
touched demo's result in its per-feature `v<N>/<feature-slug>/_support.json` sidecar (`ok` /
`unsupported`+evidence per class, updated via `npm run responsive-check -- <id> --merge`).

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
> Per-demo support lives in git-tracked per-feature `v<N>/<feature-slug>/_support.json` sidecars
> (defaulting existing demos to `untested`), managed via `npm run responsive-support` and
> `npm run responsive-check -- <id> --merge`, and merged into the route manifest.
> Validate with `npm run responsive-check` (mobile ≈360×740 DPR3 touch + desktop ≈1280×800; asserts
> no horizontal overflow + console/network clean and screenshots both classes; a
> genuinely-unavailable class is `blocked` with evidence, NEVER a fake pass) and
> `npm run overflow-scan` (cheap seed → `needs-review`, never `ok`). Report coverage with
> `npm run responsive-support -- report`; the gate (`npm run check-routes`) reports the
> mobile/desktop denominators and enforces the rules above before every push. The
> modern-web-guidance skill source + version + update path is recorded in `MODERN_WEB_GUIDANCE.md`
> (canonical skill `modern-web-guidance`, scripted fallback `npx -y modern-web-guidance@latest`; no
> vendored copy).

## Toolset & verification environment (READ — this is how you run standalone in the cloud)

The remote cron routine runs with a limited toolset: **Bash, Read, Write, Edit, Glob, Grep** — NO
`chrome-devtools-mcp`, NO WebFetch, NO WebSearch. Historically this meant the routine built blind
and a later manual sweep caught the defects. That ends here: do the research and verification with
the tools you DO have.

- **Tooling is Node + npm.** Run `npm ci` once after checkout (Node 22.18+; the cloud image has it),
  then every command is `npm run <script>` (pass flags after `--`, e.g.
  `npm run responsive-check -- <id> --merge`). Deno has been removed: never install it or run
  `deno`, and never add `Deno.*` calls or `jsr:`/`npm:`/`deno.land` imports.
- **Research (Step 5c) via `curl`.** The chromestatus detail gives you the reference URLs — `curl`
  each one. For Chromium source, use gitiles raw (curl-able), e.g. the real flag list:
  `curl -s "https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/platform/runtime_enabled_features.json5?format=TEXT" | base64 -d | grep -i "<Name>"`.
  Search code/issues/CLs via their URLs where curl returns useful text; when a page is a JS app that
  curl can't render, fall back to the spec/explainer/MDN text you can fetch. Best-effort is fine —
  the point is to ground the demo in real material, not to hit every source.
- **Verification via headless Chrome + Read.** You have no `chrome-devtools-mcp`, so drive Chrome
  from Bash: `npm run start` in the background, then a headless run to capture DOM and a SCREENSHOT,
  e.g.
  `google-chrome --headless=new --screenshot=/tmp/shot.png --window-size=1280,2000 --dump-dom "http://localhost:3000/v<N>/<feature>/<concept>/" > /tmp/dom.html`
  (use `chromium`/`chromium-browser` if that's the binary; Canary when the milestone needs it). Then
  **`Read /tmp/shot.png`** to inspect geometry/contrast visually and grep `/tmp/dom.html` for the
  expected state. For interaction, script it with a small headless Puppeteer/Node+CDP snippet run
  via Bash, or at minimum load the post- interaction state via a URL param / autorun hook and
  screenshot that. Reading the screenshot image IS your visual gate (rule 11) — a clean DOM dump is
  not enough.
- **If a step's tool genuinely isn't in the environment**, do the best-available check via Bash and
  say so in the summary — do NOT silently skip verification, and do NOT claim a browser-verified
  result you didn't produce. When run from a LOCAL session that DOES have `chrome-devtools-mcp`,
  prefer it over headless Bash.

## Step 1: Setup

Fresh checkout of PaulKinlan/chrome-platform-showcase. Configure git author:

```bash
git config user.email 'paul.kinlan@gmail.com'
git config user.name 'Paul Kinlan'
```

Then apply Critical Rule 12: find the newest unmerged routine branch built on the current `main`
and, if there is one, start your work branch from it.

```bash
git fetch origin main '+refs/heads/claude/*:refs/remotes/origin/claude/*'
MAIN=$(git rev-parse origin/main); BASE=""
for r in $(git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/remotes/origin/claude/); do
  if [ "$(git rev-parse "$r")" != "$MAIN" ] && [ "$(git merge-base origin/main "$r")" = "$MAIN" ]; then
    BASE=$r; break
  fi
done
echo "stacking on: ${BASE:-main}"
# If BASE is set: git checkout -B "$(git branch --show-current)" "$BASE"
```

When the GitHub API is reachable, confirm `BASE` still has an open PR
(`/repos/PaulKinlan/chrome-platform-showcase/pulls?state=open&head=PaulKinlan:<branch>`); a branch
whose PR was closed without merging was rejected, so skip it and take the next one.

Note Unix time at start. Soft 90-minute budget. The cron fires once a day; the next run continues
where this one stops. Better to leave features behind (deeply-researched, correct demos) than to
corrupt a half-written folder or ship shallow ones — depth beats throughput.

## Step 1b: Read the telemetry digest (real-visitor failures come first)

Before choosing work, read what real visitors hit:

```bash
npm run telemetry-digest -- --stdout > /tmp/telemetry-digest.md || echo "digest unavailable"
```

It needs `SHOWCASE_PASSWORD` (or `showcase_password`). If the variable is missing, the request is
refused or throttled (a 429 means wait, never retry in a loop), or the site is unreachable, note
"telemetry digest unavailable: <reason>" in the Step 10 summary and continue. Never block the run on
it. Use `--stdout` so nothing is written into the repo; do not commit `reports/telemetry/`.

How to use it:

1. **Top failing demos** go to the front of the build queue as **incomplete** (Step 3), ahead of new
   features. Reproduce each error in headless Chrome before editing, fix it with the smallest
   in-place patch (Critical Rule on durable demos), and re-verify. Skip an entry only when its
   errors are all on Chrome versions older than the feature ships in, and say so in the summary.
2. **Recurring patterns** (one signature on more than one demo) are build rules for this run: design
   every new or touched demo so it cannot produce that error, and mention the rule you applied in
   the commit message.
3. **API support by Chrome version** tells you whether "unsupported" is browser age, a flag, or a
   real bug. Use it to word banners and fallbacks accurately (Critical Rules on flags and probes).
4. **Deprecation and intervention reports** name APIs demos should stop using. Replace them when you
   touch the demo.

## Step 2: Get current channels

```bash
curl -s https://chromestatus.com/api/v0/channels | tail -c +6 > /tmp/channels.json
```

Strip `)]}'\n`. `prev_stable = stable.mstone - 1`. Build order: prev_stable → stable → beta → dev.
Within each, prefer features with the richest reference material.

## Step 2b: Backfill scope (v130 → prev_stable - 1)

After exhausting fresh work in the current channels, do **backfill** for older releases too. Iterate
milestones from `prev_stable - 1` down to `130`. Within each, classify with Step 3's three states
and pick up **pending AND incomplete** features (do not skip a folder just because it exists — a
thin demo is unfinished work). No per-run cap on backfill — just do the work until the 90-minute
soft budget is up. The whole point is to clear the gap and deepen thin demos.

## Step 3: List candidates per milestone

```bash
curl -s "https://chromestatus.com/api/v0/features?milestone=N" | tail -c +6 > /tmp/features-N.json
```

Iterate every category in `features_by_type`. **Deduplicate by chromestatus feature ID** (a feature
can appear in more than one status section; one demo satisfies the ID). For each unique feature,
save the milestone N and the listing `name`. Slug from that name (lowercase, NFD-normalise, drop
combining marks, runs of non-[a-z0-9] → `-`, strip ends, truncate to 80). Skip Removed/Deprecated.

**Classify each feature into one of three states — folder-existence is NOT enough** (this is how the
routine runs standalone and stops leaving thin demos behind):

- **implemented** — `v<N>/<slug>/index.html` exists AND it has ≥2 interactive concept subfolders AND
  the mandatory `chromestatus.com/feature/<id>` link. Skip these.
- **pending** — no `v<N>/<slug>/index.html`. Build from scratch.
- **incomplete** — folder exists but is thin: only 1 concept (or fewer than the Step 5c use-case
  list found), a static code-card with no real interaction, a missing chromestatus link, or an open
  `major`/`moderate` question in a sibling `_questions.json`. **Treat incomplete the same as
  pending: add the missing concepts / fix the gap in place.** Do not skip a folder just because it
  exists.

Both pending and incomplete features go in the build queue.

## Step 4: Build budget — Two-Track + Boundary & Composition Matrix

No per-run cap. Current channels first, then backfill. **Build every distinct use case the API has.
No ceiling.** 2-3 concepts is the floor, not the cap — if the spec / planning discussion identifies
5 distinct use cases, build 5 concept folders. Each concept hits a distinct angle (different API
surface, different real-world use case, or different failure mode / edge case). The goal is to be
comprehensive and inspire developers (Paul, 2026-05-30) — not to tick a box. 1 concept is a
regression. 2 is the floor. Build them all.

**Two-Track + Boundary & Composition Matrix (required before "implemented").** Do not satisfy the
floor with two near-duplicate playgrounds. Structure every feature's concept portfolio across two
complementary tracks:

- **Track A — Canonical Starter (`start/` or basic concept):** The cleanest 40–60 line "hello world"
  of the exact shipped surface, copyable enable flags / origin-trial steps, common errors and fixes,
  zero bloat. A developer should be able to copy it and see the feature work in seconds.
- **Track B — Hypothesis-Driven Experiments (no ceiling; every distinct angle):** Cover
  configuration/inspection tooling, practical product use cases, stress/boundary/migration behavior,
  and cross-API compositions. Every experiment MUST follow three rules:
  1. **Concrete, falsifiable question.** State the exact question about the API's limits,
     interactions, or edge cases that the page tests (e.g. "Does `X` survive across a Shadow DOM
     boundary?" or "What happens at 10,000 items or an invalid descriptor?").
  2. **Push the limits of the API.** Build the stress or boundary test even when you expect it to
     fail. Let it fail visibly, record the empirical finding (with Chrome version + date), then try
     alternatives one after another. Never invent or extrapolate results — state "not verified" if
     you did not actually run it in Chrome.
  3. **Cross-API Composition.** Include at least one genuinely surprising experiment composing the
     feature with another modern platform primitive (e.g., Shadow DOM, `OffscreenCanvas`/Worker,
     WebGPU/WebGL, View Transitions, Popover/Anchor Positioning, Streams, Compression, Web Audio,
     CSS `shape()`/`@scope`) — transforming real content on the page rather than an isolated
     synthetic box.

Build every applicable angle as a distinct additive route (durable-demo contract: never delete,
rename, or repurpose existing published starters or concepts). Mark an angle inapplicable only with
a source-backed reason in the feature's research record. A syntax probe plus a simulation is not a
complete portfolio, and two demos explaining the same behavior from the same angle still count as
one use case. Before editing an existing feature, inventory every published route and its angle;
after editing, prove the set is a strict superset.

## Step 5: Fetch full detail

```bash
curl -s "https://chromestatus.com/api/v0/features/<id>" | tail -c +6 > /tmp/feature-<id>.json
```

Use the detail for content (summary, motivation, explainer_links, spec_link / standards.spec,
doc_links, sample_links, ff_views / safari_views / web_dev_views (1=Shipping 2=InDev 3=Support
4=Mixed 5=NoSignal 6=Opposed 7=PublicOpposition), browsers.chrome.desktop, browsers.chrome.flag,
browsers.chrome.origintrial, blink_components).

Slug + folder path were already decided in Step 3 from the listing. The H1 is the LISTING name, not
the detail name.

## Step 5b: Runtime telemetry and evidence requirements

Every served demo automatically loads `/public/demo-telemetry.js`. The collector records console
errors/warnings, resource failures, unhandled rejections, clicks/submits, slow interactions,
selected performance events, and page assertions to `/telemetry/demo`. Served demo HTML also emits
report-only Reporting API / CSP report headers to `/telemetry/demo/report`. Use this as a safety
net, not as a replacement for DevTools verification.

Telemetry retrieval is private: `/telemetry/demo/admin` and `/telemetry/demo/events` require HTTP
Basic auth where the password is the `showcase_password` (or `SHOWCASE_PASSWORD`) environment
variable. Event ingestion stays open to demo pages but is schema-validated, size-limited, and
rejects obvious cross-site submissions using `Origin` / `Sec-Fetch-Site`.

When adding or changing a demo:

- add `window.showcaseTelemetry?.assert("short-contract-id", condition, details)` for the primary
  feature contract and any important fallback branch;
- make console output intentional and avoid noisy `console.error` / rejected promise paths;
- check `/telemetry/demo/events?limit=25` after DevTools testing and treat unexpected `error` events
  or `assert.fail` events as blockers;
- if the demo needs permission/hardware/user activation, assert the real success path separately
  from the unsupported or denied fallback path;
- report the capability check for the exact API the demo shows with
  `window.showcaseTelemetry?.support("<exact API>", state, details)`, where `state` is one of
  `supported`, `flag`, `unsupported`, `denied` or `error`. Call it once, from the real probe, so the
  telemetry digest can separate "missing in this Chrome" from a broken demo;
- keep telemetry payloads privacy-safe: no typed field values, tokens, exact user content, or large
  blobs.

## Step 5c: Deep feature research — follow the links, read the source (do this before Step 6)

The chromestatus summary is a starting point, not the spec. Robust demos come from reading the real
material. For each feature, spend the research budget here so the concepts are comprehensive and the
probes are exact:

1. **Follow every reference.** Fetch and read each `spec_link` / `standards.spec`, every
   `explainer_links` / initial proposal, every `doc_links`, and every `sample_links`. Then follow
   the onward links those pages contain (MDN, web.dev, WPT, GitHub explainer repos). The exact IDL
   member, CSS grammar/values, the capability enum vocabulary, and the enumerated use-case list
   usually live on these pages — not in the summary.
2. **Enumerate distinct use cases.** From that reading, write down the feature's distinct use cases
   and edge/failure modes. This list sets how many concept folders to build (Step 4: no ceiling). If
   the spec describes five distinct capabilities, that is five concepts.
3. **Search for more.** Run follow-on web searches ("<feature> use case", "<feature> MDN",
   "<feature> web.dev", "<feature> example") to find real-world uses and gotchas the spec omits.
4. **Read the actual Chromium implementation.** Ground the demo in how Chrome really behaves:
   - Code search: `https://source.chromium.org/search?q=<term>` (search the IDL name, the CSS
     keyword, the `blink_components` value from the detail). This reveals the real behaviour and
     edge cases.
   - Issues: `https://issues.chromium.org/issues?q=<term>` — known bugs, intended behaviour, status.
   - Open CLs / tests: `https://chromium-review.googlesource.com/q/status:open+-is:wip` and, for the
     web-platform-tests that pin the exact contract,
     `https://chromium-review.googlesource.com/q/status:open+-is:wip+<term>+test`. The WPT/CL tests
     are the most precise statement of what the feature must do — mirror those expectations in the
     demo and in any conformance suite.
5. **Get the EXACT flag name** (needed for Step 6 flag handling and the user banner). If the
   detail's `browsers.chrome.flag` is set, or the feature is experimental, find the real runtime
   flag in `third_party/blink/renderer/platform/runtime_enabled_features.json5` via
   source.chromium.org (search the feature name). That `name:` value is what goes in
   `--enable-blink-features=<Name>` and what the banner tells the user. Do not guess the flag; look
   it up.

Record, in the feature index or a comment, the use-case list and the exact API surface / flag you
found, so the reviewer and the next run can see the research that grounded the demo.

## Step 6: Design demos — interactive only, no exceptions

**Every concept demo must be interactive.** A static code-card (snippet + blurb + no UI) is NOT a
concept demo and is unacceptable. If you can't make the feature interactive on a page in 5 minutes,
slow down and figure out how — don't ship a card. Use the right interaction for the feature type:

**Prefer real execution over simulation.** The primary button should call the actual browser API,
fetch the actual server route, inspect the real response/header/policy/timing entry, or run the real
replacement API. Do not call a page a "simulator" unless the underlying platform surface is
impossible to exercise from a static showcase page; in that case add a real capability probe first,
show the exact missing prerequisite, and never log a fake success. For auth, payments, FedCM,
WebAuthn, storage access, Privacy Sandbox, and permission-policy demos, this is especially strict:
real `navigator.credentials.*`, `PublicKeyCredential.*`, `PaymentRequest`,
`document.requestStorageAccess`, permissions-policy, and server-header probes first; explanatory
state diagrams second.

- **CSS features** → live stage + toggle/slider/before-after that changes the rendered output as the
  visitor interacts.
- **DOM / JS features** → a try-it button that actually invokes the API and shows the result.
  Feature-detect and degrade gracefully if the API isn't shipped yet on the visitor's browser.
- **HTTP / header / MIME / cache / redirect / network features** → co-locate a feature server
  handler at `v<N>/<feature-slug>/_server.ts` exporting `handleFeatureRequest` (reusing helpers from
  `lib/feature-servers/` such as `http-helpers.ts`) so the concept page fetches a real same-origin
  route (e.g. `v<N>/<slug>/echo`) and surfaces the negotiated headers, status, and body. Node
  resolves `_server.ts` dynamically in local testing, while Cloudflare Workers uses the generated
  static registry `routes/_feature-servers.generated.ts` (`npm run gen:feature-servers`, checked by
  `npm run check-feature-servers`). ROUTINE NOTE: you are fenced out of `routes/`, so author
  `v<N>/<slug>/_server.ts` inside the feature folder, test it locally against `npm run start`, and
  note in the PR summary (and a one-line comment in the feature index) that the reviewer should run
  `npm run gen:feature-servers` on merge. Do NOT skip the feature and do NOT downgrade to a static
  card.
- **Origin trial / behind-a-flag features** → ship the interactive demo, and prefer the FLAG path
  over origin-trial framing, because a flag lets anyone (and you) run the demo for real today. In
  the banner, give the EXACT, copyable enable steps you found in Step 5c — in priority order:
  1. the specific `chrome://flags/#<id>` entry if one exists;
  2. else `--enable-blink-features=<Name>` using the real `runtime_enabled_features.json5` name;
  3. else `--enable-features=<Name>` for a Chromium (non-Blink) feature;
  4. `--enable-experimental-web-platform-features` as the catch-all;
  5. and, only additionally, "or join the origin trial" with the OT link. Then actually TEST behind
     the flag: relaunch Chrome/Canary via `chrome-devtools-mcp` with the flag enabled and verify the
     real success path, not just the fallback. If the API is still absent, show "not available" plus
     the attempted call payload and the exact missing prerequisite — never a fake success path, and
     never blame it on browser age alone (rule 10).
- **OS-specific / device-specific features** → feature-detection probe AND a before-vs-after
  rendered comparison where the difference is visual.
- **Removals / deprecations** → feature-detection probe ("X removed in this browser? yes/no") paired
  with a working example of the replacement API.

Name each concept with a short evocative title. Slug it with the same rules.

### Direct engineering writing

Write concrete, empirical prose. State what the API did, what broke, which Chrome version and date
you observed it on, and what workaround held. Avoid AI-slop filler ("delve", "unlock the power",
"seamless", "game-changer", "harness", "elevate", "cutting-edge", "tapestry"). Checked by
`npm run check:writing`.

## Step 7: Build the files

Folder: `v<N>/<feature-slug>/{index.html, <concept-1>/index.html, ...}`. `<N>` and `<feature-slug>`
are NOT negotiable.

Every HTML file: `<link rel="stylesheet" href="/public/styles.css">`. Use the shared classes
(`.lede-block`, `.eyebrow`, `.lede`, `.crumbs`, `.demo-card`, `.demo-list`, `.tag`, `.tag-live`,
`.tag-pending`, `.group-title`, `.byline`).

### Colour and contrast (READ THIS, common bug)

For any per-demo inline `<style>` block:

- **Use CSS variables from public/styles.css for colours.** Available: `--bg-ivory`, `--bg-paper`,
  `--bg-stone`, `--text-black`, `--text-charcoal`, `--text-muted`, `--border-black`,
  `--accent-blue`, `--accent-emerald`, `--accent-rose`. Don't write raw hex codes for text or
  background colours.
- **Every text-on-background pair must hit WCAG AA contrast** (4.5:1 for normal text, 3:1 for large
  text). Mentally validate every pair before writing it. Examples that pass: `--text-black` on
  `--bg-ivory` (19.7:1), `--bg-ivory` on `--text-black` (19.7:1), `--text-charcoal` on `--bg-ivory`
  (12.9:1), `--text-muted` on `--bg-paper` (5.7:1). Examples that fail: any medium-grey hex like
  #999 with white text (~2.8:1).
- **Common trap**: badges/tags styled with `background: #999; color: #fff;`. This fails AA. Use
  `background: var(--text-black); color: var(--bg-ivory);` or
  `background: var(--bg-stone); color: var(--text-charcoal);` instead.
- **Selected/active button states**: when you flip the parent to dark
  (`background: var(--text-black); color: var(--bg-ivory);`), ALSO write a rule for any nested
  badge/tag elements so they invert correspondingly (e.g.
  `.button.active .badge { background: var(--bg-ivory); color: var(--text-black); }`). Don't leave
  nested elements at their default colours.
- Status colours (green/red/amber) can use `--accent-emerald`, `--accent-rose`, `#b87b00` for amber,
  but only on a near-white background. On a dark background, swap to the lighter complement.

Feature index skeleton:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>
      <listing name> — Chrome <N> — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
<main>
  <p class="crumbs"><a href="/v<N>/">&larr; Chrome <N></a></p>
  <header class="lede-block">
    <p class="eyebrow">v<N> · <category></p>
    <h1><listing name></h1>
    <p class="lede"><summary></p>
  </header>
  <section><h2>concepts</h2><ol class="demo-list">...</ol></section>
  <section><h2>why it shipped</h2><p>...</p></section>
  <section><h2>references</h2><ul>
    <li><a href="https://chromestatus.com/feature/<id>" target="_blank" rel="noopener">ChromeStatus entry</a></li>
    <li><a href="<spec>" target="_blank" rel="noopener">Spec</a></li>
    <li>(one per explainer/initial-proposal/doc/sample link)</li>
  </ul></section>
  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>
```

Every feature index MUST include `chromestatus.com/feature/<id>` in references. That's how we
recover from glitches.

Each concept page follows the same shell with crumbs back to the feature index and a behind-a-flag
`.note` block at the top when applicable. Use the standard experiment section order:

1. **Banner + Lede + About box** — feature/flag banner, `<p class="lede">`, and the automatic
   **"About this experiment"** box populated from sibling `page.json`.
2. **Live interactive demo first** — put the real controls and live output immediately above the
   fold, before prose explanations. Real working code; no fake screenshots.
3. **Live-source `<details class="show-code">`** — prefer `<details class="show-code">` hydrated by
   `/public/show-code.js` (wrapping the key demo code in `// --- demo ---` / `// --- /demo ---`
   markers) over hand-copied `<pre><code>` snippets that drift out of sync with the running code.
4. **How it works** — concise mechanics of the exact API surface and any composition boundary.
5. **Live checks (`<details class="live-checks">`)** — out-of-flow fixtures so running checks holds
   the layout still with zero CLS; every check tests the exact spec contract, never broad baseline
   APIs.
6. **Findings** — empirical, dated, Chrome-versioned observations (including visible failures on
   stress/boundary tests and workarounds tested). State `"not verified"` for anything not actually
   run in Chrome. Follow with a short `see also` section linking sibling concepts.

### Per-concept `page.json` metadata (optional / additive)

On new or upgraded concept folders, add `v<N>/<feature-slug>/<concept-slug>/page.json` to make the
experiment machine-discoverable across the site:

```json
{
  "title": "Short concept title",
  "blurb": "One-sentence summary of what the page tests.",
  "kind": "starter | experiment | stress | composition | migration",
  "question": "Concrete, falsifiable question this concept answers.",
  "result": "Empirical observed outcome (or \"not verified\" if not run).",
  "testedIn": "Chrome 150.0.x (macOS) on 2026-11-24",
  "api": ["ExactIDL.method", "css-property"],
  "composesWith": ["Shadow DOM", "View Transitions"],
  "friction": [
    {
      "summary": "Short description of the browser bug or API limit hit.",
      "kind": "bug | limit | spec-gap | flag-required",
      "repro": "Minimal steps to reproduce on this page.",
      "browser": "Chrome 150.0.x",
      "issueUrl": "https://issues.chromium.org/issues/...",
      "workaround": "What worked instead, or none."
    }
  ]
}
```

`page.json` is additive (older concept pages without it keep working) and powers three site
surfaces automatically: the **"About this experiment"** box injected under `<p class="lede">`, the
site-wide **`/friction/`** browser-bug and API-limit ledger, and the **`/experiments/`** cross-API
explorer.

## Step 8: Commit per feature, push, move on

Before committing, start the local server and verify each new concept with `chrome-devtools-mcp`:

- Open every concept route in Chrome or Chrome Canary.
- Exercise every button, input, slider, tab, toggle, and "try it" action.
- Confirm each interaction changes the expected DOM, live readout, network result, permission state,
  or fallback banner.
- Inspect console and network logs; fix unhandled errors, failed same-origin demo routes, blank
  states, and stale readouts.
- Verify accessibility: tab through the demo, confirm visible focus, check that each control has an
  accessible name/label, confirm custom widgets expose correct role/state, and use the Chrome
  DevTools accessibility tree when state is visual-only or ARIA-backed.
- For unsupported, origin-trial, flag-gated, OS-specific, or device-specific features, verify the
  fallback clearly states the missing capability and never reports fake success.

**Anti-regression gate (all must pass before you push — these ARE the standalone-robustness bar):**

1. **Exact-API check** — evaluate the exact advertised probe/API call in the page context and
   compare its real return/exception with the banner and enabled controls. UI claim and real API
   must agree (rules 4, 10).
2. **Visual + geometry** — capture full-page before/after screenshots (plus mobile when layout
   changes) and inspect: popover/tooltip adjacent to invoker, `shape-outside` on the promised side,
   no gradient/content bleed, no clipped/overlapping controls (rule 11).
3. **Contrast** — inspect computed foreground/background on every code/status/output surface; WCAG
   AA (rule 11, invariant 5).
4. **Probe can return false** — no `|| true`, no never-throwing detector, no stale enum catch-all,
   no "upgrade to Chrome N" without ruling out flag/OT/download/hardware/permission/policy (rule
   10).
5. **No crashes** — syntax-check inline scripts, avoid host-global collisions (`top`, `animate`),
   normalise return shapes before chaining, guard async init (rule 10).
6. **Fresh evidence** — reload from disk after your FINAL edit and repeat the whole control
   sequence; evidence from before the last edit is invalid (rule 11).

7. **Route regression gate** — run `npm run check-routes` (or `node scripts/check-routes.mjs`). It
   compares the previously published route manifest (origin/main, falling back to
   `.route-manifest.baseline.json`) against the working tree and must PASS (exit 0). It fails if
   this run deleted/renamed a published route, repurposed a slug's identity, or dropped a feature's
   concept count. New demos are additive and pass automatically; an incomplete-feature fix must keep
   every existing route/concept and only ADD. If you had to intentionally move/remove a published
   route, record it in `migrations.json` with `{ id, action, from, to, reason, evidence, date }`
   before pushing.

8. **Mobile + desktop parity gate** — run the responsive matrix for every demo you built or fixed
   (`npm run responsive-check -- <id> --merge`): mobile ≈360×740 DPR3 touch AND desktop ≈1280×800.
   It asserts no horizontal overflow + console/network clean and screenshots both classes; `Read`
   both screenshots and judge legibility, tap targets, focus, and dialogs. Record each touched
   demo's result in its per-feature `v<N>/<feature-slug>/_support.json` sidecar (`ok`, or
   `unsupported`+evidence when a class is genuinely unavailable — a genuinely-unavailable class is
   `blocked` with evidence, NEVER a fake pass, and you must NOT auto-download an absent large model
   to force a pass). The route gate (item 7) now also FAILS if a touched demo is left
   untested/broken on a supported class, or if any demo is recorded broken on a class it claims to
   support, and it reports mobile/desktop coverage denominators.

9. **modern-web-guidance & writing gate** — you consulted `modern-web-guidance` FIRST for the
   specific UI/API topics before writing/fixing any HTML/CSS/JS (see the mandate above), and the
   touched demo's critique records the consultation in `guidanceConsulted`. The gate fails a touched
   demo whose critique has an empty `guidanceConsulted`. Also run `npm run check:writing` to catch
   AI-slop filler in demo prose.

If any gate fails, fix the demo and re-run the gate. Do not push a feature without passing all nine.
The full catalogue is the showcase-auto-research SKILL "Mandatory anti-regression cases" — every
item there is a build rule now, not just a review rule.

```bash
git add v<N>/<feature-slug>/
git commit -m "v<N>: build demos for <listing name>

Concepts: <c-1>, <c-2>[, <c-3>]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

One feature per commit. If past 90 minutes, stop.

## Step 9: Retired — per-release Uber demos removed 2026-08-27

Per-release Uber demos were removed on 2026-08-27 (see `migrations.json`) so all effort goes to
per-feature starters and hypothesis-driven experiments. Do NOT open `[v<N>] Uber demo concept`
issues or create `v<N>/uber-demo/` folders.

## Step 10: Summary

Log channels, per-milestone counts, features built (SHA + live URL), any `_server.ts` files needing
`npm run gen:feature-servers` on merge, and stop reason.

## Safety

- Never overwrite existing `v<N>/<slug>/`.
- Never edit outside `v<N>/` and `/tmp`. `server.ts`, `routes/`, `lib/`, `public/`, `package.json`,
  `scripts/`, `CLAUDE.md`, and existing `conformance.json` suites are off-limits. Per-feature
  support sidecars (`v<N>/<feature-slug>/_support.json`, updated via
  `npm run responsive-check -- <id> --merge`) and co-located feature handlers
  (`v<N>/<feature-slug>/_server.ts`) live inside `v<N>/`, so you may write them freely; the ONLY
  outside-`v<N>/` generated output you may write is `reports/responsive/` (screenshots).
- Run `npm run check-routes` (read-only) before every push; it must PASS. Never destructively
  replace a published route/slug/identity — add new slugs, patch existing demos in the smallest way.
- Each run pushes to its own `claude/*` branch and opens one PR; a human merges it. Stack on the
  newest open routine PR (Critical Rule 12) instead of starting again from `main`.
- Do not open GitHub issues for per-feature work or retired Uber demos.
- Respect the 90-minute deadline.
- **Slug from listing name. Milestone from listing position. CSS variables only. WCAG AA contrast.
  No fake simulations. All five inviolable.**
