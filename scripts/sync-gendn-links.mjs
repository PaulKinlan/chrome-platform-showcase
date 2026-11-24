import { run } from "./lib/run.mjs";
import { readdir, stat, writeFile } from "node:fs/promises";

const OUTPUT = new URL("../gendn-links.json", import.meta.url);
const LOCAL_GENDN = new URL("../../gendn/", import.meta.url);
const ROUTE_RE = /^v\d+\/[^/]+\/index\.html$/;

async function localRoutes() {
  try {
    const routes = [];
    for (const release of await readdir(LOCAL_GENDN, { withFileTypes: true })) {
      if (!release.isDirectory() || !/^v\d+$/.test(release.name)) continue;
      for (
        const feature of await readdir(new URL(`${release.name}/`, LOCAL_GENDN), {
          withFileTypes: true,
        })
      ) {
        if (!feature.isDirectory()) continue;
        try {
          const page = new URL(`${release.name}/${feature.name}/index.html`, LOCAL_GENDN);
          if ((await stat(page)).isFile()) routes.push(`/${release.name}/${feature.name}/`);
        } catch {
          // Not a published feature route.
        }
      }
    }
    const result = await run("git", { cwd: LOCAL_GENDN.pathname, args: ["rev-parse", "HEAD"] });
    const commit = result.success
      ? new TextDecoder().decode(result.stdout).trim()
      : "local-unknown";
    return { routes, commit, source: "local-sibling" };
  } catch {
    return null;
  }
}

async function remoteRoutes() {
  const response = await fetch(
    "https://api.github.com/repos/PaulKinlan/gendn/git/trees/main?recursive=1",
    {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "chrome-platform-showcase-worklist",
      },
    },
  );
  if (!response.ok) throw new Error(`GitHub gendn tree returned ${response.status}`);
  const body = await response.json();
  const routes = body.tree
    .filter((entry) => entry.type === "blob" && ROUTE_RE.test(entry.path))
    .map((entry) => `/${entry.path.replace(/index\.html$/, "")}`);
  return { routes, commit: body.sha, source: "github-tree" };
}

const result = await localRoutes() || await remoteRoutes();
const routes = [...new Set(result.routes)].sort();
const payload = {
  schemaVersion: 1,
  sourceRepository: "https://github.com/PaulKinlan/gendn",
  sourceCommit: result.commit,
  source: result.source,
  routeCount: routes.length,
  routes,
};
await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `sync-gendn-links: ${routes.length} feature routes from ${result.source} @ ${
    result.commit.slice(0, 12)
  }`,
);
