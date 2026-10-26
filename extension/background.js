"use strict";
importScripts("i18n.js", "policy.js", "guard.js");
let guardedDocuments = {};
const P = QuedatePolicy;
const text = (key, values) => StayHereText.get(settings.language, key, values);
let settings = P.normalizeSettings();
const states = new Map();
const handledTargets = new Set();
let queue = Promise.resolve();
const ready = (async () => {
  const [local, session, tabs, guards] = await Promise.all([
    chrome.storage.local.get("settings"),
    chrome.storage.session.get("tabStates"),
    chrome.tabs.query({}),
    chrome.storage.session.get("guardedDocuments")
  ]);
  guardedDocuments = guards.guardedDocuments || {};
  settings = P.normalizeSettings(local.settings);
  const saved = session.tabStates || {};
  for (const tab of tabs) {
    const state = saved[tab.id] || freshState(tab.url);
    state.url = P.webURL(tab.url)?.href || state.url || "";
    states.set(tab.id, state);
  }
})();

function freshState(url = "") {
  return { url, popups: 0, redirects: 0, last: null, intents: [], lastReturn: 0 };
}
function stateFor(tabId, url = "") {
  if (!states.has(tabId)) states.set(tabId, freshState(url));
  return states.get(tabId);
}
function enqueue(action) {
  const result = queue.then(() => ready).then(action);
  queue = result.catch(error => console.warn("Stay Here:", error.message));
  return result;
}
async function saveSession() {
  await chrome.storage.session.set({ tabStates: Object.fromEntries(states) });
}
function consumeIntent(state, url, kind, frameId) {
  const now = Date.now();
  state.intents = state.intents.filter(intent => intent.until >= now);
  const index = state.intents.findIndex(intent =>
    (frameId === undefined || intent.frameId === frameId) && P.matchesIntent(intent, url, kind, now));
  if (index < 0) return false;
  state.intents.splice(index, 1);
  return true;
}
async function badge(tabId) {
  const state = stateFor(tabId);
  const protectedPage = P.protectedURL(state.url, settings);
  const count = state.popups + state.redirects;
  await Promise.allSettled([
    chrome.action.setBadgeText({ tabId, text: protectedPage && count ? (count > 99 ? "99+" : String(count)) : "" }),
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#72A5F2" }),
    chrome.action.setTitle({ tabId, title: protectedPage ? text("badgeCount", { count }) : text("badgeUnprotected") })
  ]);
}
async function record(tabId, kind, url, reason) {
  const state = stateFor(tabId);
  state[kind] += 1;
  state.last = { host: P.webURL(url)?.hostname || "", reason };
  await Promise.all([badge(tabId), saveSession()]);
}
async function closePopup(sourceTabId, tabId, url, frameId) {
  if (sourceTabId === tabId || tabId < 0 || handledTargets.has(tabId)) return;
  const [source, target] = await Promise.all([
    chrome.tabs.get(sourceTabId).catch(() => null),
    chrome.tabs.get(tabId).catch(() => null)
  ]);
  if (!source || !target || !P.protectedURL(source.url, settings)) return;
  const state = stateFor(sourceTabId, source.url);
  if (consumeIntent(state, url, "newTab", frameId)) {
    handledTargets.add(tabId);
    await saveSession();
    return;
  }
  handledTargets.add(tabId);
  try { await chrome.tabs.remove(tabId); }
  catch { handledTargets.delete(tabId); return; }
  await record(sourceTabId, "popups", url, "popupClosed");
  if (target.active) await chrome.tabs.update(sourceTabId, { active: true }).catch(() => {});
}

chrome.webNavigation.onCreatedNavigationTarget.addListener(details => {
  enqueue(() => closePopup(details.sourceTabId, details.tabId, details.url, details.sourceFrameId));
});
// Also catch blank popunders that never start a normal web navigation.
chrome.tabs.onCreated.addListener(tab => {
  if (!Number.isInteger(tab.openerTabId)) return;
  setTimeout(() => {
    enqueue(async () => {
      const current = await chrome.tabs.get(tab.id).catch(() => null);
      if (current) await closePopup(tab.openerTabId, tab.id, current.pendingUrl || current.url || "");
    });
  }, 300);
});
chrome.webNavigation.onCommitted.addListener(details => {
  if (details.frameId !== 0) return;
  enqueue(async () => {
    const state = stateFor(details.tabId);
    const previous = state.url;
    const intended = consumeIntent(state, details.url, "navigate");
    state.url = details.url;
    const now = Date.now();
    if (P.unexpectedRedirect(previous, details, settings, intended) && now - state.lastReturn > 15000) {
      state.lastReturn = now;
      await record(details.tabId, "redirects", details.url, "redirectReturned");
      // webNavigation is observational: this restores the URL after commitment.
      // A cooldown prevents sites with on-load redirects from causing reload loops.
      await chrome.tabs.update(details.tabId, { url: previous }).catch(() => {});
    }
    state.intents = state.intents.filter(intent => intent.until >= now);
    await Promise.all([badge(details.tabId), saveSession()]);
  });
});
for (const event of [chrome.webNavigation.onHistoryStateUpdated, chrome.webNavigation.onReferenceFragmentUpdated]) {
  event.addListener(details => {
    if (details.frameId === 0) enqueue(async () => {
      stateFor(details.tabId).url = details.url;
      await saveSession();
    });
  });
}
chrome.tabs.onRemoved.addListener(tabId => {
  enqueue(async () => {
    states.delete(tabId);
    handledTargets.delete(tabId);
    guardedDocuments = Object.fromEntries(Object.entries(guardedDocuments).filter(([, id]) => id !== tabId));
    await chrome.storage.session.set({ guardedDocuments });
    await saveSession();
  });
});

