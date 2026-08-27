// Running a conformance suite means deliberately calling APIs that are absent,
// gated behind user activation, or designed to reject — `navigator.credentials
// .create({digital})`, `credentials.get({mediation:"immediate"})`, a view
// transition that is skipped immediately. Those calls settle promises the
// assertion never awaited, so the rejections reached the page as uncaught
// errors and the responsive harness reported clean demos as broken.
//
// A rejection raised while an assertion is running belongs to the probe, not to
// the page. `withProbeRejectionsCaptured` claims them for the duration of the
// run (plus a short tail, because "notify about rejected promises" runs at the
// end of a task, not synchronously) and hands them back so the caller can
// surface them. It never swallows them silently, and it never covers page code
// running outside a suite.
export async function withProbeRejectionsCaptured(run) {
  const captured = [];
  const onRejection = (event) => {
    captured.push(event.reason);
    event.preventDefault();
  };
  const target = globalThis.addEventListener ? globalThis : null;
  target?.addEventListener("unhandledrejection", onRejection);
  try {
    return { value: await run(), captured };
  } finally {
    // Two task turns: one for rejections queued by the final assertion, one for
    // any they queue in turn.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    target?.removeEventListener("unhandledrejection", onRejection);
  }
}

export async function runConformanceAssertion(kind, test, expect, environment = globalThis) {
  try {
    function propertyDescriptor(target, property) {
      let current = Object(target);
      while (current) {
        const descriptor = Object.getOwnPropertyDescriptor(current, property);
        if (descriptor) return descriptor;
        current = Object.getPrototypeOf(current);
      }
      return undefined;
    }

    if (kind === "css-supports") {
      return { ok: !!environment.CSS?.supports(test), blocked: false, detail: "" };
    }

    if (kind === "exists" || kind === "typeof") {
      const parts = test.split(".");
      let current = environment;
      for (let index = 0; index < parts.length; index++) {
        const property = parts[index];
        if (current == null) {
          return { ok: false, blocked: false, detail: `missing at ${property}` };
        }
        if (index === parts.length - 1) {
          if (kind === "exists") {
            const ok = property in Object(current);
            return { ok, blocked: false, detail: ok ? "" : "undefined" };
          }
          let actual;
          try {
            actual = typeof current[property];
          } catch (error) {
            const descriptor = propertyDescriptor(current, property);
            if (!descriptor) throw error;
            actual = "value" in descriptor ? typeof descriptor.value : "accessor";
          }
          return {
            ok: actual === expect,
            blocked: false,
            detail: `typeof = ${actual}`,
          };
        }
        current = current[property];
      }
      return { ok: false, blocked: false, detail: "empty path" };
    }

    if (kind === "script") {
      const result = new Function(`return (${test})`)();
      const resolved = result instanceof Promise ? await result : result;
      return { ok: !!resolved, blocked: false, detail: String(resolved) };
    }

    if (kind === "manual") {
      return { ok: false, blocked: true, detail: test };
    }

    if (kind === "throws") {
      try {
        const result = new Function(`return (${test})`)();
        const resolved = result instanceof Promise ? await result : result;
        return {
          ok: false,
          blocked: false,
          detail: `no throw (resolved to ${resolved})`,
        };
      } catch (error) {
        return {
          ok: true,
          blocked: false,
          detail: error?.name || "threw",
        };
      }
    }

    return { ok: false, blocked: false, detail: "unknown kind" };
  } catch (error) {
    return {
      ok: false,
      blocked: false,
      detail: error?.message || String(error),
    };
  }
}
