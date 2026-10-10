'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest/manifest-preparation-108.json'), 'utf8'));
const missing = manifest.files.filter(f => !f.url);
async function main() {
  const hashes = missing.map(f => f.sha1);
  const response = await fetch('https://api.modrinth.com/v2/version_files', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'User-Agent': 'AeternaLauncher/0.1 (mod-source-audit)'},
    body: JSON.stringify({hashes, algorithm: 'sha1'}),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error('Modrinth API HTTP ' + response.status);
  const versions = await response.json();
  const matches = [], unresolved = [];
  for (const file of missing) {
    const version = versions[file.sha1];
    const exact = version?.files?.find(f => f.hashes?.sha1?.toLowerCase() === file.sha1.toLowerCase() && f.size === file.size && f.filename === path.basename(file.path));
    if (exact && /^https:\/\//.test(exact.url)) {
      matches.push({path: file.path, sha1: file.sha1, size: file.size, url: exact.url, projectId: version.project_id, versionId: version.id, note: 'API hash/size/filename match; download and author terms not independently validated'});
    } else {
      unresolved.push({path: file.path, reason: version ? 'API version found but filename, size or hash not identical' : 'No Modrinth version found for exact SHA-1'});
    }
  }
  const report = {checked: missing.length, matches: matches.length, unresolved: unresolved.length, matchesByExactHash: matches, remaining: unresolved, warning: 'Candidate URLs only. Do not activate manifest without download verification and license review.'};
  const dest = path.join(root, 'manifest/rapport-modrinth-hash.json');
  fs.writeFileSync(dest, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({checked: report.checked, matches: report.matches, unresolved: report.unresolved}, null, 2));
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) fs.appendFileSync(summary, '## Modrinth — recherche par SHA-1 exact\n\n- Fichiers recherches : ' + report.checked + '\n- Candidats exacts : ' + report.matches + '\n- Sans correspondance : ' + report.unresolved + '\n\nRapport disponible dans les artifacts. Aucun manifeste actif modifie.\n');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
