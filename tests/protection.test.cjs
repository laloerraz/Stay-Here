const test = require('node:test');
const assert = require('node:assert/strict');
const { worker, guard } = require('./harness.cjs');

test('script opens, including _self, are intercepted without calling native open', () => {
  const h = guard();
  assert.equal(h.window.open('https://ads.example'), null);
  assert.equal(h.window.open('https://ads.example', '_self'), null);
  assert.equal(h.nativeCalls.length, 0);
  assert.equal(h.messages.length, 2);
});
test('an assignment by a site cannot replace the initial open wrapper', () => {
  const h = guard(); const original = h.window.open;
  h.window.open = () => 'bypass';
  assert.equal(h.window.open, original);
});
test('a disabled or excepted policy restores native open behavior', () => {
  const h = guard({ protected: false });
  assert.equal(h.window.open('https://login.example'), 'native-window');
  assert.equal(h.nativeCalls.length, 1);
});
test('programmatic target blank anchors are blocked; normal same-tab anchors work', () => {
  const h = guard(); const link = new h.Anchor();
  Object.assign(link, { target: '_blank', href: 'https://ads.example' });
  link.click(); assert.equal(h.nativeCalls.length, 0);
  link.target = '_self'; link.click(); assert.equal(h.nativeCalls.length, 1);
});
test('strict mode also blocks synthetic same-tab external anchors', () => {
  const h = guard({ protected: true, strictRedirects: true });
  const link = Object.assign(new h.Anchor(), { target: '_self', href: 'https://ads.example' });
  link.click(); assert.equal(h.nativeCalls.length, 0);
});
test('scripts cannot submit to a new window, including formtarget overrides', () => {
  const h = guard(); const form = Object.assign(new h.Form(), { target: '_blank', action: 'https://ads.example' });
  form.submit(); assert.equal(h.nativeCalls.length, 0);
  form.target = '_self';
  form.requestSubmit({ getAttribute: () => '_blank' }); assert.equal(h.nativeCalls.length, 0);
  form.submit(); assert.equal(h.nativeCalls.length, 1);
});
test('background closes an unsolicited new target and leaves its source open', async () => {
  const h = worker(); await h.addTarget();
  assert.deepEqual(h.removed, [2]); assert.ok(h.tabs.has(1));
  assert.equal((await h.popup()).popups, 1);
});
test('a target already blocked by another extension still closes', async () => {
  const h = worker(); await h.addTarget('chrome-extension://adblock/blocked.html');
  assert.deepEqual(h.removed, [2]);
});
test('global pause and exact-host exceptions preserve created windows', async () => {
  for (const settings of [{ enabled: false }, { allowedHosts: ['video.example'] }]) {
    const h = worker({ local: { settings } }); await h.addTarget();
    assert.equal(h.removed.length, 0);
  }
});
test('allowing a host does not silently allow its subdomains', async () => {
  const h = worker({ local: { settings: { allowedHosts: ['example'] } } });
  await h.addTarget(); assert.deepEqual(h.removed, [2]);
});
test('a context-menu intent allows only its exact destination, once', async () => {
  const h = worker();
  await h.content({ type: 'intent', kind: 'newTab', url: 'https://docs.example/one', contextMenu: true });
  await h.addTarget('https://ads.example/', { id: 2 });
  await h.addTarget('https://docs.example/one', { id: 3 });
  await h.addTarget('https://docs.example/one', { id: 4 });
  assert.deepEqual(h.removed, [2, 4]); assert.ok(h.tabs.has(3));
});
test('frame intent cannot authorize a popup from another frame', async () => {
  const h = worker();
  await h.content({ type: 'intent', kind: 'newTab', url: 'https://docs.example/' }, 1, 7);
  await h.addTarget('https://docs.example/'); assert.deepEqual(h.removed, [2]);
});
test('expired grants do not survive a worker restart', async () => {
  const h = worker({ session: { tabStates: { 1: {
    url: 'https://video.example/watch', popups: 0, redirects: 0, last: null, lastReturn: 0,
    intents: [{ url: 'https://docs.example/', kind: 'newTab', until: Date.now() - 100, frameId: 0 }]
  } } } });
  await h.addTarget('https://docs.example/'); assert.deepEqual(h.removed, [2]);
});
test('a deliberate modifier-click link opens via extension without a web-page opener', async () => {
  const h = worker();
  await h.content({ type: 'openTrustedLink', url: 'https://docs.example/', active: false });
  assert.equal(h.created.length, 1); assert.equal(h.created[0].active, false);
  assert.equal(h.created[0].openerTabId, undefined);
});
test('unsafe URL schemes cannot be opened through the trusted-link channel', async () => {
  const h = worker();
  for (const url of ['javascript:alert(1)', 'chrome://settings', 'file:///secret', 'not a url']) {
    await h.content({ type: 'openTrustedLink', url });
  }
  assert.equal(h.created.length, 0);
});
test('content messages cannot disable protection or add exceptions', async () => {
  const h = worker();
  await h.content({ type: 'setOptions', enabled: false, tabId: 1 });
  await h.content({ type: 'setSiteAllowed', allowed: true, tabId: 1 });
  assert.equal((await h.popup()).protected, true);
});
test('unknown sender ids cannot change settings', async () => {
  const h = worker();
  const response = await h.message({ type: 'setOptions', enabled: false, tabId: 1 }, { id: 'evil', url: 'https://evil.example' });
  assert.ok(response.error); assert.equal((await h.popup()).protected, true);
});
test('a blank popunder with an opener closes in the fallback', async () => {
  const h = worker(); await h.settle();
  const tab = { id: 2, openerTabId: 1, url: 'about:blank', active: false };
  h.tabs.set(2, tab); h.chrome.tabs.onCreated.emit(tab);
  h.timers.forEach(fn => fn()); await h.settle();
  assert.deepEqual(h.removed, [2]);
});
test('manual Ctrl+T tabs without an opener are preserved', async () => {
  const h = worker(); await h.settle();
  h.chrome.tabs.onCreated.emit({ id: 2, url: 'chrome://newtab' });
  assert.equal(h.timers.length, 0); assert.equal(h.removed.length, 0);
});
test('target events and the fallback cannot double-close or double-count a tab', async () => {
  const h = worker(); await h.settle();
  const tab = { id: 2, openerTabId: 1, url: 'https://ads.example' };
  h.tabs.set(2, tab); h.chrome.tabs.onCreated.emit(tab);
  h.chrome.webNavigation.onCreatedNavigationTarget.emit({ sourceTabId: 1, tabId: 2, sourceFrameId: 0, url: tab.url });
  await h.settle(); h.timers.forEach(fn => fn()); await h.settle();
  assert.deepEqual(h.removed, [2]); assert.equal((await h.popup()).popups, 1);
});
test('strict redirects are opt-in and do not run by default', async () => {
  const h = worker(); await h.settle();
  h.chrome.webNavigation.onCommitted.emit({ tabId: 1, frameId: 0, url: 'https://ads.example/', transitionQualifiers: ['client_redirect'] });
  await h.settle(); assert.equal(h.updated.length, 0);
});
test('strict mode restores the previous URL for an unrequested client redirect', async () => {
  const h = worker({ local: { settings: { strictRedirects: true } } }); await h.settle();
  h.chrome.webNavigation.onCommitted.emit({ tabId: 1, frameId: 0, url: 'https://ads.example/', transitionType: 'link', transitionQualifiers: ['client_redirect'] });
  await h.settle(); assert.deepEqual(h.updated, [{ id: 1, url: 'https://video.example/watch' }]);
  assert.equal((await h.popup()).redirects, 1);
});
test('strict mode preserves typed URLs, back, server redirects and same-host changes', async () => {
  for (const detail of [
    { transitionQualifiers: ['client_redirect', 'from_address_bar'] },
    { transitionQualifiers: ['client_redirect', 'forward_back'] },
    { transitionType: 'typed', transitionQualifiers: ['client_redirect'] },
    { transitionQualifiers: ['server_redirect'] },
    { url: 'https://video.example/next', transitionQualifiers: ['client_redirect'] }
  ]) {
    const h = worker({ local: { settings: { strictRedirects: true } } }); await h.settle();
    h.chrome.webNavigation.onCommitted.emit({ tabId: 1, frameId: 0, url: 'https://other.example', ...detail });
    await h.settle(); assert.equal(h.updated.length, 0);
  }
});
test('a trusted link intent preserves its intended client-side navigation', async () => {
  const h = worker({ local: { settings: { strictRedirects: true } } });
  await h.content({ type: 'intent', kind: 'navigate', url: 'https://docs.example/page' });
  h.chrome.webNavigation.onCommitted.emit({ tabId: 1, frameId: 0, url: 'https://docs.example/page', transitionQualifiers: ['client_redirect'] });
  await h.settle(); assert.equal(h.updated.length, 0);
});
test('the redirect cooldown prevents a reload loop', async () => {
  const h = worker({ local: { settings: { strictRedirects: true } } }); await h.settle();
  const commit = url => h.chrome.webNavigation.onCommitted.emit({ tabId: 1, frameId: 0, url, transitionQualifiers: ['client_redirect'] });
  commit('https://ads.example/'); await h.settle();
  commit('https://video.example/watch'); await h.settle();
  commit('https://ads.example/'); await h.settle();
  assert.equal(h.updated.filter(update => update.url).length, 1);
});
test('settings persist across worker restarts and host exceptions can be removed', async () => {
  const h = worker();
  await h.message({ type: 'setSiteAllowed', allowed: true, tabId: 1 });
  const restarted = worker({ local: h.local, session: h.session });
  assert.equal((await restarted.popup()).allowed, true);
  await restarted.message({ type: 'setSiteAllowed', allowed: false, tabId: 1 });
  assert.equal((await restarted.popup()).protected, true);
});
test('only options persist on disk; tab addresses are stored in session storage', async () => {
  const h = worker(); await h.addTarget();
  assert.ok(h.session.tabStates[1].url);
  assert.ok(!JSON.stringify(h.local).includes('video.example'));
});


