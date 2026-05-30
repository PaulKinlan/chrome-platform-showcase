// SharedWorker for the tab-counter demo. One process backs all tabs of this origin.
let count = 0;
const ports = new Set();

self.addEventListener("connect", (event) => {
  const port = event.ports[0];
  ports.add(port);

  // Announce a new connection so every tab can update its "tabs connected" count.
  for (const p of ports) p.postMessage({ type: "connected", count, tabs: ports.size });

  port.addEventListener("message", (e) => {
    if (e.data === "increment") count++;
    else if (e.data === "reset") count = 0;
    for (const p of ports) p.postMessage({ type: "update", count, tabs: ports.size });
  });

  port.addEventListener("close", () => {
    ports.delete(port);
    for (const p of ports) p.postMessage({ type: "update", count, tabs: ports.size });
  });

  port.start();
});
