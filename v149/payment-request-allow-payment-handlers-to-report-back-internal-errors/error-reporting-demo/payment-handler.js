self.addEventListener("canmakepayment", (event) => {
  event.respondWith(true);
});

self.addEventListener("paymentrequest", (event) => {
  const methodData = event.methodData?.[0] ?? {};
  const scenario = methodData.data?.scenario ?? "success";

  if (scenario === "operation_error") {
    event.respondWith(Promise.reject(
      new DOMException("Issuer processor timed out inside the payment app.", "OperationError"),
    ));
    return;
  }

  if (scenario === "abort_error") {
    event.respondWith(Promise.reject(
      new DOMException("User cancelled in the payment app.", "AbortError"),
    ));
    return;
  }

  if (scenario === "generic_error") {
    event.respondWith(Promise.reject(new Error("Legacy handler failure.")));
    return;
  }

  event.respondWith(Promise.resolve({
    methodName: methodData.supportedMethods,
    details: {
      transactionId: `showcase-${Date.now()}`,
      handledBy: "Showcase Pay service worker",
    },
  }));
});
