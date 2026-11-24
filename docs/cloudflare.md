# Hosting on Cloudflare Workers

The site runs on Cloudflare Workers with static assets. Locally, Node runs `server.ts`
(`npm start`), which every test suite and the routines use. The Worker serves the same routes from
the same code.

## How it fits together

```
request ──> worker/index.ts ──> routes/dispatch.ts ──> routes/*.ts   (same table as server.ts)
                │
                └─ installs a Workers implementation of lib/platform.ts:
                     files     ASSETS binding (dist/worker-assets, staged at build time)
                     readDir   dist/worker-assets/_worker/fs-manifest.json
                     env       Worker vars + secrets
                     KV        D1 (SHOWCASE_DB) via worker/d1.ts, Deno KV-shaped API
                     WebSocket WebSocketPair, wrapped to the routes' socket shape
```

- **Routes never touch the host directly.** They call `platform()` from `lib/platform.ts`, whose
  default implementation reads the repository from disk under Node; `server.ts` adds WebSocket
  upgrades (via `ws`). `npm run test-worker-platform` fails if a route, lib module, Worker file or
  `v<N>/**/_server.ts` sidecar imports `node:fs`/`node:http`/similar, reads `process.env`, or calls
  `Deno.*`, because that works locally and throws on Workers.
- **Static files.** `scripts/build-worker-assets.mjs` copies `v<N>/**`, `public/**`,
  `demo-index.json` and `gendn-links.json` into `dist/worker-assets/` and writes the manifest. Every
  `_questions.json` and `conformance.json` is also bundled into `_worker/bundle-<name>`, so the
  listing pages load two files instead of ~3,200 (each asset read is a subrequest). `_server.ts`
  sidecars are never staged; they are bundled as code through the static registry in
  `routes/release.ts`. wrangler runs this script automatically before `dev` and `deploy`.
- **Every request reaches the Worker first** (`run_worker_first`), because demo HTML is rewritten on
  the way out (breadcrumbs, conformance panel, telemetry script) and internal files
  (`conformance.json`, `_questions.json`, the manifest) must only be served where a route chooses
  to.
- **Telemetry and the Reporting API.** `/telemetry/demo`, `/telemetry/demo/report` (the
  `Reporting-Endpoints` / CSP report-only target set on every demo page), events, triage and admin
  run unchanged from `routes/demo-telemetry.ts`. Storage is D1 through a Deno KV-shaped adapter;
  schema in `migrations/`. Add new tables as `migrations/0002_*.sql`.
- **Client address for auth throttling.** `lib/auth-throttle.ts` keys on the client address. On
  Workers that is `CF-Connecting-IP`, which Cloudflare's edge sets and overwrites, so a client
  cannot forge it the way it could an ordinary header.

## One-time setup

1. **D1 database.** Done: `chrome-platform-showcase` (id in `wrangler.jsonc`) exists with
   `0001_kv.sql` applied. Later migrations:
   `npx wrangler@4.167.0 d1 migrations apply chrome-platform-showcase --remote`.

2. **Workers Builds.** Done: the `chrome-platform-showcase` Worker is connected to this repo with
   two triggers. "Deploy on push to main" runs `npx wrangler@4.167.0 deploy`. "Branch previews" runs
   `npx wrangler@4.167.0 versions upload` for every other branch. Both leave the build command
   empty, because wrangler's build hook stages the assets.
3. **Secret** for the telemetry admin pages: `npx wrangler@4.167.0 secret put showcase_password`
   (same value as the old Deno Deploy secret).
4. **Custom domain (optional).** The Worker answers on
   `chrome-platform-showcase.<subdomain>.workers.dev`. To use your own domain, add it under the
   Worker's Settings → Domains & Routes. Do this only when you are ready to switch traffic.

## Day to day

| Task                         | Command                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Run locally on Node (normal) | `npm start`                                                                  |
| Run locally on workerd       | `npm run dev:worker`                                                         |
| Check the Worker bundles     | `npx wrangler deploy --dry-run --outdir dist/wb`                             |
| Stage assets only            | `npm run worker-assets`                                                      |
| Host-seam tests              | `npm run test-worker-platform`                                               |
| Apply a new D1 migration     | `npx wrangler@4.167.0 d1 migrations apply chrome-platform-showcase --remote` |
| Deploy                       | push to `main` (Workers Builds)                                              |

Where chromestatus.com is unreachable (sandboxes, offline CI), set `CHROMESTATUS_API_BASE` (an env
var for `npm start`, a `vars` entry or `.dev.vars` for wrangler) to a local fixture server.

## Limits worth knowing

- Static assets: 20,000 files per version on the free plan (about 8,200 today), 25 MiB per file. The
  staging script fails the build before either is hit.
- CPU: `/critiques` and `/conformance/run-all` build 0.8 MB and 2 MB pages, which needs more than
  the free plan's 10 ms CPU per request. Use Workers Paid.
- D1 free tier: 5 GB storage, 100k writes/day. Telemetry expires after 90 days on read; rows are
  swept every 200 writes.
- No Node host APIs (`node:fs`, `node:http`, `process.env`) on Workers, and no dynamic `import()` of
  a `_server.ts` that is not in the static registry (`npm run test-header-grammar` already pins the
  registry).

## Verified before the switch

Locally, `wrangler dev` (workerd) was compared with `npm run start` against the same chromestatus
fixture: all 8,199 staged paths (every demo page, concept, asset and the listing pages) returned the
same status, content type and body, apart from directory iteration order on `/critiques` and
`/conformance` (same entries) and the GitHub "last updated" line, which needs outbound network.
Telemetry storage and read-back (in-memory locally vs D1), the DPO report round trip, both WebSocket
endpoints and the 429 auth throttle behaved identically.
