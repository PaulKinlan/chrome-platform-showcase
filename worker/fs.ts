// Read-only filesystem view over the Workers static-assets binding, built from
// the manifest scripts/build-worker-assets.mjs writes. Pure functions only, so
// scripts/worker-platform.test.mjs can exercise them under Deno.

export interface FsManifest {
  files: string[];
}

export interface FsIndex {
  files: Set<string>;
  dirs: Map<string, Map<string, { isFile: boolean; isDirectory: boolean }>>;
}

export const ASSET_ORIGIN = "https://assets.invalid";
export const MANIFEST_PATH = "_worker/fs-manifest.json";

export function notFound(path: string): Error {
  const err = new Error(`No such file or directory: ${path}`);
  err.name = "NotFound";
  return err;
}

// "./v151/x/" -> "v151/x"; "." -> "". Rejects any path that climbs out.
export function normalize(path: string): string {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") throw notFound(path);
    parts.push(part);
  }
  return parts.join("/");
}

export function assetRequest(path: string): Request {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return new Request(`${ASSET_ORIGIN}/${encoded}`);
}

export function buildIndex(manifest: FsManifest): FsIndex {
  const files = new Set(manifest.files);
  const dirs: FsIndex["dirs"] = new Map([["", new Map()]]);
  for (const file of manifest.files) {
    const parts = file.split("/");
    for (let i = 0; i < parts.length; i++) {
      const parent = parts.slice(0, i).join("/");
      const isFile = i === parts.length - 1;
      if (!dirs.has(parent)) dirs.set(parent, new Map());
      dirs.get(parent)!.set(parts[i], { isFile, isDirectory: !isFile });
      if (!isFile) {
        const self = parts.slice(0, i + 1).join("/");
        if (!dirs.has(self)) dirs.set(self, new Map());
      }
    }
  }
  return { files, dirs };
}

/** File names whose contents are also bundled per kind (see build-worker-assets.mjs). */
export const BUNDLED_NAMES = ["_questions.json", "conformance.json"] as const;

/** The bundle a path's contents live in, or null when it is read individually. */
export function bundleFor(path: string): string | null {
  for (const name of BUNDLED_NAMES) {
    if (path === name || path.endsWith(`/${name}`)) return `_worker/bundle-${name}`;
  }
  return null;
}
