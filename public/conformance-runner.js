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
