"use strict";
window.qa = { blocked: 0, opens: 0, intents: 0, nativeOpens: 0, policy: { protected: true, allowClickedLinks: false, strictRedirects: false }, storageListeners: [] };
window.qa.render = () => {
  const result = document.getElementById("result");
  if (result) result.textContent = `Aperturas bloqueadas: ${qa.blocked}\nEnlaces autorizados: ${qa.opens}\nIntenciones de navegar: ${qa.intents}\nAperturas nativas: ${qa.nativeOpens}\nProtección activa: ${qa.policy.protected}\nEnlaces reales permitidos: ${qa.policy.allowClickedLinks}\nRegreso opcional: ${qa.policy.strictRedirects}`;
};
// Deliberately replace native open before loading the production guard: a test
// failure is reported in the page without opening a real external destination.
window.open = () => { qa.nativeOpens++; qa.render(); return null; };
window.chrome = {
  runtime: { sendMessage: async message => {
    if (message.type === "policy") {
      if (!qa.installed) { installStayHereGuard(qa.policy); qa.installed = true; }
      return { ...qa.policy };
    }
    if (message.type === "blocked") qa.blocked++;
    if (message.type === "openTrustedLink") qa.opens++;
    if (message.type === "intent") qa.intents++;
    qa.render(); return {};
  } },
  storage: { onChanged: { addListener: fn => qa.storageListeners.push(fn) } }
};
