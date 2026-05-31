self.addEventListener("canmakepayment", (event) => {
  event.respondWith(true);
});

self.addEventListener("paymentrequest", (event) => {
  const methodData = event.methodData?.[0] ?? {};
  const scenario = methodData.data?.scenario ?? "success";

  const operationErrors = {
    operation_error: {
      type: "internal_error",
      message: "Issuer processor timed out inside the payment app.",
      retryable: true,
    },
    card_expired: {
      type: "card_expired",
      field: "expiry",
      card_last4: "4242",
      message: "The saved card has expired.",
      retryable: false,
    },
    insufficient_funds: {
      type: "insufficient_funds",
      balance: 42.50,
      required: 151.99,
      message: "The account balance is below the charge amount.",
      retryable: false,
    },
    network_error: {
      type: "timeout",
      retryable: true,
      retry_after_ms: 1000,
      message: "Payment processor timed out.",
    },
    three_ds_required: {
      type: "3ds_challenge_required",
      retryable: true,
      challenge_url: "https://bank.example/3ds",
      message: "The issuer requires a 3DS challenge for this transaction.",
    },
  };

  if (operationErrors[scenario]) {
    event.respondWith(Promise.reject(
      new DOMException(JSON.stringify(operationErrors[scenario]), "OperationError"),
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
