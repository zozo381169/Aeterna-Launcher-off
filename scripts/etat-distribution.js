'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'manifest', 'manifest-preparation-108.json');
const manifest = JSON.parse(fs.readFileSync(source, 'utf8'));
const files = manifest.files || [];
const unresolved = files.filter(f => typeof f.url !== 'string' || !/^https:\/\//i.test(f.url));
const invalid = files.filter(f => !/^mods\/[\w .()+-]+\.jar$/i.test(f.path || '') || !Number.isSafeInteger(f.size) || f.size <= 0 || !/^[a-f0-9]{40}$/i.test(f.sha1 || ''));
const result = {
  expected: 108,
  present: files.length,
  downloadable: files.length - unresolved.length,
  unresolved: unresolved.length,
  invalidMetadata: invalid.map(f => f.path),
  readyForPublicInstall: files.length === 108 && unresolved.length === 0 && invalid.length === 0,
  unresolvedFiles: unresolved.map(f => f.path),
  note: 'Source availability is not a live download or license verification. Do not activate an incomplete manifest.'
};
console.log(JSON.stringify(result, null, 2));
if (!result.readyForPublicInstall) process.exitCode = 1;
