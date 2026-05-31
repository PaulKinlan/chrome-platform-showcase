// shared-state-board/worker.js — SharedWorker for the Shared State Board demo

const ports = new Map(); // portId -> port
let nextId = 1;

// Shared state
let users = []; // [{id, name, color}]
let clipboard = null; // {content, fromName, fromId, ts}
let counter = 0;
let messages = []; // [{id, fromName, fromId, text, ts}]
let msgSeq = 0;

function broadcast(msg, excludeId) {
  for (const [id, port] of ports) {
    if (id !== excludeId) port.postMessage(msg);
  }
}

function broadcastAll(msg) {
  for (const [, port] of ports) port.postMessage(msg);
}

function getState() {
  return { users, clipboard, counter, messages: messages.slice(-30) };
}

self.addEventListener("connect", (event) => {
  const port = event.ports[0];
  const portId = nextId++;

  ports.set(portId, port);

  port.addEventListener("message", (e) => {
    const data = e.data;
    if (!data || !data.type) return;

    switch (data.type) {
      case "JOIN": {
        const user = {
          id: portId,
          name: data.name || "Tab " + portId,
          color: data.color || "#000",
        };
        users.push(user);
        // Tell the joining port its own ID and full state
        port.postMessage({ type: "WELCOME", portId, state: getState() });
        // Tell everyone else a user joined
        broadcast({ type: "USER_JOINED", user, users }, portId);
        // Log to connection log for everyone
        broadcastAll({ type: "LOG", text: `${user.name} connected (port ${portId})` });
        break;
      }

      case "LEAVE": {
        users = users.filter((u) => u.id !== portId);
        ports.delete(portId);
        broadcastAll({ type: "USER_LEFT", portId, users });
        broadcastAll({ type: "LOG", text: `Port ${portId} disconnected` });
        break;
      }

      case "INCREMENT": {
        counter++;
        broadcastAll({ type: "COUNTER", counter });
        break;
      }

      case "COPY": {
        const user = users.find((u) => u.id === portId) || { name: "Unknown" };
        clipboard = { content: data.content, fromName: user.name, fromId: portId, ts: Date.now() };
        broadcastAll({ type: "CLIPBOARD", clipboard });
        break;
      }

      case "SEND_MSG": {
        const user = users.find((u) => u.id === portId) || { name: "Unknown", color: "#000" };
        const msg = {
          id: ++msgSeq,
          fromName: user.name,
          fromId: portId,
          color: user.color,
          text: data.text,
          ts: Date.now(),
        };
        messages.push(msg);
        if (messages.length > 50) messages.shift();
        broadcastAll({ type: "NEW_MSG", msg, messages: messages.slice(-30) });
        break;
      }

      case "BROADCAST": {
        const user = users.find((u) => u.id === portId) || { name: "Unknown" };
        broadcastAll({ type: "BROADCAST_MSG", from: user.name, text: data.text, portId });
        break;
      }
    }
  });

  port.start();

  // Send initial connection ack (before JOIN is received)
  port.postMessage({ type: "CONNECTED", portId });
});
