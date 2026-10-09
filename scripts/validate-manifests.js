'use strict';
const fs=require('node:fs'),path=require('node:path');
const {validateManifest}=require('../launcher/manifest-utils');
const base=path.resolve(__dirname,'..','manifest');
const mandatory=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));
validateManifest(mandatory);
for(const [filename,key] of [['optional-mods.json','mods'],['shaders.json','shaders']]){
 const data=JSON.parse(fs.readFileSync(path.join(base,filename),'utf8'));
 if(data.schemaVersion!==1||!Array.isArray(data[key]))throw Error('Catalogue invalide: '+filename);
}
const update=JSON.parse(fs.readFileSync(path.join(base,'launcher-update.json'),'utf8'));
if(update.schemaVersion!==1||update.channel!=='test')throw Error('Canal test invalide');
console.log('Manifestes valides. Mods obligatoires:',mandatory.files.length);
