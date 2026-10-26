"use strict";
let current;
let tabId;
let busy = false;
const byId = id => document.getElementById(id);
async function request(message) {
  const result = await chrome.runtime.sendMessage({ ...message, tabId });
  if (!result || result.error) throw new Error(result?.error || "No se pudo guardar el cambio");
  return result;
}
function render(state) {
  current = state;
  for (const key of ["enabled", "allowClickedLinks", "strictRedirects"]) byId(key).checked = state.settings[key];
  byId("host").textContent = state.hostname || "Página del navegador";
  byId("status").textContent = !state.hostname ? "Abre una página http o https" :
    !state.settings.enabled ? "Protección global pausada" : state.allowed ? "Este sitio tiene permiso para abrir pestañas" : "Protección activa";
  byId("site").textContent = state.allowed ? "Proteger este sitio" : "Permitir este sitio";
  byId("site").disabled = !state.hostname || !state.settings.enabled;
  byId("popups").textContent = state.popups;
  byId("redirects").textContent = state.redirects;
  byId("last").hidden = !state.last;
  byId("last").textContent = state.last ? `Último: ${state.last.host} · ${state.last.reason}` : "";
}
function feedback(text, error = false) {
  byId("feedback").textContent = text;
  byId("feedback").classList.toggle("error", error);
}
async function change(message) {
  if (busy) { if (current) render(current); return; }
  busy = true;
  try {
    render(await request(message));
    feedback("Guardado. Recarga las páginas abiertas para aplicar todos los cambios.");
  } catch (error) {
    feedback(error.message, true);
    if (current) render(current);
  } finally { busy = false; }
}
for (const key of ["enabled", "allowClickedLinks", "strictRedirects"]) {
  byId(key).addEventListener("change", () => change({ type: "setOptions", [key]: byId(key).checked }));
}
byId("site").addEventListener("click", () => change({ type: "setSiteAllowed", allowed: !current.allowed }));
(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error("No se encontró la pestaña activa");
    tabId = tab.id;
    render(await request({ type: "getPopup" }));
  } catch (error) { feedback(error.message, true); }
})();

byId("reload").addEventListener("click", async () => {
  try { await chrome.tabs.reload(tabId); window.close(); }
  catch { feedback("No se pudo recargar esta página.", true); }
});
if (StayHereSupport.url) {
  try {
    const url = new URL(StayHereSupport.url);
    if (url.protocol === "https:" && url.hostname === "ko-fi.com" && !url.username && !url.password && url.pathname !== "/") {
      byId("support").href = url.href;
      byId("support").hidden = false;
      byId("support-note").hidden = false;
      byId("support").addEventListener("click", async event => {
        event.preventDefault();
        try { await chrome.tabs.create({ url: url.href, active: true }); }
        catch { feedback("No se pudo abrir Ko-fi. Inténtalo de nuevo.", true); }
      });
    }
  } catch { /* Leave support hidden until a valid creator URL is configured. */ }
}
