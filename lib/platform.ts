// Runtime seam between the route handlers and the host.
//
// The routes were written against Deno's APIs (filesystem reads, Deno.env,
// Deno KV, Deno.upgradeWebSocket). The site now also runs on Cloudflare
// Workers, which has none of those: files come from the static-assets binding,
// directory listings come from a manifest generated at build time, secrets
// come from the Worker `env`, and WebSockets come from WebSocketPair.
//
// Routes call `platform()` instead of `Deno.*`. Under Deno (local dev, the test
// suites, `deno task start`) the default implementation below is exactly the
// old behaviour. The Worker entry (`worker/index.ts`) installs its own
// implementation with `installPlatform()` before handling any request.

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
  /** Short name, for diagnostics: "deno" or "cloudflare-workers". */
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
// process's working directory. Only read by the Deno implementation.
function denoRepoPath(path: string): string {
  const rel = path.replace(/^\.\//, "").replace(/^\/+/, "");
  return new URL(`../${rel}`, import.meta.url).pathname;
}

type DenoLike = {
  readFile(path: string): Promise<Uint8Array<ArrayBuffer>>;
  readTextFile(path: string): Promise<string>;
  stat(path: string): Promise<FileStat>;
  readDir(path: string): AsyncIterable<DirEntry>;
  realPath(path: string): Promise<string>;
  env: { get(name: string): string | undefined };
  openKv?: () => Promise<MinimalKv>;
  upgradeWebSocket(req: Request, options?: { protocol?: string }): UpgradedSocket;
};

function denoPlatform(): Platform {
  const D = (globalThis as unknown as { Deno: DenoLike }).Deno;
  return {
    name: "deno",
    readFile: (path) => D.readFile(denoRepoPath(path)),
    readTextFile: (path) => D.readTextFile(denoRepoPath(path)),
    stat: (path) => D.stat(denoRepoPath(path)),
    readDir: (path) => D.readDir(denoRepoPath(path)),
    realPath: (path) => D.realPath(denoRepoPath(path)),
    env: (name) => D.env.get(name),
    openKv: async () => {
      if (typeof D.openKv !== "function") return null;
      return await D.openKv();
    },
    upgradeWebSocket: (req, options) => D.upgradeWebSocket(req, options),
  };
}

let current: Platform | null = null;

export function platform(): Platform {
  if (!current) current = denoPlatform();
  return current;
}

/** Called once by a non-Deno entry point before it serves any request. */
export function installPlatform(next: Platform): void {
  current = next;
}
