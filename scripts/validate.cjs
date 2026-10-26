const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const projectRoot = path.resolve(__dirname, '..');
const root = path.join(projectRoot, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.name, 'Stay Here');
assert.ok(fs.existsSync(path.join(projectRoot, 'LICENSE')));
for (const file of ['background.js','guard.js','content.js','policy.js','popup.js','support-config.js','i18n.js']) {
  cp.execFileSync(process.execPath, ['--check', path.join(root, file)]);
}
const assets = [manifest.background.service_worker, manifest.action.default_popup,
  ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon),
  ...manifest.content_scripts.flatMap(s => s.js), 'popup.css','support-config.js','i18n.js','privacy.html','privacy.en.html','THIRD_PARTY_NOTICES.txt','icons/kofi-symbol.png','_locales/en/messages.json','_locales/es/messages.json'];
for (const asset of assets) {
  const target = path.resolve(root, asset);
  assert.ok(target.startsWith(root + path.sep) && fs.existsSync(target), `Missing or unsafe asset: ${asset}`);
}
for (const [size, file] of Object.entries(manifest.icons)) {
  const png = fs.readFileSync(path.join(root, file));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), Number(size));
  assert.equal(png.readUInt32BE(20), Number(size));
}
assert.equal(fs.readFileSync(path.join(root, 'privacy.html'), 'utf8').replace(/\r\n/g, '\n'), fs.readFileSync(path.join(projectRoot, 'docs/privacy.html'), 'utf8').replace(/\r\n/g, '\n'));
assert.ok(!/<script[^>]+src=["']https?:/i.test(fs.readFileSync(path.join(root, 'popup.html'), 'utf8')));
console.log('Manifest, icons, local assets, JavaScript and privacy copies: PASS');

assert.equal(manifest.default_locale, 'en');
for (const locale of ['en', 'es']) {
  const messages = JSON.parse(fs.readFileSync(path.join(root, '_locales', locale, 'messages.json'), 'utf8'));
  const match = manifest.description.match(/^__MSG_(.+)__$/);
  assert.ok(match && messages[match[1]]?.message);
  assert.ok(messages[match[1]].message.length <= 132);
}
assert.equal(fs.readFileSync(path.join(root, 'privacy.en.html'), 'utf8').replace(/\r\n/g, '\n'), fs.readFileSync(path.join(projectRoot, 'docs/privacy.en.html'), 'utf8').replace(/\r\n/g, '\n'));
console.log('English/Spanish catalogs and official Ko-fi asset: PASS');
