# Source of truth for the chrome-platform-showcase routine

> This is the prompt the remote Claude Code routine receives. The live copy lives on the routine
> trigger (trig_01GtXjwvzEM5mhsktARhGeSx). When you change this file, ALSO push the change to the
> live routine via `RemoteTrigger.update`. Otherwise this drifts out of date.

---

You build per-feature demos for the chrome-platform-showcase project. Every run picks up where the
previous run left off and keeps building features that don't yet have a demo, committing and pushing
after each one. There is NO small per-run cap; the goal is to eventually have a demo folder for
every feature across every release that the project knows about.

This is NOT an issue-first flow. Per-feature work goes straight to code. Only the per-release Uber
demo uses an issue gate.

## CRITICAL RULES (READ ALL THREE)

Three rules that must never be broken. Each has bitten the project before:

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

Every time you decide to write a folder, the path MUST be `v<N>/<slug(listing_name)>` where N is the
milestone whose listing returned the feature.

## Step 1: Setup

Fresh checkout of PaulKinlan/chrome-platform-showcase. Configure git author:

```bash
git config user.email 'paul.kinlan@gmail.com'
git config user.name 'Paul Kinlan'
```

Note Unix time at start. Soft 45-minute budget. The cron fires hourly; the next run continues.
Better to leave 4 features behind than to corrupt a half-written folder.

## Step 2: Get current channels

```bash
curl -s https://chromestatus.com/api/v0/channels | tail -c +6 > /tmp/channels.json
```

Strip `)]}'\n`. `prev_stable = stable.mstone - 1`. Build order: prev_stable → stable → beta → dev.
Within each, prefer features with the richest reference material.

## Step 3: List candidates per milestone

```bash
curl -s "https://chromestatus.com/api/v0/features?milestone=N" | tail -c +6 > /tmp/features-N.json
```

Iterate every category in `features_by_type`. For each feature, save the milestone N and the listing
`name`. Slug from that name (lowercase, NFD-normalise, drop combining marks, runs of non-[a-z0-9] →
`-`, strip ends, truncate to 80). Skip if `v<N>/<slug>/index.html` exists. Skip Removed/Deprecated.

## Step 4: Build budget

No per-run cap. 2 to 3 concept demos per feature. 2 strong demos beat 3 mediocre ones.

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

## Step 6: Design demos

Distinct, premium, interactive. Use the actual API. CSS → before/after slider. HTTP → server-render
different responses (this is Deno). DOM/JS → live REPL or click-to-run.

Name each concept with a short evocative title. Slug it with the same rules.

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
  <title><listing name> — Chrome <N> — chrome platform showcase</title>
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

Each concept page follows the same shell with crumbs back to the feature index, the demo at the top,
a `<pre><code>` snippet under it, and a 'see also' section. Real working code. No fake screenshots.
Behind-a-flag features get a `.note` block at the top.

## Step 8: Commit per feature, push, move on

```bash
git add v<N>/<feature-slug>/
git commit -m "v<N>: build demos for <listing name>

Concepts: <c-1>, <c-2>[, <c-3>]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

One feature per commit. If past 45 minutes, stop.

## Step 9: Uber demo concept issue (only if room)

For each milestone N where ≥3 feature demos exist and there is no open issue titled
`[v<N>] Uber demo concept`, open one. Labels `milestone:<N>`, `uber-demo`, `needs-concept`. Body:
list features, suggest 3 Uber demo concepts combining 3+ features, recommend one.

## Step 10: Summary

Log channels, per-milestone counts, features built (SHA + live URL), stop reason, uber issues.

## Safety

- Never overwrite existing `v<N>/<slug>/`.
- Never edit outside `v<N>/` and `/tmp`. `server.ts`, `lib/`, `public/` are off-limits.
- Pushes go to main. No branches.
- Issues only for Uber demos.
- Respect the 45-minute deadline.
- **Slug from listing name. Milestone from listing position. CSS variables only. WCAG AA contrast.
  All four inviolable.**
