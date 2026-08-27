// Service worker for the Background Fetch CORS demos.
//
// Background Fetch requires a service worker: the download outlives the page,
// so the events land here. This one does the minimum to make the demos real —
// it reports each background fetch outcome back to whichever page is open, and
// it does not intercept ordinary navigation or asset requests at all.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function tell(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  for (const client of clients) client.postMessage(message);
}

// Report what actually arrived, per record: whether the response was there at
// all, its status, and its type. A CORS failure shows up as a record whose
// response never resolves.
async function summarise(registration) {
  const records = await registration.matchAll();
  const rows = [];
  for (const record of records) {
    const url = record.request.url;
    try {
      const response = await Promise.race([
        record.responseReady,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("responseReady did not settle in 5s")), 5000)
        ),
      ]);
      rows.push({
        url,
        ok: Boolean(response) && response.ok,
        status: response ? response.status : null,
        type: response ? response.type : null,
      });
    } catch (error) {
      rows.push({ url, ok: false, error: `${error.name}: ${error.message}` });
    }
  }
  return {
    id: registration.id,
    result: registration.result,
    failureReason: registration.failureReason,
    downloaded: registration.downloaded,
    downloadTotal: registration.downloadTotal,
    rows,
  };
}

async function report(type, event) {
  await tell({
    type: `${type}:fired`,
    id: event.registration.id,
    result: event.registration.result,
  });
  const summary = await summarise(event.registration);
  await tell({ type, ...summary });
}

self.addEventListener("backgroundfetchsuccess", (event) => {
  event.waitUntil((async () => {
    await report("backgroundfetchsuccess", event);
    try {
      await event.updateUI({ title: "Fetch complete" });
    } catch (error) {
      // updateUI can only be called once per event; a failure here must not
      // lose the report above.
      await tell({ type: "updateui-failed", message: `${error.name}: ${error.message}` });
    }
  })());
});

self.addEventListener("backgroundfetchfail", (event) => {
  event.waitUntil(report("backgroundfetchfail", event));
});

self.addEventListener("backgroundfetchabort", (event) => {
  event.waitUntil(tell({ type: "backgroundfetchabort", id: event.registration.id }));
});

self.addEventListener("message", (event) => {
  if (event.data === "ping") event.source?.postMessage({ type: "pong" });
});
