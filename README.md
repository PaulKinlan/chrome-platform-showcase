# chrome-platform-showcase

A showcase site of premium, hand-crafted demos for every new web platform feature shipping in
Chrome. One demo per API per release, each carrying a portfolio of interactive concepts that put the
feature in the context of a real use case.

The site is generated and maintained by an automated routine:

1. Every run fetches the [chromestatus.com](https://chromestatus.com/) JSON API for the current,
   upcoming, and backfilled Chrome milestones.
2. For features that do not yet have a demo, the routine builds the feature page and every distinct
   interactive concept it can identify from the ChromeStatus entry, specs, docs, and explainers.
3. The routine commits one feature at a time directly to `main`. Deno Deploy redeploys from GitHub.
4. Humans review the live output and tighten the routine prompt, demos, or server routes as needed.

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
    index.html           Index page listing every feature demo.
    <feature-slug>/      One folder per feature, with index.html + concept subfolders.
  feature-lineage.json   Which milestone folders share a ChromeStatus feature id, and where it shipped.
  migrations.json        Recorded removals/moves for the durable-URL contract.
```

Chrome milestones from `v130/` onward are backfilled as the same loop works through the ChromeStatus
archive.

### One folder per feature

ChromeStatus lists a feature in the milestone listing for every milestone its shipping estimate
passes through, so `Capability Elements <usermedia> MVP` appears under v144, v149, v150 and v151.
Each ChromeStatus feature gets **one** folder carrying demos; a later listing of an already-built
feature does not get a second one. Folders that predate the rule keep their URLs and are recorded in
`feature-lineage.json`, and each of them carries a note saying which milestone the feature actually
shipped in and linking its siblings.

```
deno task feature-lineage   # rebuild the map from ChromeStatus
deno task apply-lineage     # write the note onto every affected page
deno task check-duplicates  # gate: no new duplicate folders, no missing notes
```

## Running it

```
deno task dev
# open http://localhost:3000/
```

Useful checks:

```
deno task check            # includes the duplication gate
deno task audit
deno task check-routes     # durable-URL contract
```

## License

Apache 2.0. See [LICENSE](./LICENSE).

Copyright 2026 Paul Kinlan.
