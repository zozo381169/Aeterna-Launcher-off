'use strict';
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
  const base = path.resolve(root);
  const full = path.resolve(base, ...relative.split('/'));
  if (!full.startsWith(base + path.sep)) throw new Error('Chemin hors dossier');
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
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Entrée de fichier invalide');
  if (typeof entry.path !== 'string') throw new Error('Chemin manquant');
  if (!/^https:\/\//i.test(entry.url || '')) throw new Error('URL HTTPS requise : ' + entry.path);
  if (!/^[a-f0-9]{40}$/i.test(entry.sha1 || '')) throw new Error('SHA-1 requis : ' + entry.path);
  if (!Number.isSafeInteger(entry.size) || entry.size < 0) throw new Error('Taille invalide : ' + entry.path);
}
async function ensureSafeParentDirs(root, destination) {
  const base = path.resolve(root);
  await fsp.mkdir(base, { recursive: true });
  const relative = path.relative(base, path.dirname(destination));
  let current = base;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const stat = await fsp.lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Dossier parent non sûr : ' + current);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      await fsp.mkdir(current);
    }
  }
}
async function regularFileExists(file) {
  try {
    const stat = await fsp.lstat(file);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Cible existante non sûre : ' + file);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') return false;
    throw e;
  }
}
function expandOptionalMods(manifest, selectedIds) {
  const catalogue = manifest.optionalMods ?? [];
  if (!Array.isArray(catalogue) || !Array.isArray(selectedIds)) throw new Error('Liste de mods optionnels invalide');
  const byId = new Map();
  for (const mod of catalogue) {
    if (!mod || typeof mod.id !== 'string' || byId.has(mod.id)) throw new Error('Identifiant de mod optionnel invalide ou dupliqué');
    byId.set(mod.id, mod);
  }
  const entries = new Map();
  const visiting = new Set();
  function addEntry(entry) {
    validateFile(entry);
    const existing = entries.get(entry.path);
    if (existing && existing.sha1 !== entry.sha1) throw new Error('Conflit de dépendance : ' + entry.path);
    entries.set(entry.path, entry);
  }
  function addMod(id) {
    if (visiting.has(id)) throw new Error('Dépendance circulaire : ' + id);
    const mod = byId.get(id);
    if (!mod) throw new Error('Mod optionnel inconnu : ' + id);
    visiting.add(id);
    for (const dep of (mod.requires ?? [])) addEntry(dep);
    addEntry(mod);
    visiting.delete(id);
  }
  for (const id of selectedIds) addMod(id);
  return [...entries.values()];
}
async function applyManifest({ manifestUrl, gameDir, selectedOptionalMods = [], onProgress = () => {} }) {
  if (!/^https:\/\//i.test(manifestUrl)) throw new Error('URL de manifeste HTTPS requise');
  if (typeof gameDir !== 'string' || !gameDir) throw new Error('Dossier de jeu manquant');
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error('Manifeste HTTP ' + response.status);
  const manifest = await response.json();
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)) throw new Error('Format de manifeste inconnu');

  const filesByPath = new Map();
  const managedPaths = new Set();
  const allOptionalEntries = [];
  for (const mod of (manifest.optionalMods ?? [])) {
    validateFile(mod);
    allOptionalEntries.push(mod);
    for (const dep of (mod.requires ?? [])) {
      validateFile(dep);
      allOptionalEntries.push(dep);
    }
  }
  function addFile(entry) {
    validateFile(entry);
    const destination = resolveSafe(gameDir, entry.path);
    const previous = filesByPath.get(destination);
    if (previous) {
      if (previous.sha1 !== entry.sha1) throw new Error('Chemin en double avec contenu différent : ' + entry.path);
      return;
    }
    filesByPath.set(destination, { ...entry, destination });
    managedPaths.add(destination);
  }
  for (const entry of manifest.files) addFile(entry);
  const selectedOptional = expandOptionalMods(manifest, selectedOptionalMods);
  for (const entry of selectedOptional) addFile(entry);
  // Keep catalogued optional files safe from the extra-JAR cleanup.
  for (const entry of allOptionalEntries) managedPaths.add(resolveSafe(gameDir, entry.path));

  const removeFiles = manifest.removeFiles ?? [];
  if (!Array.isArray(removeFiles)) throw new Error('removeFiles doit être un tableau');
  const removals = removeFiles.map(relative => ({ relative, destination: resolveSafe(gameDir, relative) }));
  for (const item of removals) {
    if (filesByPath.has(item.destination)) throw new Error('Un fichier ne peut pas être téléchargé et supprimé : ' + item.relative);
  }

  const files = [...filesByPath.values()];
  const total = files.reduce((sum, f) => sum + f.size, 0);
  let completed = 0, checked = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await ensureSafeParentDirs(gameDir, file.destination);
    const exists = await regularFileExists(file.destination);
    if (exists && file.keepExisting === true) {
      completed += file.size; checked++;
      onProgress({ file: file.path, index: i + 1, count: files.length, bytes: completed, total, skipped: true, keptExisting: true });
      continue;
    }
    if (exists && (await sha1(file.destination)).toLowerCase() === file.sha1.toLowerCase()) {
      completed += file.size; checked++;
      onProgress({ file: file.path, index: i + 1, count: files.length, bytes: completed, total, skipped: true });
      continue;
    }
    const tmp = file.destination + '.aeterna-download';
    try {
      const download = await fetch(file.url);
      if (!download.ok || !download.body) throw new Error('Téléchargement HTTP ' + download.status + ' : ' + file.path);
      let received = 0;
      const meter = new Transform({
        transform(chunk, _, cb) {
          received += chunk.length;
          if (received > file.size) return cb(new Error('Taille téléchargée dépassée : ' + file.path));
          onProgress({ file: file.path, index: i + 1, count: files.length, bytes: completed + received, total, skipped: false });
          cb(null, chunk);
        }
      });
      await pipeline(Readable.fromWeb(download.body), meter, fs.createWriteStream(tmp, { flags: 'w' }));
      if (received !== file.size || (await sha1(tmp)).toLowerCase() !== file.sha1.toLowerCase()) {
        throw new Error('Vérification taille/SHA-1 échouée : ' + file.path);
      }
      await fsp.rename(tmp, file.destination);
      completed += file.size; checked++;
    } finally {
      await fsp.rm(tmp, { force: true }).catch(() => {});
    }
  }

  let removed = 0;
  for (const item of removals) {
    try {
      const stat = await fsp.lstat(item.destination);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Refus de supprimer une cible non-fichier : ' + item.relative);
      await fsp.rm(item.destination); removed++;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }

  const cleanFolders = manifest.deleteExtraIn ?? [];
  if (!Array.isArray(cleanFolders)) throw new Error('deleteExtraIn doit être un tableau');
  let cleaned = 0;
  async function cleanFolder(relativeFolder) {
    const folder = resolveSafe(gameDir, relativeFolder);
    let stat;
    try { stat = await fsp.lstat(folder); }
    catch (e) { if (e.code === 'ENOENT') return; throw e; }
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Dossier de nettoyage non sûr : ' + relativeFolder);
    for (const entry of await fsp.readdir(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Lien symbolique interdit : ' + full);
      if (entry.isDirectory()) await cleanFolder(path.posix.join(relativeFolder, entry.name));
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.jar') && !managedPaths.has(path.resolve(full))) {
        await fsp.rm(full); cleaned++;
      }
    }
  }
  for (const folder of cleanFolders) await cleanFolder(folder);
  return { version: manifest.modpackVersion, checked, removed, cleaned, optionalInstalled: selectedOptionalMods.length };
}
module.exports = { applyManifest, resolveSafe, expandOptionalMods };
