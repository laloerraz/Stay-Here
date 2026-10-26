"use strict";
let current;
let tabId;
let busy = false;
let language = "en";
let feedbackKey = "";
const byId = id => document.getElementById(id);
const t = (key, values) => StayHereText.get(language, key, values);
const legacyReasons = { "Pestaña o ventana emergente cerrada": "popupClosed", "Se volvió a la dirección anterior": "redirectReturned", "Apertura interceptada en la página": "pageIntercepted" };
function translate() {
  document.documentElement.lang = language;
  for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll("[data-i18n-label]")) node.setAttribute("aria-label", t(node.dataset.i18nLabel));
  for (const node of document.querySelectorAll("[data-i18n-title]")) node.title = t(node.dataset.i18nTitle);
  byId("language").value = language;
  byId("privacy-link").href = language === "es" ? "privacy.html" : "privacy.en.html";
  if (feedbackKey) byId("feedback").textContent = t(feedbackKey);
}
async function request(message) {
  const result = await chrome.runtime.sendMessage({ ...message, tabId });
  if (!result || result.error) throw new Error(result?.error || "saveError");
  return result;
}
function render(state) {
  current = state;
  language = state.settings.language === "es" ? "es" : "en";
  translate();
  for (const key of ["enabled", "allowClickedLinks", "strictRedirects"]) byId(key).checked = state.settings[key];
  byId("host").textContent = state.hostname || t("browserPage");
  byId("status").textContent = !state.hostname ? t("openWebPage") :
    !state.settings.enabled ? t("paused") : state.allowed ? t("allowedStatus") : t("active");
  byId("site").textContent = t(state.allowed ? "protectSite" : "allowSite");
  byId("site").disabled = !state.hostname || !state.settings.enabled;
  byId("popups").textContent = state.popups;
  byId("redirects").textContent = state.redirects;
  byId("last").hidden = !state.last;
  byId("last").textContent = state.last ? t("last", { host: state.last.host && state.last.host !== "Apertura sin dirección" ? state.last.host : t("unknownDestination"), reason: t(legacyReasons[state.last.reason] || state.last.reason) }) : "";
}
function feedback(key, error = false) {
  feedbackKey = t(key) === key ? "saveError" : key;
  const translated = t(feedbackKey);
  byId("feedback").textContent = translated === key && !["saved", "languageSaved"].includes(key) ? t("saveError") : translated;
  byId("feedback").classList.toggle("error", error);
}
async function change(message) {
  if (busy) { if (current) render(current); return; }
  busy = true;
  try {
    render(await request(message));
    feedback(message.language ? "languageSaved" : "saved");
  } catch (error) {
    feedback(error.message, true);
    if (current) render(current);
  } finally { busy = false; }
}
for (const key of ["enabled", "allowClickedLinks", "strictRedirects"]) {
  byId(key).addEventListener("change", () => change({ type: "setOptions", [key]: byId(key).checked }));
}
byId("site").addEventListener("click", () => { if (current) change({ type: "setSiteAllowed", allowed: !current.allowed }); });
byId("settings-toggle").addEventListener("click", () => {
  const open = byId("settings-panel").hidden;
  byId("settings-panel").hidden = !open;
  byId("settings-toggle").setAttribute("aria-expanded", String(open));
  if (open) byId("language").focus();
});
byId("language").addEventListener("change", () => change({ type: "setOptions", language: byId("language").value }));
(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error("noActiveTab");
    tabId = tab.id;
    render(await request({ type: "getPopup" }));
  } catch (error) { feedback(error.message, true); }
})();
byId("reload").addEventListener("click", async () => {
  try { await chrome.tabs.reload(tabId); window.close(); }
  catch { feedback("reloadError", true); }
});
translate();
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
        catch { feedback("supportError", true); }
      });
    }
  } catch { /* Keep support hidden until a valid creator URL is configured. */ }
}
