(function () {
  const HANDLER_BASE =
    "/v149/payment-request-allow-payment-handlers-to-report-back-internal-errors/error-reporting-demo/";
  const METHOD_URL = new URL("payment-method-manifest.json", location.origin + HANDLER_BASE).href;
  const WORKER_URL = new URL("payment-handler.js", location.origin + HANDLER_BASE).href;

  const scenarioMap = {
    success: "success",
    abort: "abort_error",
    "abort_error": "abort_error",
    internal: "operation_error",
    operation: "operation_error",
    "operation_error": "operation_error",
    "op-crash": "operation_error",
    expired: "card_expired",
    "op-card": "card_expired",
    "card_expired": "card_expired",
    funds: "insufficient_funds",
    "op-funds": "insufficient_funds",
    "insufficient_funds": "insufficient_funds",
    timeout: "network_error",
    "network_timeout": "network_error",
    network: "network_error",
    "op-net": "network_error",
    "network_error": "network_error",
    "3ds_required": "three_ds_required",
    "three_ds_required": "three_ds_required",
    generic: "generic_error",
    "generic_abort": "generic_error",
    "generic_error": "generic_error",
  };

  function isSupported() {
    return "PaymentRequest" in window && "serviceWorker" in navigator;
  }

  function selectedScenario(value) {
    return scenarioMap[value] || value || "success";
  }

  function paymentDetails(overrides = {}) {
    return {
      id: overrides.id || `showcase-${Date.now()}`,
      total: overrides.total || {
        label: "Chrome Platform Showcase order",
        amount: { currency: "GBP", value: "48.48" },
      },
      displayItems: overrides.displayItems || [
        { label: "Developer Reference Book", amount: { currency: "GBP", value: "39.99" } },
        { label: "Chrome 149 Sticker Pack", amount: { currency: "GBP", value: "4.99" } },
        { label: "Shipping", amount: { currency: "GBP", value: "3.50" } },
      ],
    };
  }

  async function waitForActivation(registration) {
    if (registration.active) return;
    const worker = registration.installing || registration.waiting;
    if (!worker) return;
    await new Promise((resolve) => {
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") resolve();
      });
    });
  }

  async function install() {
    if (!isSupported()) {
      throw new Error("Payment Request or service workers are not available in this browser.");
    }
    const registration = await navigator.serviceWorker.register(WORKER_URL, {
      scope: HANDLER_BASE,
    });
    await waitForActivation(registration);
    if (!registration.paymentManager?.instruments) {
      throw new Error(
        "registration.paymentManager.instruments is not available. Enable Payment Handler support in Chrome.",
      );
    }
    await registration.paymentManager.instruments.set("showcase-pay", {
      name: "Showcase Pay",
      method: METHOD_URL,
      icons: [],
    });
    return { scope: registration.scope, methodUrl: METHOD_URL };
  }

  async function canMakePayment(details = paymentDetails()) {
    if (!("PaymentRequest" in window)) {
      throw new Error("PaymentRequest is not available.");
    }
    const request = new PaymentRequest([{ supportedMethods: METHOD_URL }], details);
    return await request.canMakePayment();
  }

  async function run(value, details = paymentDetails()) {
    if (!("PaymentRequest" in window)) {
      return {
        ok: false,
        name: "NotSupportedError",
        message: "PaymentRequest is not available.",
      };
    }
    const handlerScenario = selectedScenario(value);
    const request = new PaymentRequest([{
      supportedMethods: METHOD_URL,
      data: { scenario: handlerScenario },
    }], details);

    try {
      const response = await request.show();
      await response.complete("success");
      return {
        ok: true,
        scenario: handlerScenario,
        methodName: response.methodName,
        details: response.details,
      };
    } catch (error) {
      return {
        ok: false,
        scenario: handlerScenario,
        name: error.name,
        message: error.message,
      };
    }
  }

  function parseMessage(message) {
    try {
      return JSON.parse(message);
    } catch (_) {
      return null;
    }
  }

  window.showcasePaymentHandler = {
    methodUrl: METHOD_URL,
    isSupported,
    install,
    canMakePayment,
    run,
    paymentDetails,
    parseMessage,
    selectedScenario,
  };
})();
