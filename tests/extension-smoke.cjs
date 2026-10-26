// Optional integration check: npm install --no-save playwright, then run this file.
// Uses an isolated temporary browser profile; never the user's profile.
const { chromium } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'stayhere-smoke-'));
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Stay Here · Prueba local</title>
  <style>body{font:20px system-ui;max-width:760px;margin:70px auto;color:#17354b;background:#f3f8fc}button,a{display:inline-block;padding:15px;margin:8px;background:white;border:1px solid #91b6ca;border-radius:9px;color:#17354b}</style>
  <h1>Tu pestaña, tranquila.</h1><p>Prueba local de aperturas de ventanas y pestañas.</p>
  <button id="script" onclick="window.open('/destination','_blank')">Abrir ventana por script</button>
  <a id="new" href="/destination" target="_blank">Enlace a otra pestaña</a>
  <a id="same" href="/same">Enlace normal</a>
  <p>Stay Here permite controlar las aperturas y añadir excepciones por sitio.</p></html>`);
});
(async () => {
  let context;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const executablePath = process.env.STAYHERE_BROWSER || undefined;
    context = await chromium.launchPersistentContext(profile, {
      executablePath, channel: executablePath ? undefined : 'chromium', headless: true,
      viewport: { width: 1280, height: 800 },
      args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`]
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
    const extensionId = new URL(worker.url()).hostname;
    const page = await context.newPage();
    const url = `http://127.0.0.1:${server.address().port}/`;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => Object.getOwnPropertyDescriptor(window, 'open')?.configurable === false);
    await page.evaluate(() => window.postMessage({ channel: 'quedate-aqui-v1', type: 'policy', protected: false }, '*'));
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.open('/destination', '_self')), null);
    assert.equal(page.url(), url);
    await page.click('#script');
    await page.click('#new');
    await page.waitForTimeout(400);
    assert.equal(context.pages().filter(p => p.url().includes('/destination')).length, 0);
    await page.click('#new', { modifiers: ['Control'] });
    await page.waitForTimeout(400);
    const deliberate = context.pages().find(p => p.url().includes('/destination'));
    assert.ok(deliberate, 'Ctrl + click must preserve a deliberate tab');
    await deliberate.close();
    await page.bringToFront();
    const tabId = await worker.evaluate(async target => (await chrome.tabs.query({})).find(t => t.url === target).id, url);
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.bringToFront();
    await popup.reload();
    // A standalone extension tab has no action-popup association. Select the real
    // source tab explicitly while keeping all data/messages from the real worker.
    await popup.evaluate(async id => { tabId = id; render(await request({ type: 'getPopup' })); }, tabId);
    await popup.waitForFunction(() => document.getElementById('status').textContent === 'Protección activa');
    assert.equal(await popup.locator('#support').isVisible(), true);
    assert.equal(await popup.locator('#support').getAttribute('href'), 'https://ko-fi.com/laloerraz');
    await context.route('https://ko-fi.com/laloerraz', route => route.fulfill({ contentType: 'text/html', body: '<title>Ko-fi: destino de prueba</title>' }));
    const [supportPage] = await Promise.all([
      context.waitForEvent('page'), popup.locator('#support').click()
    ]);
    await supportPage.waitForURL('https://ko-fi.com/laloerraz');
    assert.equal(await supportPage.evaluate(() => window.opener === null), true);
    await supportPage.close();
    const screenshots = path.join(root, 'store');
    fs.mkdirSync(screenshots, { recursive: true });
    await popup.locator('body').screenshot({ path: path.join(screenshots, 'panel-real.png') });
    await page.screenshot({ path: path.join(screenshots, 'pagina-real.png') });
    await popup.evaluate(async () => { await request({ type: 'setSiteAllowed', allowed: true }); });
    await page.reload();
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => Object.getOwnPropertyDescriptor(window, 'open')?.configurable), true);
    const allowed = await page.evaluate(() => { const w = window.open('/destination'); const ok = Boolean(w); w?.close(); return ok; });
    assert.equal(allowed, true);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: context.browser()?.version(), extensionId, result: 'PASS', scenarios: ['install','forged policy','script popup','normal target blank','Ctrl click','real panel','host exception after reload'], screenshots }, null, 2));
  } finally {
    await context?.close();
    server.close();
    assert.equal(path.dirname(profile), os.tmpdir());
    assert.ok(path.basename(profile).startsWith('stayhere-smoke-'));
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
