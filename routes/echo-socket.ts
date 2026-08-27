// A same-origin WebSocket echo endpoint, so demos about the WebSocket
// constructor have a real server to talk to.
//
// Several Chrome 154 features change how a WebSocket is *opened* — an options
// bag instead of positional arguments, a targetAddressSpace for local network
// access. Demonstrating them needs a handshake that actually completes, and a
// server that reports back what it saw: which subprotocol was negotiated, what
// the client asked for, and what headers arrived.
//
// It echoes text frames and closes on request. Nothing is stored, and the
// connection is bounded so a forgotten tab cannot hold a socket open forever.

const MAX_LIFETIME_MS = 5 * 60 * 1000;
const MAX_FRAME_BYTES = 64 * 1024;

export function handleEchoSocketRoute(req: Request): Response | null {
  const url = new URL(req.url);
  if (url.pathname !== "/public/echo-socket") return null;

  if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    // A plain GET is useful for checking the route exists without a handshake.
    return new Response(
      JSON.stringify({
        endpoint: "/public/echo-socket",
        usage: "connect with a WebSocket; send text frames and they come back",
        subprotocols: ["echo", "echo.v2", "chat", "soap"],
      }),
      { headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  // Negotiate a subprotocol only from the set the client actually offered,
  // and only from the ones this endpoint knows. Picking one the client did
  // not offer is a protocol error, not a friendly default.
  const offered = (req.headers.get("sec-websocket-protocol") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const known = ["echo.v2", "echo", "chat", "soap"];
  const chosen = known.find((name) => offered.includes(name));

  // Everything the welcome frame reports has to be read from the request
  // BEFORE the upgrade: once the upgrade response is returned, Deno
  // invalidates the request and reading a header from it throws.
  const origin = req.headers.get("origin");

  const { socket, response } = Deno.upgradeWebSocket(
    req,
    chosen ? { protocol: chosen } : undefined,
  );

  const opened = Date.now();
  const timer = setTimeout(() => {
    try {
      socket.close(1000, "server lifetime cap reached");
    } catch { /* already closed */ }
  }, MAX_LIFETIME_MS);

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: "welcome",
      negotiated: chosen ?? null,
      offered,
      origin: origin ?? null,
      // Echo back the request headers a demo might want to inspect, without
      // anything identifying: this is a fixture, not a logging endpoint.
      sawUpgrade: true,
      at: opened,
    }));
  };

  socket.onmessage = (event) => {
    const data = typeof event.data === "string" ? event.data : "";
    if (data.length > MAX_FRAME_BYTES) {
      socket.send(JSON.stringify({ type: "error", reason: "frame too large" }));
      return;
    }
    if (data === "__close__") {
      socket.close(1000, "client asked to close");
      return;
    }
    socket.send(JSON.stringify({ type: "echo", data, negotiated: chosen ?? null }));
  };

  socket.onclose = () => clearTimeout(timer);
  socket.onerror = () => clearTimeout(timer);

  return response;
}
