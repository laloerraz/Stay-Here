"use strict";
// Browser-only fixture. Production always talks to the real extension worker.
const previewState = {
  tabId: 1, hostname: "example.com", allowed: false,
  popups: 12, redirects: 3, last: null,
  settings: { language: "en", enabled: true, allowClickedLinks: true, strictRedirects: false, allowedHosts: [] }
};
window.chrome = {
  tabs: {
    query: async () => [{ id: 1 }],
    reload: async () => { document.body.dataset.previewReloaded = "true"; },
    create: async ({ url }) => { document.body.dataset.previewSupport = url; }
  },
  runtime: { sendMessage: async message => {
    if (message.type === "setOptions") {
      for (const key of ["enabled", "allowClickedLinks", "strictRedirects"]) {
        if (typeof message[key] === "boolean") previewState.settings[key] = message[key];
      }
      if (["en", "es"].includes(message.language)) previewState.settings.language = message.language;
    }
    if (message.type === "setSiteAllowed") previewState.allowed = message.allowed;
    return structuredClone(previewState);
  } }
};
