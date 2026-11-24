// Runtime seam between the route handlers and the host.
//
// The routes were first written against Deno's APIs (filesystem reads,
// Deno.env, Deno KV, Deno.upgradeWebSocket), and the interface below keeps that
// shape. On Cloudflare Workers files come from the static-assets binding,
// directory listings come from a manifest generated at build time, secrets
// come from the Worker `env`, and WebSockets come from WebSocketPair.
//
// Routes call `platform()` instead of touching the host directly. Under Node
// (local dev, the test suites, `npm start`) the default implementation below
// reads the repository from disk. The Worker entry (`worker/index.ts`) installs
// its own implementation with `installPlatform()` before handling any request.

export interface DirEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
}

export interface FileStat {
  isFile: boolean;
  isDirectory: boolean;
}

/** The subset of Deno.Kv the routes use. Keys are arrays, as in Deno KV. */
export interface MinimalKv {
  get<T = unknown>(key: unknown[]): Promise<{ key: unknown[]; value: T | null }>;
  set(key: unknown[], value: unknown, options?: { expireIn?: number }): Promise<unknown>;
  delete(key: unknown[]): Promise<void>;
  list<T = unknown>(
    selector: { prefix: unknown[] },
    options?: { reverse?: boolean; limit?: number },
  ): AsyncIterable<{ key: unknown[]; value: T }>;
}

/** The server side of an upgraded WebSocket, as Deno.upgradeWebSocket returns it. */
export interface UpgradedSocket {
  socket: WebSocket;
  response: Response;
}

export interface Platform {
  /** Short name, for diagnostics: "node" or "cloudflare-workers". */
  readonly name: string;
  /**
   * All paths are relative to the repository root ("v151/x/index.html",
   * "./demo-index.json", "public/styles.css"). A leading "./" is allowed.
   */
  readFile(path: string): Promise<Uint8Array<ArrayBuffer>>;
  readTextFile(path: string): Promise<string>;
  stat(path: string): Promise<FileStat>;
  readDir(path: string): AsyncIterable<DirEntry>;
  /**
   * Canonical path for symlink-containment checks, or null where the host has
   * no symlinks to escape through (the Workers asset store).
   */
  realPath(path: string): Promise<string | null>;
  env(name: string): string | undefined;
  /**
   * Durable key-value store, or null where none is configured. Rejects when a
   * store IS configured but failed to open, so callers can tell "absent" from
   * a transient failure.
   */
  openKv(): Promise<MinimalKv | null>;
  upgradeWebSocket(req: Request, options?: { protocol?: string }): UpgradedSocket;
}

// The repository root, resolved from this module so it does not depend on the
// process's working directory. Only read by the Node implementation.
function repoPath(path: string): string {
  const rel = path.replace(/^\.\//, "").replace(/^\/+/, "");
  return decodeURIComponent(new URL(`../${rel}`, import.meta.url).pathname);
}

type NodeFs = typeof import("node:fs/promises");

// The default implementation, for Node (local dev, the test suites,
// `npm start`). node:fs is loaded through process.getBuiltinModule rather than
// a static import so this module still bundles for Workers, which installs its
// own platform before any of this runs. server.ts adds WebSocket upgrades.
function nodePlatform(): Platform {
  const proc = (globalThis as unknown as {
    process?: { getBuiltinModule?(id: string): unknown; env: Record<string, string | undefined> };
  }).process;
  if (!proc?.getBuiltinModule) {
    throw new Error("platform(): no host platform installed and this is not Node");
  }
  const fs = proc.getBuiltinModule("node:fs/promises") as NodeFs;
  return {
    name: "node",
    readFile: async (path) => new Uint8Array(await fs.readFile(repoPath(path))),
    readTextFile: (path) => fs.readFile(repoPath(path), "utf8"),
    stat: async (path) => {
      const st = await fs.stat(repoPath(path));
      return { isFile: st.isFile(), isDirectory: st.isDirectory() };
    },
    readDir: (path) => ({
      async *[Symbol.asyncIterator]() {
        for (const entry of await fs.readdir(repoPath(path), { withFileTypes: true })) {
          // A symlink is neither; realPath() resolves it.
          yield { name: entry.name, isFile: entry.isFile(), isDirectory: entry.isDirectory() };
        }
      },
    }),
    realPath: (path) => fs.realpath(repoPath(path)),
    env: (name) => proc.env[name],
    // Local runs keep telemetry in memory; Workers stores it in D1.
    openKv: () => Promise.resolve(null),
    upgradeWebSocket: () => {
      throw new Error("WebSocket upgrades need the HTTP server in server.ts");
    },
  };
}

let current: Platform | null = null;

export function platform(): Platform {
  if (!current) current = nodePlatform();
  return current;
}

/** Called once by an entry point (server.ts, worker/index.ts) before it serves any request. */
export function installPlatform(next: Platform): void {
  current = next;
}
