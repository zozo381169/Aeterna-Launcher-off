'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

function hashFile(file, algorithm = 'sha1') {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash(algorithm);
    const s = fs.createReadStream(file);
    s.on('data', x => h.update(x));
    s.on('error', reject);
    s.on('end', () => resolve(h.digest('hex')));
  });
}
function validatePath(relative) {
  return typeof relative === 'string' && relative.length > 0 &&
    !relative.includes('\\') && !relative.includes('\0') &&
    !path.posix.isAbsolute(relative) &&
    !relative.split('/').some(part => !part || part === '.' || part === '..');
}
function validateEntry(f) {
  if (!f || typeof f !== 'object' || Array.isArray(f)) throw Error('Entrée de fichier invalide');
  if (!validatePath(f.path)) throw Error('Chemin invalide: ' + f.path);
  if (typeof f.url !== 'string' || !f.url.startsWith('https://')) throw Error('URL HTTPS manquante: ' + f.path);
  if (!/^[a-f0-9]{40}$/i.test(f.sha1 || '')) throw Error('SHA1 manquant: ' + f.path);
  if (!Number.isSafeInteger(f.size) || f.size < 0) throw Error('Taille invalide: ' + f.path);
}
function validateManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)) throw Error('Format invalide');
  const seen = new Set();
  for (const f of manifest.files) {
    validateEntry(f);
    const key = f.path.toLowerCase();
    if (seen.has(key)) throw Error('Doublon: ' + f.path);
    seen.add(key);
  }
  if (manifest.optionalMods !== undefined) {
    if (!Array.isArray(manifest.optionalMods)) throw Error('optionalMods doit être un tableau');
    const ids = new Set();
    for (const mod of manifest.optionalMods) {
      if (!mod || typeof mod.id !== 'string' || ids.has(mod.id)) throw Error('Identifiant optionnel invalide ou dupliqué');
      ids.add(mod.id);
      validateEntry(mod);
      if (mod.requires !== undefined && !Array.isArray(mod.requires)) throw Error('requires doit être un tableau : ' + mod.id);
      for (const dependency of (mod.requires ?? [])) validateEntry(dependency);
    }
  }
  if (manifest.removeFiles !== undefined) {
    if (!Array.isArray(manifest.removeFiles) || !manifest.removeFiles.every(validatePath)) throw Error('removeFiles invalide');
  }
  if (manifest.deleteExtraIn !== undefined) {
    if (!Array.isArray(manifest.deleteExtraIn) || !manifest.deleteExtraIn.every(validatePath)) throw Error('deleteExtraIn invalide');
  }
  return true;
}
module.exports = { hashFile, validateManifest, validatePath };
