# chrome-platform-showcase

A showcase site of premium, hand-crafted demos for every new web platform feature shipping in
Chrome. One small interactive demo per API per release. One bigger "uber" demo per release that
combines several APIs into something compelling.

The site is generated and maintained by an automated routine:

1. Each day the routine fetches the [chromestatus.com](https://chromestatus.com/) JSON API for the
   current and recent Chrome milestones.
2. For features that don't yet have a demo, it opens a GitHub issue proposing 2-3 concepts (using
   the chromestatus overview, motivation, spec links, and explainers).
3. A human picks a concept (or writes a different one) in the issue.
4. The routine opens a draft PR with a working demo.
5. The human reviews and merges. The site redeploys to Deno Deploy.

Same flow for the per-release uber demo, with the "concept lock" gate before any code lands.

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
  v148/                  Per-release directory.
    index.html           Index page listing every feature demo + the uber showcase.
    showcase/            The uber demo for Chrome 148.
    <feature-slug>/      One folder per feature, with handler.ts + index.html + assets.
```

`v148/` is the starting point. Earlier releases are a backlog the same loop will chew through.

## Running it

```
deno task dev
# open http://localhost:3000/
```

## License

Apache 2.0. See [LICENSE](./LICENSE).

Copyright 2026 Paul Kinlan.
