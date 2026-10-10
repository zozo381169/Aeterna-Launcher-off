'use strict';
// CurseForge metadata discovery; no JARs downloaded or redistributed.
// Requires an approved API key in CURSEFORGE_API_KEY.
const fs=require('node:fs/promises');
const path=require('node:path');
const input=path.resolve(__dirname,'../manifest/manifest-preparation-108.json');
const output=path.resolve(__dirname,'../manifest/curseforge-rapport.json');
const key=process.env.CURSEFORGE_API_KEY;
const targets=[
 {path:'mods/geckolib-forge-1.20.1-4.8.4.jar',search:'GeckoLib'},
 {path:'mods/voicechat-forge-1.20.1-2.6.21.jar',search:'Simple Voice Chat'},
 {path:'mods/easy_npc-forge-1.20.1-7.4.1.jar',search:'Easy NPC'},
 {path:'mods/sophisticatedbackpacks-1.20.1-3.24.62.2017.jar',search:'Sophisticated Backpacks'}
];
async function api(endpoint){
 const response=await fetch('https://api.curseforge.com/v1'+endpoint,{headers:{'x-api-key':key,'Accept':'application/json'},signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error('CurseForge API HTTP '+response.status);
 return (await response.json()).data;
}
async function main(){
 if(!key){console.error('CURSEFORGE_API_KEY missing: configure GitHub Actions secret, never commit keys.');process.exitCode=2;return;}
 const manifest=JSON.parse(await fs.readFile(input,'utf8'));
 const results=[];
 for(const target of targets){
  const expected=manifest.files.find(f=>f.path===target.path);
  if(!expected){results.push({path:target.path,status:'not-in-manifest'});continue;}
  const item={path:target.path,expectedSha1:expected.sha1,expectedSize:expected.size,status:'not-found',candidates:[]};
  try{
   const mods=await api('/mods/search?gameId=432&searchFilter='+encodeURIComponent(target.search)+'&pageSize=20');
   for(const mod of mods.slice(0,12)){
    const files=await api('/mods/'+mod.id+'/files?pageSize=50');
    for(const f of files){
     const sha=(f.hashes||[]).find(h=>h.algo===1)?.value?.toLowerCase();
     if(sha===expected.sha1.toLowerCase()&&f.fileLength===expected.size){
      item.candidates.push({modId:mod.id,fileId:f.id,fileName:f.fileName,projectName:mod.name,sha1:sha,size:f.fileLength,downloadAvailable:!!f.downloadUrl});
     }
    }
   }
   if(item.candidates.length)item.status='exact-metadata-match';
  }catch(error){item.status='error';item.error=String(error.message||error);}
  results.push(item);
  console.log(item.status+' '+item.path);
 }
 await fs.writeFile(output,JSON.stringify({generatedAt:new Date().toISOString(),note:'Metadata matches only. API permissions and download availability must be confirmed before use.',results},null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
