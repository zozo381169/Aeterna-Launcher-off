'use strict';
/**
 * Aeterna manifest updater - Node.js 18+ / Electron main process.
 * This module does not install Minecraft/Forge or modify launcher UI.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const { Readable, Transform } = require('node:stream');

function resolveSafe(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0') ||
      path.posix.isAbsolute(relative) || relative.split('/').some(s => !s || s === '.' || s === '..')) {
    throw new Error('Chemin interdit : ' + relative);
  }
  const full = path.resolve(root, ...relative.split('/'));
  if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error('Chemin hors dossier');
  return full;
}
async function sha1(file) {
  const hash = crypto.createHash('sha1');
  await pipeline(fs.createReadStream(file), new Transform({
    transform(chunk, _, cb) { hash.update(chunk); cb(); }
  }));
  return hash.digest('hex');
}
function validateFile(entry) {
  if (!entry || typeof entry !== 'object') throw new Error('Entrée de fichier invalide');
  if (!/^https:\/\//i.test(entry.url || '')) throw new Error('URL HTTPS requise : ' + entry.path);
  if (!/^[a-f0-9]{40}$/i.test(entry.sha1 || '')) throw new Error('SHA-1 requis : ' + entry.path);
  if (!Number.isSafeInteger(entry.size) || entry.size < 0) throw new Error('Taille invalide : ' + entry.path);
}
async function applyManifest({ manifestUrl, gameDir, onProgress = () => {} }) {
  if (!/^https:\/\//i.test(manifestUrl)) throw new Error('URL de manifeste HTTPS requise');
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error('Manifeste HTTP ' + response.status);
  const manifest = await response.json();
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)) throw new Error('Format de manifeste inconnu');
  const seen = new Set();
  const files = manifest.files.map(entry => {
    validateFile(entry);
    const destination = resolveSafe(gameDir, entry.path);
    if (seen.has(destination)) throw new Error('Chemin en double : ' + entry.path);
    seen.add(destination);
    return { ...entry, destination };
  });
  const total = files.reduce((sum, f) => sum + f.size, 0);
  let completed = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await fsp.mkdir(path.dirname(file.destination), { recursive: true });
    // Refuse symlink targets, including any existing parent directory.
    let dir = path.resolve(gameDir);
    const parts = path.relative(dir, file.destination).split(path.sep);
    for (const part of parts.slice(0, -1)) {
      dir = path.join(dir, part);
      if ((await fsp.lstat(dir)).isSymbolicLink()) throw new Error('Lien symbolique interdit : ' + dir);
    }
    try {
      if ((await fsp.lstat(file.destination)).isSymbolicLink()) throw new Error('Lien symbolique interdit');
      if ((await sha1(file.destination)).toLowerCase() === file.sha1.toLowerCase()) {
        completed += file.size;
        onProgress({ file: file.path, index: i + 1, count: files.length, bytes: completed, total, skipped: true });
        continue;
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    const tmp = file.destination + '.aeterna-download';
    try {
      const download = await fetch(file.url);
      if (!download.ok || !download.body) throw new Error('Téléchargement HTTP ' + download.status);
      let received = 0;
      const meter = new Transform({
        transform(chunk, _, cb) {
          received += chunk.length;
          if (received > file.size) return cb(new Error('Taille téléchargée dépassée'));
          onProgress({ file: file.path, index: i + 1, count: files.length, bytes: completed + received, total, skipped: false });
          cb(null, chunk);
        }
      });
      await pipeline(Readable.fromWeb(download.body), meter, fs.createWriteStream(tmp, { flags: 'wx' }));
      if (received !== file.size || (await sha1(tmp)).toLowerCase() !== file.sha1.toLowerCase()) {
        throw new Error('Vérification taille/SHA-1 échouée : ' + file.path);
      }
      await fsp.rename(tmp, file.destination);
      completed += file.size;
    } finally {
      await fsp.rm(tmp, { force: true }).catch(() => {});
    }
  }
  return { version: manifest.modpackVersion, checked: files.length };
}
module.exports = { applyManifest, resolveSafe };
