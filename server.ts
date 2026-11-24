// chrome-platform-showcase
// Node HTTP entry (local dev, tests, `npm start`). The route table lives in
// routes/dispatch.ts, shared with the Cloudflare Worker entry (worker/index.ts),
// so this file only binds a port and bridges node:http to fetch-style
// Request/Response objects. Production runs on Workers; this is never deployed.

import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { WebSocket as WsSocket } from "ws";
import { installPlatform, platform, type UpgradedSocket } from "./lib/platform.ts";
import { dispatch, type RouteContext } from "./routes/dispatch.ts";
import { peerAddress, serve, toRequest } from "./server/http.ts";

const PORT = Number(process.env.PORT ?? 3000);

// Upgrade requests carry their raw socket here until a route asks to upgrade.
interface PendingUpgrade {
  node: IncomingMessage;
  socket: Duplex;
  head: Buffer;
  upgraded: boolean;
}
const pending = new WeakMap<Request, PendingUpgrade>();
const wss = new WebSocketServer({
  noServer: true,
  // Echo back the subprotocol the route chose (see upgradeWebSocket below).
  handleProtocols: (_offered, req) =>
    (req as IncomingMessage & { chosenProtocol?: string }).chosenProtocol ?? false,
});

// The routes drive sockets Deno-style: `onopen`/`onmessage`/`onclose`/`onerror`
// properties, `send`, `close`, `readyState`. The ws socket only exists once the
// handshake completes, after the route has assigned its handlers, so hand the
// route a shim and wire it up when the real socket arrives.
function denoStyleSocket(): { shim: WebSocket; attach(ws: WsSocket): void } {
  const handlers: Record<string, ((event: unknown) => void) | null> = {};
  let real: WsSocket | null = null;
  const queued: Array<string | ArrayBufferLike | ArrayBufferView> = [];
  const shim = {
    get readyState() {
      return real ? real.readyState : 0;
    },
    get protocol() {
      return real?.protocol ?? "";
    },
    send(data: string | ArrayBufferLike | ArrayBufferView) {
      if (real) real.send(data as string);
      else queued.push(data);
    },
    close(code?: number, reason?: string) {
      real?.close(code, reason);
    },
  } as Record<string, unknown>;
  for (const type of ["open", "message", "close", "error"]) {
    Object.defineProperty(shim, `on${type}`, {
      get: () => handlers[type] ?? null,
      set: (fn: ((event: unknown) => void) | null) => {
        handlers[type] = fn;
      },
    });
  }
  return {
    shim: shim as unknown as WebSocket,
    attach(ws) {
      real = ws;
      ws.on("message", (data, isBinary) => {
        handlers.message?.({ data: isBinary ? data : data.toString() });
      });
      ws.on("close", (code, reason) => {
        handlers.close?.({ code, reason: reason.toString(), wasClean: true });
      });
      ws.on("error", (error) => handlers.error?.({ error }));
      for (const data of queued.splice(0)) ws.send(data as string);
      // ws may finish the handshake synchronously, before the route has
      // assigned `onopen`, so fire it on the next task.
      setTimeout(() => {
        if (ws.readyState === 1) handlers.open?.({ type: "open" });
      }, 0);
    },
  };
}

const base = platform();
installPlatform({
  ...base,
  upgradeWebSocket(req, options): UpgradedSocket {
    const entry = pending.get(req);
    if (!entry) throw new TypeError("not a WebSocket upgrade request");
    entry.upgraded = true;
    (entry.node as IncomingMessage & { chosenProtocol?: string }).chosenProtocol = options
      ?.protocol;
    const { shim, attach } = denoStyleSocket();
    wss.handleUpgrade(entry.node, entry.socket, entry.head, attach);
    // undici refuses status 101, and the handshake is written by ws anyway;
    // this placeholder only tells the bridge below the route accepted.
    return { socket: shim, response: new Response(null, { status: 200 }) };
  },
});

function context(node: IncomingMessage): RouteContext {
  // The socket peer, which a client cannot forge (see lib/auth-throttle.ts).
  return { remoteAddr: peerAddress(node) };
}

const listener = await serve(
  { port: PORT },
  (req, info) => dispatch(req, { remoteAddr: info.remoteAddr.hostname }),
);
const server = listener.server;

server.on("upgrade", async (node: IncomingMessage, socket: Duplex, head: Buffer) => {
  const req = toRequest(node, `localhost:${PORT}`);
  const entry: PendingUpgrade = { node, socket, head, upgraded: false };
  pending.set(req, entry);
  try {
    const res = await dispatch(req, context(node));
    if (entry.upgraded) return;
    // The route did not upgrade: answer over the raw socket and close it.
    const body = new Uint8Array(await res.arrayBuffer());
    const lines = [`HTTP/1.1 ${res.status} ${res.statusText || ""}`.trimEnd()];
    res.headers.forEach((value, name) => {
      if (name !== "content-length" && name !== "connection") lines.push(`${name}: ${value}`);
    });
    lines.push(`content-length: ${body.byteLength}`, "connection: close", "", "");
    socket.end(Buffer.concat([Buffer.from(lines.join("\r\n")), body]));
  } catch (err) {
    console.error(err);
    socket.destroy();
  }
});

console.log(`Listening on http://localhost:${listener.addr.port}`);
