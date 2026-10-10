'use strict';
// Verify published candidate downloads byte-for-byte before enabling the modpack.
// Node 20+. Run: node scripts/verify-downloads.js
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root,'manifest','manifest-preparation-108.json');
const reportPath = path.join(root,'manifest','verification-telechargements.json');
const MAX_BYTES = 350 * 1024 * 1024;
async function verify(file) {
  const record={path:file.path,url:file.url,status:'error'};
  try {
    const u=new URL(file.url);
    if(u.protocol!=='https:') throw new Error('URL non HTTPS');
    if(!Number.isSafeInteger(file.size)||file.size<=0||file.size>MAX_BYTES) throw new Error('Taille non valide');
    if(!/^[a-f0-9]{40}$/i.test(file.sha1)) throw new Error('SHA-1 non valide');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),120000);
    try {
      const res=await fetch(u,{signal:controller.signal,headers:{'User-Agent':'Aeterna-Launcher-Verification/0.1.0'}});
      if(!res.ok || !res.body) throw new Error('HTTP '+res.status);
      const hash=crypto.createHash('sha1');
      let bytes=0;
      for await(const chunk of Readable.fromWeb(res.body)){
        bytes+=chunk.length;
        if(bytes>MAX_BYTES||bytes>file.size) throw new Error('Taille téléchargée excessive');
        hash.update(chunk);
      }
      const digest=hash.digest('hex');
      record.bytes=bytes;
      record.sha1=digest;
      record.status=(bytes===file.size && digest.toLowerCase()===file.sha1.toLowerCase())?'verified':'mismatch';
      if(record.status==='mismatch') record.error='Taille ou SHA-1 différent';
    } finally {clearTimeout(timeout);}
  }catch(e){record.error=String(e.message||e);}
  return record;
}
async function main(){
  const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
  const files=manifest.files||[];
  const report={checkedAt:new Date().toISOString(),total:files.length,verified:[],mismatch:[],errors:[],missing:[]};
  for(const [i,file] of files.entries()){
    if(!file.url){report.missing.push(file.path);continue;}
    const result=await verify(file);
    if(result.status==='verified')report.verified.push(result);
    else if(result.status==='mismatch')report.mismatch.push(result);
    else report.errors.push(result);
    console.log((i+1)+'/'+files.length+' '+result.status+' '+file.path);
  }
  await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log('Verified: '+report.verified.length+', mismatches: '+report.mismatch.length+', errors: '+report.errors.length+', missing: '+report.missing.length);
  // Nonzero for failures of links that were supposed to work; artifact is uploaded with if:always().
  if(report.mismatch.length||report.errors.length) process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
