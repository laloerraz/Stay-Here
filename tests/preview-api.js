"use strict";
const previewState = {
  tabId: 1, hostname: "tu-pagina.com", protected: true, allowed: false,
  popups: 8, redirects: 0, last: null,
  settings: { enabled: true, allowClickedLinks: false, strictRedirects: false, allowedHosts: [] }
};
window.chrome = {
  tabs: { query: async () => [{ id: 1 }] },
  runtime: { sendMessage: async message => {
    if (message.type === "setOptions") for (const key of ["enabled", "allowClickedLinks", "strictRedirects"]) {
      if (typeof message[key] === "boolean") previewState.settings[key] = message[key];
    }
    if (message.type === "setSiteAllowed") previewState.allowed = message.allowed;
    return structuredClone(previewState);
  } }
};
