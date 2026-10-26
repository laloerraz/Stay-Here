/* Isolated world: only real browser events may grant a deliberate navigation. */
(() => {
  "use strict";
  const channel = "quedate-aqui-v1";
  let policy = { protected: true, allowClickedLinks: false, strictRedirects: false };
  let activation = { form: null, time: 0 };
  function send(message) {
    return chrome.runtime.sendMessage(message).catch(() => null);
  }
  async function refreshPolicy() {
    const next = await send({ type: "policy" });
    if (!next || next.error) return;
    policy = next;
    if (policy.protected && policy.strictRedirects) scanRefresh(document);
  }
  function webURL(value) {
    if (typeof value !== "string" || !value) return null;
    try {
      const url = new URL(value, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url : null;
    } catch { return null; }
  }
  function newContext(target) {
    const effective = target || document.querySelector("base[target]")?.target || "_self";
    return !["_self", "_top", "_parent"].includes(effective.toLowerCase());
  }
  function linkFor(event) {
    return event.composedPath().find(node => node instanceof Element && node.matches("a[href], area[href]"));
  }
  function cancel(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function blocked(url) { send({ type: "blocked", url }); }
  function onClick(event) {
    if (!policy.protected || !event.isTrusted || (event.type === "auxclick" && event.button !== 1)) return;
    const link = linkFor(event);
    if (!link || link.hasAttribute("download")) return;
    const url = webURL(link.href);
    if (!url) return;
    const deliberateNewTab = event.button === 1 || event.ctrlKey || event.metaKey || event.shiftKey;
    if (newContext(link.getAttribute("target")) || deliberateNewTab) {
      cancel(event);
      if (deliberateNewTab || policy.allowClickedLinks) {
        send({ type: "openTrustedLink", url: url.href, active: !deliberateNewTab || event.shiftKey });
      } else blocked(url.href);
      return;
    }
    send({ type: "intent", kind: "navigate", url: url.href });
  }
  window.addEventListener("click", onClick, true);
  window.addEventListener("auxclick", onClick, true);
  window.addEventListener("contextmenu", event => {
    if (!policy.protected || !event.isTrusted) return;
    const url = webURL(linkFor(event)?.href);
    if (url) send({ type: "intent", kind: "newTab", url: url.href, contextMenu: true });
  }, true);
  for (const type of ["pointerdown", "keydown"]) {
    window.addEventListener(type, event => {
      if (event.isTrusted) activation = { form: event.target?.form || event.target?.closest?.("form"), time: Date.now() };
    }, true);
  }
  window.addEventListener("submit", event => {
    if (!policy.protected) return;
    const form = event.target;
    const target = event.submitter?.getAttribute("formtarget") || form.getAttribute("target");
    const opensNew = newContext(target);
    const url = webURL(event.submitter?.getAttribute("formaction") || form.action || location.href);
    const deliberate = event.isTrusted && activation.form === form && Date.now() - activation.time < 1500;
    if (opensNew && (!deliberate || !policy.allowClickedLinks)) {
      cancel(event);
      blocked(url?.href || "");
    } else if (url && deliberate) {
      send({ type: "intent", kind: opensNew ? "newTab" : "navigate", url: url.href, form: true });
    }
  }, true);
  window.addEventListener("message", event => {
    if (event.source === window && event.data?.channel === channel && event.data.type === "blocked" && policy.protected) {
      blocked(typeof event.data.url === "string" ? event.data.url.slice(0, 2048) : "");
    }
  });
  function scanRefresh(root) {
    if (!policy.protected || !policy.strictRedirects) return;
    const metas = [...(root.querySelectorAll?.("meta[http-equiv]") || [])];
    if (root.matches?.("meta[http-equiv]")) metas.push(root);
    for (const meta of metas) {
      if (meta.httpEquiv.toLowerCase() !== "refresh") continue;
      const match = meta.content.match(/^\s*[\d.]+\s*;\s*url\s*=\s*(.+)$/i);
      const destination = match && webURL(match[1].replace(/^["']|["']$/g, ""));
      if (destination && destination.hostname !== location.hostname) {
        meta.remove();
        blocked(destination.href);
      }
    }
  }
  new MutationObserver(records => {
    if (!policy.protected || !policy.strictRedirects) return;
    for (const record of records) {
      if (record.type === "attributes") scanRefresh(record.target);
      else for (const node of record.addedNodes) if (node.nodeType === 1) scanRefresh(node);
    }
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["http-equiv", "content"] });
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "local") refreshPolicy();
  });
  window.addEventListener("pageshow", refreshPolicy);
  refreshPolicy();
})();