test('page policy forgery cannot disable the document guard', () => {
  const h = guard();
  const forged = { source: h.window, data: { channel: 'quedate-aqui-v1', type: 'policy', protected: false } };
  h.listeners.get('message')?.(forged);
  assert.equal(h.window.open('https://ads.example/', '_self'), null);
  assert.equal(h.nativeCalls.length, 0);
});

test('guard policy is a snapshot, not a mutable input controlled by a caller', () => {
  const policy = { protected: true };
  const h = guard(policy);
  policy.protected = false;
  assert.equal(h.window.open('https://ads.example/'), null);
});

test('policy injection targets the exact document once and survives worker restart', async () => {
  const h = worker();
  await h.content({ type: 'policy' });
  await h.content({ type: 'policy' });
  assert.equal(h.injected.length, 1);
  assert.equal(h.injected[0].world, 'MAIN');
  assert.deepEqual(Array.from(h.injected[0].target.documentIds), ['doc-1-0']);
  assert.equal(h.injected[0].args[0].protected, true);
  const restarted = worker({ local: h.local, session: h.session });
  await restarted.content({ type: 'policy' });
  assert.equal(restarted.injected.length, 0);
});

test('document injection reflects an exact-host exception', async () => {
  const h = worker({ local: { settings: { allowedHosts: ['video.example'] } } });
  await h.content({ type: 'policy' });
  assert.equal(h.injected[0].args[0].protected, false);
});


test('an extension panel opened as a tab can still read its selected source state', async () => {
  const h = worker();
  const response = await h.message({ type: 'getPopup', tabId: 1 }, {
    id: h.chrome.runtime.id, url: h.chrome.runtime.getURL('popup.html'), tab: { id: 9 }
  });
  assert.equal(response.hostname, 'video.example');
});
