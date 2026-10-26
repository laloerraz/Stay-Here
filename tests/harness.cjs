const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const extension = fs.existsSync(path.join(__dirname, '..', 'manifest.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', 'extension');
const clone = value => structuredClone(value);
function event() {
  const listeners = [];
  return { addListener: fn => listeners.push(fn), emit: (...args) => listeners.forEach(fn => fn(...args)), listeners };
}
function worker(options = {}) {
  const tabs = new Map((options.tabs || [{ id: 1, url: 'https://video.example/watch', active: true, windowId: 1 }]).map(tab => [tab.id, clone(tab)]));
  const local = clone(options.local || {});
  const session = clone(options.session || {});
  const removed = [], updated = [], created = [], warnings = [], timers = [], injected = [];
  const storage = values => ({
    get: async key => ({ [key]: clone(values[key]) }),
    set: async object => Object.assign(values, clone(object))
  });
  const chrome = {
    scripting: { executeScript: async options => { injected.push(options); return []; } },
    storage: { local: storage(local), session: storage(session) },
    tabs: {
      query: async () => [...tabs.values()].map(clone),
      get: async id => { if (!tabs.has(id)) throw Error('Missing tab'); return clone(tabs.get(id)); },
      create: async properties => {
        const tab = { id: 100 + created.length, ...clone(properties) };
        created.push(tab); tabs.set(tab.id, tab); return clone(tab);
      },
      remove: async id => { if (!tabs.delete(id)) throw Error('Missing tab'); removed.push(id); },
      update: async (id, change) => {
        if (!tabs.has(id)) throw Error('Missing tab');
        updated.push({ id, ...clone(change) }); Object.assign(tabs.get(id), clone(change)); return clone(tabs.get(id));
      },
      onCreated: event(), onRemoved: event()
    },
    webNavigation: {
      onCreatedNavigationTarget: event(), onCommitted: event(), onHistoryStateUpdated: event(), onReferenceFragmentUpdated: event()
    },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}, setTitle: async () => {} },
    runtime: { id: 'quedate-test', getURL: part => `chrome-extension://quedate-test/${part}`, onMessage: event(), onInstalled: event() }
  };
  const context = vm.createContext({ chrome, URL, setTimeout: fn => timers.push(fn), console: { warn: (...args) => warnings.push(args) } });
  context.importScripts = (...files) => files.forEach(file => vm.runInContext(fs.readFileSync(path.join(extension, file), 'utf8'), context, { filename: file }));
  vm.runInContext(fs.readFileSync(path.join(extension, 'background.js'), 'utf8'), context, { filename: 'background.js' });
  const settle = async () => {
    // Event callbacks can append another queued event while the current one executes.
    for (let n = 0; n < 3; n++) await vm.runInContext('queue', context);
    if (warnings.length) throw Error(JSON.stringify(warnings));
  };
  const message = (data, sender = { id: chrome.runtime.id, url: chrome.runtime.getURL('popup.html') }) =>
    new Promise(resolve => chrome.runtime.onMessage.listeners[0](data, sender, resolve));
  const content = (data, tabId = 1, frameId = 0) => message(data, { id: chrome.runtime.id, tab: clone(tabs.get(tabId)), frameId, documentId: `doc-${tabId}-${frameId}` });
  const popup = () => message({ type: 'getPopup', tabId: 1 });
  const addTarget = async (url = 'https://ads.example/', extra = {}) => {
    const target = { id: 2, url, active: true, windowId: 1, openerTabId: 1, ...extra };
    tabs.set(target.id, target);
    chrome.webNavigation.onCreatedNavigationTarget.emit({ sourceTabId: 1, tabId: target.id, url, sourceFrameId: 0 });
    await settle();
  };
  return { chrome, context, tabs, local, session, injected, removed, updated, created, timers, settle, message, content, popup, addTarget };
}
function guard(policy = { protected: true, allowClickedLinks: false, strictRedirects: false }) {
  const messages = [], nativeCalls = [], listeners = new Map();
  class Anchor { click() { nativeCalls.push(['anchor', this.href]); } }
  class Form {
    submit() { nativeCalls.push(['submit']); }
    requestSubmit() { nativeCalls.push(['requestSubmit']); }
  }
  const location = { href: 'https://video.example/watch', hostname: 'video.example' };
  const window = {
    open(...args) { nativeCalls.push(['open', ...args]); return 'native-window'; },
    postMessage(message) { messages.push(message); },
    addEventListener(name, fn) { listeners.set(name, fn); }
  };
  const document = { querySelector: () => null };
  const context = vm.createContext({ window, document, location, URL, HTMLAnchorElement: Anchor, HTMLFormElement: Form });
  vm.runInContext(fs.readFileSync(path.join(extension, 'guard.js'), 'utf8'), context);
  context.initialPolicy = policy;
  vm.runInContext('installStayHereGuard(initialPolicy)', context);
  return { window, Anchor, Form, messages, nativeCalls, listeners };
}
module.exports = { worker, guard, extension };
