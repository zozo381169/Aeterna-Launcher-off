'use strict';
// Find exact FTB JARs on the publisher's Maven, verifying bytes against inventory.
// This is discovery only: no manifest is activated or modified.
const fs=require('node:fs/promises');
const crypto=require('node:crypto');
const path=require('node:path');
const manifestPath=path.resolve(__dirname,'../manifest/manifest-preparation-108.json');
const outputPath=path.resolve(__dirname,'../manifest/ftb-maven-rapport.json');
const entries=[
  ['ftb-quests-forge-2001.4.22.jar','ftb-quests-forge','2001.4.22'],
  ['ftb-teams-forge-2001.3.2.jar','ftb-teams-forge','2001.3.2'],
  ['ftb-library-forge-2001.2.13.jar','ftb-library-forge','2001.2.13']
];
async function main(){
 const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 const results=[];
 for(const [filename,artifact,version] of entries){
  const file=manifest.files.find(f=>f.path==='mods/'+filename);
  if(!file){results.push({filename,status:'not-in-manifest'});continue;}
  const url='https://maven.ftb.dev/releases/dev/ftb/mods/'+artifact+'/'+version+'/'+artifact+'-'+version+'.jar';
  const result={path:file.path,url,status:'error'};
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(120000),headers:{'User-Agent':'Aeterna-Launcher-Source-Discovery/0.1'}});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const content=Buffer.from(await response.arrayBuffer());
   if(content.length>20*1024*1024)throw new Error('Unexpected file size');
   const sha1=crypto.createHash('sha1').update(content).digest('hex');
   result.downloadedSize=content.length;result.downloadedSha1=sha1;
   result.status=(content.length===file.size && sha1===file.sha1)?'exact-match':'different-file';
  }catch(error){result.error=String(error.message||error);}
  results.push(result);
  console.log(result.status+' '+file.path);
 }
 const report={generatedAt:new Date().toISOString(),source:'FTB official Maven candidate URLs',results,notes:'Only exact-match files can be considered for manifest inclusion, subject to distribution rules.'};
 await fs.writeFile(outputPath,JSON.stringify(report,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1});
