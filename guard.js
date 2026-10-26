/* Injected by the extension into one document. Policy is private and fixed until reload. */
function installStayHereGuard(initialPolicy) {
  "use strict";
  const channel = "quedate-aqui-v1";
  const policy = Object.freeze({ ...initialPolicy });
  if (!policy.protected) return;
  const nativeOpen = window.open;
  const post = window.postMessage.bind(window);
  const baseTarget = () => document.querySelector("base[target]")?.target || "_self";
  const createsContext = target => !["_self", "_top", "_parent"].includes(String(target || baseTarget()).toLowerCase());
  function report(url) {
    let host = "";
    try { host = new URL(String(url || ""), location.href).origin; } catch {}
    post({ channel, type: "blocked", url: host }, "*");
  }
  function guardedOpen(url) {
    if (!policy.protected) return Reflect.apply(nativeOpen, this, arguments);
    report(url);
    return null;
  }
  try {
    Object.defineProperty(window, "open", {
      configurable: false, enumerable: true,
      get: () => guardedOpen, set: () => {}
    });
  } catch { window.open = guardedOpen; }
  const nativeAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    let external = false;
    try { external = new URL(this.href, location.href).hostname !== location.hostname; } catch {}
    if (policy.protected && (createsContext(this.target) || (policy.strictRedirects && external))) {
      report(this.href);
      return;
    }
    return Reflect.apply(nativeAnchorClick, this, arguments);
  };
  for (const name of ["submit", "requestSubmit"]) {
    const native = HTMLFormElement.prototype[name];
    if (typeof native !== "function") continue;
    HTMLFormElement.prototype[name] = function (submitter) {
      const target = submitter?.getAttribute?.("formtarget") || this.target;
      if (policy.protected && createsContext(target)) {
        report(this.action);
        return;
      }
      return Reflect.apply(native, this, arguments);
    };
  }
}
