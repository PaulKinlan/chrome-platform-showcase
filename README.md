# chrome-platform-showcase

A showcase site of premium, hand-crafted demos for every new web platform feature shipping in
Chrome. One small interactive demo per API per release. One bigger "uber" demo per release that
combines several APIs into something compelling.

The site is generated and maintained by an automated routine:

1. Every run fetches the [chromestatus.com](https://chromestatus.com/) JSON API for the current,
   upcoming, and backfilled Chrome milestones.
2. For features that do not yet have a demo, the routine builds the feature page and every distinct
   interactive concept it can identify from the ChromeStatus entry, specs, docs, and explainers.
3. The routine commits one feature at a time directly to `main`. Deno Deploy redeploys from GitHub.
4. Humans review the live output and tighten the routine prompt, demos, or server routes as needed.

Per-release uber demos are the exception: those are larger editorial experiences that combine
several APIs and still get a separate concept pass before implementation.

## Why

- Capture _what shipped_ in plain code that anyone can read and copy.
- Backfill old releases the same way so we end up with a living catalogue of the web platform.
- Set a high design bar (cards, type, motion, dark/light) so even small demos feel premium.
- Practical input for talks, posts, docs, training data, and demos for the Chrome team.

## Layout

```
chrome-platform-showcase/
  server.ts              Deno HTTP entry. Routes /v<N>/* to per-release handlers.
  deno.json              Tasks + fmt config.
  lib/                   Shared streaming helpers and a sibling-file loader.
  public/styles.css      Shared design system: palette, type, surfaces, motion.
  v<N>/                  Per-release directory.
    index.html           Index page listing every feature demo + the uber showcase.
    uber-demo/           The larger combined demo for that Chrome release.
    <feature-slug>/      One folder per feature, with index.html + concept subfolders.
```

Chrome milestones from `v130/` onward are backfilled as the same loop works through the ChromeStatus
archive.

## Running it

```
deno task dev
# open http://localhost:3000/
```

Useful checks:

```
deno task check
deno task audit
```

## License

Apache 2.0. See [LICENSE](./LICENSE).

Copyright 2026 Paul Kinlan.
