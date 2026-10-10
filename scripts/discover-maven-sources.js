'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const manifestPath=path.resolve(__dirname,'../manifest/manifest-preparation-108.json');
const outputPath=path.resolve(__dirname,'../manifest/maven-sources-rapport.json');
const candidates=[
 {path:'mods/geckolib-forge-1.20.1-4.8.4.jar',urls:[
  'https://dl.cloudsmith.io/public/geckolib3/geckolib/maven/software/bernie/geckolib/geckolib-forge-1.20.1/4.8.4/geckolib-forge-1.20.1-4.8.4.jar'
 ]},
 {path:'mods/voicechat-forge-1.20.1-2.6.21.jar',urls:[
  'https://maven.maxhenkel.de/repository/public/de/maxhenkel/voicechat/voicechat-forge-1.20.1/2.6.21/voicechat-forge-1.20.1-2.6.21.jar'
 ]}
];
async function probe(url,file){
 const record={url,status:'error'};
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),45000);
  try{
   const res=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'Aeterna-Launcher-Source-Discovery/0.1'}});
   if(!res.ok)throw new Error('HTTP '+res.status);
   const max=20*1024*1024;
   const hash=crypto.createHash('sha1');
   let size=0;
   for await(const chunk of res.body){
    size+=chunk.length;
    if(size>max||size>file.size)throw new Error('Downloaded file exceeds expected size');
    hash.update(chunk);
   }
   const sha1=hash.digest('hex');
   record.size=size;record.sha1=sha1;
   record.status=size===file.size&&sha1.toLowerCase()===file.sha1.toLowerCase()?'exact-match':'different-file';
  }finally{clearTimeout(timeout);}
 }catch(e){record.error=String(e.message||e);}
 return record;
}
async function main(){
 const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 const results=[];
 for(const candidate of candidates){
  const file=manifest.files.find(x=>x.path===candidate.path);
  if(!file){results.push({path:candidate.path,status:'not-in-manifest'});continue;}
  const checks=[];
  for(const url of candidate.urls){
   const check=await probe(url,file);
   checks.push(check);
   console.log(candidate.path+' '+check.status);
   if(check.status==='exact-match')break;
  }
  results.push({path:candidate.path,checks});
 }
 const report={generatedAt:new Date().toISOString(),notes:'Candidate Maven URLs only; never enable a URL without exact size and SHA-1 match and distribution review.',results};
 await fs.writeFile(outputPath,JSON.stringify(report,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
