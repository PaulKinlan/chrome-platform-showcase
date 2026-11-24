// Co-located feature server for v149/disconnect-websockets-on-bfcache-entry:
// upgrades WebSocket connections on `/disconnect-websockets-on-bfcache-entry/ws`
// with heartbeat and echo messages so demos can observe bfcache disconnect behavior.

import { jsonResponse, randomBase64Url } from "../../lib/feature-servers/http-helpers.ts";
import { platform } from "../../lib/platform.ts";

function renderWebSocketBfcacheRoute(req: Request, sub: string): Response | null {
  if (sub !== "/disconnect-websockets-on-bfcache-entry/ws") return null;
  if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return jsonResponse({ error: "Expected WebSocket upgrade." }, { status: 426 });
  }

  const { socket, response } = platform().upgradeWebSocket(req);
  const id = randomBase64Url(6);
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: "hello",
      id,
      at: new Date().toISOString(),
      message: "Showcase WebSocket connected.",
    }));
    heartbeat = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "heartbeat", id, at: new Date().toISOString() }));
      }
    }, 3000);
  };
  socket.onmessage = (event) => {
    socket.send(JSON.stringify({
      type: "echo",
      id,
      at: new Date().toISOString(),
      data: event.data,
    }));
  };
  socket.onclose = () => {
    if (heartbeat !== undefined) clearInterval(heartbeat);
  };
  socket.onerror = () => {
    if (heartbeat !== undefined) clearInterval(heartbeat);
  };
  return response;
}

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  return renderWebSocketBfcacheRoute(req, sub);
}
