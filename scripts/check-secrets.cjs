const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = cp.execFileSync('git', ['-c', `safe.directory=${root.replace(/\\/g, '/')}`, 'ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/
];
const findings = [];
for (const file of files) {
  if (/(?:^|\/)\.env(?:$|\.)/.test(file) && !file.endsWith('.example')) findings.push(file);
  if (/\.(?:pem|key|p12|pfx)$/.test(file)) findings.push(file);
  const bytes = fs.readFileSync(path.join(root, file));
  if (bytes.includes(0)) continue;
  if (patterns.some(pattern => pattern.test(bytes.toString('utf8')))) findings.push(file);
}
if (findings.length) {
  console.error('Revisar posibles credenciales en estos archivos (valores omitidos):', [...new Set(findings)].join(', '));
  process.exitCode = 1;
} else console.log('No known credential patterns found in tracked files.');