async function policyFor(sender) {
  const tab = await chrome.tabs.get(sender.tab.id);
  const policy = {
    protected: P.protectedURL(tab.url, settings),
    allowClickedLinks: settings.allowClickedLinks,
    strictRedirects: settings.strictRedirects
  };
  // Only the extension can inject the policy. No page message can relax it.
  // Pin the exact document so a navigation race cannot inject into its successor.
  if (typeof sender.documentId === "string" && !(sender.documentId in guardedDocuments)) {
    await chrome.scripting.executeScript({
      target: { tabId: sender.tab.id, documentIds: [sender.documentId] },
      world: "MAIN", injectImmediately: true,
      func: installStayHereGuard, args: [policy]
    });
    guardedDocuments[sender.documentId] = sender.tab.id;
    await chrome.storage.session.set({ guardedDocuments });
  }
  return policy;
}
async function popupState(tabId) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const url = P.webURL(tab?.url);
  const state = stateFor(tabId, tab?.url || "");
  return {
    settings, hostname: url?.hostname || "", tabId,
    allowed: Boolean(url && settings.allowedHosts.includes(url.hostname)),
    protected: P.protectedURL(tab?.url, settings),
    popups: state.popups, redirects: state.redirects, last: state.last
  };
}
async function saveSettings(next) {
  settings = P.normalizeSettings(next);
  await chrome.storage.local.set({ settings });
  await Promise.allSettled([...states.keys()].map(badge));
}
async function handleMessage(message, sender) {
  if (sender.id !== chrome.runtime.id || !message || typeof message.type !== "string") throw new Error("invalidMessage");
  if (sender.tab && Number.isInteger(sender.tab.id) && !sender.url?.startsWith(chrome.runtime.getURL(""))) {
    const tabId = sender.tab.id;
    const state = stateFor(tabId, sender.tab.url);
    if (message.type === "policy") return policyFor(sender);
    if (message.type === "intent") {
      const url = P.webURL(message.url);
      if (!url || !["navigate", "newTab"].includes(message.kind)) return {};
      state.intents = state.intents.filter(intent => intent.until >= Date.now()).slice(-15);
      state.intents.push({ url: url.href, kind: message.kind, form: message.form === true,
        frameId: sender.frameId, until: Date.now() + (message.contextMenu ? 10000 : 4000) });
      await saveSession();
      return {};
    }
    if (message.type === "openTrustedLink") {
      const url = P.webURL(message.url);
      if (!url) return {};
      // No openerTabId: this is a new tab requested by our trusted isolated listener.
      await chrome.tabs.create({ url: url.href, active: message.active === true, windowId: sender.tab.windowId });
      return {};
    }
    if (message.type === "blocked" && (await policyFor(sender)).protected) {
      // MAIN-world reports are advisory only; they never grant an opening or change settings.
      const now = Date.now();
      if (now - (state.lastReport || 0) < 150) return {};
      state.lastReport = now;
      await record(tabId, "popups", String(message.url || "").slice(0, 4096), "pageIntercepted");
      return {};
    }
    return {};
  }
  if (!sender.url?.startsWith(chrome.runtime.getURL(""))) throw new Error("invalidOrigin");
  if (!Number.isInteger(message.tabId)) throw new Error("noTab");
  if (message.type === "getPopup") return popupState(message.tabId);
  if (message.type === "setOptions") {
    const next = { ...settings };
    for (const key of ["enabled", "allowClickedLinks", "strictRedirects"]) {
      if (typeof message[key] === "boolean") next[key] = message[key];
    }
    if (["en", "es"].includes(message.language)) next.language = message.language;
    await saveSettings(next);
    return popupState(message.tabId);
  }
  if (message.type === "setSiteAllowed") {
    const tab = await chrome.tabs.get(message.tabId);
    const host = P.webURL(tab.url)?.hostname;
    if (!host) throw new Error("openSiteFirst");
    const hosts = settings.allowedHosts.filter(item => item !== host);
    if (message.allowed === true) hosts.push(host);
    await saveSettings({ ...settings, allowedHosts: hosts });
    return popupState(message.tabId);
  }
  throw new Error("unknownOption");
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  enqueue(() => handleMessage(message, sender)).then(respond, error => respond({ error: error.message }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => enqueue(async () => {
  await saveSettings(settings);
}));
