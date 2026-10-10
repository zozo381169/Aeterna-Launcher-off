'use strict';
// Node.js 20+. Resolves assets by exact filename and verifies their bytes.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { Transform } = require('node:stream');

const owner = 'zozo381169';
const repo = 'Aeterna-Launcher-off';
const tag = 'mods-aeterna-v0.1.0-test';
const names = [
  'aeterna-1.0.2.jar',
  'AeternaCorbeaux-Client-1.0.0.jar',
  'AeternaHUD-1.0.0-taille-C.jar',
  'AeternaInventory-1.0.0.jar',
  'AeternaOfficiel-forge-1.4.6+1.20.1.jar'
];
const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root,'manifest','manifest-inventaire.json'),'utf8'));
const index = new Map(source.files.map(x => [x.path.slice(5),x]));

async function sha1Url(url) {
  const response = await fetch(url, {headers:{'User-Agent':'Aeterna-manifest-checker'}});
  if (!response.ok || !response.body) throw new Error('HTTP ' + response.status + ': ' + url);
  const hash = crypto.createHash('sha1');
  let size = 0;
  await pipeline(Readable.fromWeb(response.body),new Transform({transform(chunk,enc,cb){size+=chunk.length;hash.update(chunk);cb();}}));
  return {size,sha1:hash.digest('hex')};
}
async function main(){
  const api = 'https://api.github.com/repos/'+owner+'/'+repo+'/releases/tags/'+encodeURIComponent(tag);
  const response = await fetch(api,{headers:{'Accept':'application/vnd.github+json','User-Agent':'Aeterna-manifest-checker'}});
  if(!response.ok) throw new Error('Release introuvable : HTTP '+response.status);
  const release = await response.json();
  if(release.draft) throw new Error('Release encore en brouillon');
  const verified=[];
  for(const name of names){
    const item=index.get(name);
    if(!item) throw new Error('Absent inventaire : '+name);
    const asset=(release.assets||[]).find(x=>x.name===name);
    if(!asset) throw new Error('Asset absent de la release : '+name);
    if(!asset.browser_download_url?.startsWith('https://github.com/')) throw new Error('URL non valide : '+name);
    const actual=await sha1Url(asset.browser_download_url);
    if(actual.size!==item.size||actual.sha1!==item.sha1) throw new Error('Fichier différent de l’inventaire : '+name);
    verified.push({...item,url:asset.browser_download_url});
    console.log('Vérifié : '+name);
  }
  const output={schemaVersion:1,modpackVersion:source.modpackVersion,minecraftVersion:source.minecraftVersion,forgeVersion:source.forgeVersion,server:source.server,files:verified};
  const dest=path.join(root,'manifest','manifest-aeterna-verifie.json');
  fs.writeFileSync(dest,JSON.stringify(output,null,2)+'\n');
  console.log('Créé : '+dest+' ('+verified.length+' mods)');
  console.log('ATTENTION : manifeste partiel, pas le modpack complet.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
