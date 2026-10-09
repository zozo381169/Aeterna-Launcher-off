'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
function hashFile(file, algorithm='sha1') {
 return new Promise((resolve,reject)=>{
  const h=crypto.createHash(algorithm),s=fs.createReadStream(file);
  s.on('data',x=>h.update(x));s.on('error',reject);s.on('end',()=>resolve(h.digest('hex')));
 });
}
function validateManifest(manifest){
 if (!manifest || manifest.schemaVersion!==1 || !Array.isArray(manifest.files)) throw Error('Format invalide');
 const seen=new Set();
 for(const f of manifest.files){
  if(typeof f.path!=='string'||!/^mods\/[a-zA-Z0-9_.+() -]+\.jar$/.test(f.path)||f.path.includes('..')) throw Error('Chemin invalide: '+f.path);
  if(seen.has(f.path.toLowerCase()))throw Error('Doublon: '+f.path);
  seen.add(f.path.toLowerCase());
  if(typeof f.url!=='string'||!f.url.startsWith('https://'))throw Error('URL HTTPS manquante: '+f.path);
  if(!/^[a-f0-9]{40}$/i.test(f.sha1||''))throw Error('SHA1 manquant: '+f.path);
  if(!Number.isSafeInteger(f.size)||f.size<0)throw Error('Taille invalide: '+f.path);
 }
 return true;
}
module.exports={hashFile,validateManifest};
