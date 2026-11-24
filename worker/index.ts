// Cloudflare Workers entry for chrome-platform-showcase.
//
// Serves the same routes as server.ts (routes/dispatch.ts) by installing a
// Workers implementation of lib/platform.ts:
//
//   files      -> the ASSETS static-assets binding (dist/worker-assets, staged
//                 by scripts/build-worker-assets.mjs before every build)
//   readDir    -> dist/worker-assets/_worker/fs-manifest.json, written by the
//                 same script, since the asset store cannot be listed
//   env        -> Worker vars and secrets (`wrangler secret put showcase_password`)
//   KV         -> the SHOWCASE_DB D1 binding, adapted to Deno KV's API
//                 (worker/d1.ts; Workers KV via SHOWCASE_KV as a fallback);
//                 with neither, telemetry storage is off, exactly as on a Deno
//                 host without KV
//   WebSocket  -> WebSocketPair
//
// Every request reaches this Worker first (`run_worker_first: true`), so files
// in the asset store are only reachable through the routes, as on Deno.

import { installPlatform, type MinimalKv, type Platform } from "../lib/platform.ts";
import { dispatch } from "../routes/dispatch.ts";
import { cloudflareKv, type KVNamespaceLike } from "./kv.ts";
import { type D1DatabaseLike, d1Kv } from "./d1.ts";
import {
  assetRequest,
  buildIndex,
  type FsIndex,
  type FsManifest,
  MANIFEST_PATH,
  normalize,
  notFound,
} from "./fs.ts";

interface AssetsBinding {
  fetch(input: Request | string): Promise<Response>;
}

export interface Env {
  ASSETS: AssetsBinding;
  SHOWCASE_DB?: D1DatabaseLike;
  SHOWCASE_KV?: KVNamespaceLike;
  [name: string]: unknown;
}

// The routes drive sockets Deno-style: `onopen`/`onmessage`/`onclose`/`onerror`
// properties, `send`, `close`, `readyState`. An accepted Workers socket is
// already open and never fires `open`, and handler properties are not reliable
// across runtimes, so wrap it: handlers become listeners, and `open` is fired
// on the next task, after the route has assigned `onopen`.
function denoStyleSocket(ws: WebSocket): WebSocket {
  const handlers: Record<string, ((event: Event) => void) | null> = {};
  for (const type of ["message", "close", "error"]) {
    ws.addEventListener(type, (event) => handlers[type]?.(event));
  }
  setTimeout(() => {
    if (ws.readyState === 1) handlers.open?.(new Event("open"));
  }, 0);
  const shim = {
    get readyState() {
      return ws.readyState;
    },
    get protocol() {
      return ws.protocol;
    },
    send: (data: string | ArrayBufferLike | ArrayBufferView) =>
      ws.send(data as string | ArrayBuffer),
    close: (code?: number, reason?: string) => ws.close(code, reason),
    addEventListener: ws.addEventListener.bind(ws),
    removeEventListener: ws.removeEventListener.bind(ws),
  } as Record<string, unknown>;
  for (const type of ["open", "message", "close", "error"]) {
    Object.defineProperty(shim, `on${type}`, {
      get: () => handlers[type] ?? null,
      set: (fn: ((event: Event) => void) | null) => {
        handlers[type] = fn;
      },
    });
  }
  return shim as unknown as WebSocket;
}

declare const WebSocketPair: {
  new (): { 0: WebSocket; 1: WebSocket };
};

function workersPlatform(env: Env): Platform {
  let indexPromise: Promise<FsIndex> | null = null;
  const index = (): Promise<FsIndex> => {
    if (!indexPromise) {
      indexPromise = env.ASSETS.fetch(assetRequest(MANIFEST_PATH))
        .then((res) => {
          if (!res.ok) throw new Error(`fs manifest missing (${res.status})`);
          return res.json() as Promise<FsManifest>;
        })
        .then(buildIndex)
        .catch((err) => {
          indexPromise = null; // retry on the next request
          throw err;
        });
    }
    return indexPromise;
  };

  const readFile = async (path: string): Promise<Uint8Array<ArrayBuffer>> => {
    const key = normalize(path);
    if (!(await index()).files.has(key)) throw notFound(path);
    const res = await env.ASSETS.fetch(assetRequest(key));
    if (!res.ok) throw notFound(path);
    return new Uint8Array(await res.arrayBuffer());
  };

  let kvAdapter: MinimalKv | null | undefined;

  return {
    name: "cloudflare-workers",
    readFile,
    readTextFile: async (path) => new TextDecoder().decode(await readFile(path)),
    stat: async (path) => {
      const key = normalize(path);
      const idx = await index();
      if (idx.files.has(key)) return { isFile: true, isDirectory: false };
      if (idx.dirs.has(key)) return { isFile: false, isDirectory: true };
      throw notFound(path);
    },
    readDir: (path) => ({
      async *[Symbol.asyncIterator]() {
        const key = normalize(path);
        const children = (await index()).dirs.get(key);
        if (!children) throw notFound(path);
        for (const [name, kind] of children) yield { name, ...kind };
      },
    }),
    // The asset store has no symlinks, so there is nothing to canonicalise.
    realPath: () => Promise.resolve(null),
    env: (name) => {
      const value = env[name];
      return typeof value === "string" ? value : undefined;
    },
    openKv: () => {
      if (kvAdapter === undefined) {
        kvAdapter = env.SHOWCASE_DB
          ? d1Kv(env.SHOWCASE_DB)
          : env.SHOWCASE_KV
          ? cloudflareKv(env.SHOWCASE_KV)
          : null;
      }
      return Promise.resolve(kvAdapter);
    },
    upgradeWebSocket: (_req, options) => {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1] as WebSocket & { accept(): void };
      server.accept();
      const headers = new Headers();
      if (options?.protocol) headers.set("sec-websocket-protocol", options.protocol);
      const response = new Response(null, {
        status: 101,
        headers,
        webSocket: client,
      } as ResponseInit);
      return { socket: denoStyleSocket(server), response };
    },
  };
}

let installed = false;

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    // Bindings are fixed for the life of an isolate, so install once; the
    // platform's manifest cache then survives across requests.
    if (!installed) {
      installPlatform(workersPlatform(env));
      installed = true;
    }
    // Cloudflare's edge sets CF-Connecting-IP to the connecting client's
    // address and overwrites any value the client sent, so it plays the role
    // of Deno's socket peer for lib/auth-throttle.ts. Absent (e.g. a request
    // from another Worker), it falls back to the shared "unknown" bucket.
    const remoteAddr = req.headers.get("cf-connecting-ip");
    return dispatch(req, { remoteAddr });
  },
};
