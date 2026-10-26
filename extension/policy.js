/* Pure decisions shared by the worker and the automated checks. */
(() => {
  "use strict";
  const defaults = Object.freeze({
    enabled: true,
    allowClickedLinks: false,
    strictRedirects: false,
    allowedHosts: []
  });
  function webURL(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url : null;
    } catch { return null; }
  }
  function normalizeSettings(value = {}) {
    return {
      enabled: typeof value.enabled === "boolean" ? value.enabled : defaults.enabled,
      allowClickedLinks: typeof value.allowClickedLinks === "boolean" ? value.allowClickedLinks : defaults.allowClickedLinks,
      strictRedirects: typeof value.strictRedirects === "boolean" ? value.strictRedirects : defaults.strictRedirects,
      allowedHosts: Array.isArray(value.allowedHosts)
        ? [...new Set(value.allowedHosts.filter(host => typeof host === "string" && host.length < 254).map(host => host.toLowerCase()))].slice(0, 500)
        : []
    };
  }
  function protectedURL(url, settings) {
    const parsed = webURL(url);
    return Boolean(settings.enabled && parsed && !settings.allowedHosts.includes(parsed.hostname));
  }
  function matchesIntent(intent, url, kind, now) {
    if (!intent || intent.kind !== kind || intent.until < now) return false;
    const expected = webURL(intent.url);
    const actual = webURL(url);
    if (!expected || !actual) return false;
    if (intent.form) return expected.origin === actual.origin && expected.pathname === actual.pathname;
    expected.hash = "";
    actual.hash = "";
    return expected.href === actual.href;
  }
  function unexpectedRedirect(previousURL, details, settings, intended) {
    const before = webURL(previousURL);
    const after = webURL(details.url);
    const qualifiers = details.transitionQualifiers || [];
    return Boolean(
      settings.strictRedirects && protectedURL(previousURL, settings) && before && after &&
      before.hostname !== after.hostname && qualifiers.includes("client_redirect") &&
      !qualifiers.includes("forward_back") && !qualifiers.includes("from_address_bar") &&
      !["typed", "auto_bookmark"].includes(details.transitionType) && !intended
    );
  }
  globalThis.QuedatePolicy = Object.freeze({ defaults, webURL, normalizeSettings, protectedURL, matchesIntent, unexpectedRedirect });
})();
