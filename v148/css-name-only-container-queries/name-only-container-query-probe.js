(function () {
  function supportsNameOnlyContainerQuery() {
    if (!window.CSS || typeof CSS.supports !== "function") return false;
    if (!CSS.supports("container-name: probe-root")) return false;

    const host = document.createElement("div");
    host.style.containerName = "probe-root";
    host.style.position = "absolute";
    host.style.inlineSize = "1px";
    host.style.blockSize = "1px";
    host.style.overflow = "hidden";
    host.style.inset = "-9999px auto auto -9999px";

    const child = document.createElement("span");
    child.className = "name-only-probe-child";
    host.append(child);

    const style = document.createElement("style");
    style.textContent =
      "@container probe-root { .name-only-probe-child { --name-only-probe: supported; } }";

    document.head.append(style);
    document.body.append(host);
    const supported = getComputedStyle(child)
      .getPropertyValue("--name-only-probe")
      .trim() === "supported";

    host.remove();
    style.remove();
    return supported;
  }

  function containerTypeOf(element) {
    return getComputedStyle(element).containerType || "normal";
  }

  function matchedToken(element, propertyName) {
    return getComputedStyle(element).getPropertyValue(propertyName).trim() ||
      "base";
  }

  window.NameOnlyContainerQuery = {
    supportsNameOnlyContainerQuery,
    containerTypeOf,
    matchedToken,
  };
})();
