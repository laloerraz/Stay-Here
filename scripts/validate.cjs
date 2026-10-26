const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.name, 'Stay Here');
for (const file of ['background.js','guard.js','content.js','policy.js','popup.js','support-config.js']) {
  cp.execFileSync(process.execPath, ['--check', path.join(root, file)]);
}
const assets = [manifest.background.service_worker, manifest.action.default_popup,
  ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon),
  ...manifest.content_scripts.flatMap(s => s.js), 'popup.css','support-config.js','privacy.html','LICENSE'];
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
assert.equal(fs.readFileSync(path.join(root, 'privacy.html'), 'utf8').replace(/\r\n/g, '\n'), fs.readFileSync(path.join(root, 'docs/privacy.html'), 'utf8').replace(/\r\n/g, '\n'));
assert.ok(!/<script[^>]+src=["']https?:/i.test(fs.readFileSync(path.join(root, 'popup.html'), 'utf8')));
console.log('Manifest, icons, local assets, JavaScript and privacy copies: PASS');
