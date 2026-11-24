// fetch-style HTTP serving on node:http, shared by server.ts and the test
// suites that need a throwaway listener. `serve(options, handler)` takes the
// same handler shape the routes use (Request in, Response out) and resolves
// once the port is bound, so `listener.addr.port` is real even for port 0.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { Readable } from "node:stream";

export interface ServeInfo {
  /** The socket peer, which a client cannot forge. */
  remoteAddr: { hostname: string | null };
}

export type Handler = (req: Request, info: ServeInfo) => Response | Promise<Response>;

export interface Listener {
  server: Server;
  addr: { hostname: string; port: number };
  /** Stop accepting, wait for in-flight responses; resolves when closed. */
  shutdown(): Promise<void>;
  /** Close every connection now, in-flight or idle. */
  close(): Promise<void>;
  /** Settles when the listener has closed. */
  finished: Promise<void>;
}

export function peerAddress(node: IncomingMessage): string | null {
  return node.socket.remoteAddress?.replace(/^::ffff:/, "") ?? null;
}

export function toRequest(node: IncomingMessage, fallbackHost = "localhost"): Request {
  const url = `http://${node.headers.host ?? fallbackHost}${node.url ?? "/"}`;
  const headers = new Headers();
  for (const [name, value] of Object.entries(node.headers)) {
    if (Array.isArray(value)) { for (const v of value) headers.append(name, v); }
    else if (value !== undefined) headers.set(name, value);
  }
  const method = node.method ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  const controller = new AbortController();
  node.socket.once("close", () => controller.abort());
  return new Request(url, {
    method,
    headers,
    signal: controller.signal,
    body: hasBody ? (Readable.toWeb(node) as ReadableStream<Uint8Array>) : undefined,
    duplex: hasBody ? "half" : undefined,
  } as RequestInit);
}

export async function sendResponse(res: Response, out: ServerResponse): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  res.headers.forEach((value, name) => {
    if (name !== "set-cookie") headers[name] = value;
  });
  const cookies = res.headers.getSetCookie();
  if (cookies.length) headers["set-cookie"] = cookies;
  out.writeHead(res.status, res.statusText, headers);
  if (!res.body) {
    out.end();
    return;
  }
  const reader = res.body.getReader();
  out.on("close", () => reader.cancel().catch(() => {}));
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!out.write(value)) await new Promise((r) => out.once("drain", r));
    }
  } finally {
    out.end();
  }
}

export function serve(
  options: {
    port?: number;
    hostname?: string;
    onListen?: (addr: { hostname: string; port: number }) => void;
  },
  handler: Handler,
): Promise<Listener> {
  const server = createServer(async (node, out) => {
    try {
      const req = toRequest(node, node.headers.host ?? `localhost:${options.port ?? 0}`);
      await sendResponse(await handler(req, { remoteAddr: { hostname: peerAddress(node) } }), out);
    } catch (err) {
      console.error(err);
      if (!out.headersSent) out.writeHead(500, { "content-type": "text/plain" });
      out.end("Internal Server Error");
    }
  });
  const finished = new Promise<void>((resolve) => server.once("close", () => resolve()));
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, options.hostname, () => {
      server.off("error", reject);
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : options.port ?? 0;
      options.onListen?.({ hostname: options.hostname ?? "0.0.0.0", port });
      resolve({
        server,
        addr: { hostname: options.hostname ?? "0.0.0.0", port },
        shutdown: () => {
          server.close();
          server.closeIdleConnections();
          return finished;
        },
        close: () => {
          server.close();
          server.closeAllConnections();
          return finished;
        },
        finished,
      });
    });
  });
}
