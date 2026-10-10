'use strict';
// Node.js 20+ - discover exact Modrinth version files by SHA-1, without guessing URLs.
// Usage: node scripts/resolve-modrinth.js
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  const sourcePath = path.join(root,'manifest','manifest-inventaire.json');
  const manifest = JSON.parse(await fs.readFile(sourcePath,'utf8'));
  const report = { checkedAt: new Date().toISOString(), found: [], missing: [], errors: [] };
  const pending = manifest.files.filter(f => !f.url);
  for (const [index, f] of pending.entries()) {
    if (!/^[a-f0-9]{40}$/i.test(f.sha1)) throw new Error('SHA-1 invalide: '+f.path);
    const endpoint = 'https://api.modrinth.com/v2/version_file/'+f.sha1+'?algorithm=sha1';
    try {
      let response;
      for(let attempt=0; attempt<4; attempt++){
        response=await fetch(endpoint,{headers:{'User-Agent':'AeternaLauncher/0.1.0 (GitHub manifest matching)','Accept':'application/json'}});
        if(response.status!==429 && response.status<500) break;
        await sleep(1500*(attempt+1));
      }
      if(response.status===404){report.missing.push(f.path);continue;}
      if(!response.ok){report.errors.push({path:f.path,http:response.status});continue;}
      const version=await response.json();
      const match=(version.files||[]).find(x=>x.hashes?.sha1?.toLowerCase()===f.sha1.toLowerCase() && x.size===f.size);
      if(!match || !/^https:\/\//.test(match.url)){report.errors.push({path:f.path,reason:'Réponse non conforme SHA-1/taille/HTTPS'});continue;}
      report.found.push({path:f.path,url:match.url,sha1:f.sha1,size:f.size,projectId:version.project_id,versionId:version.id});
    } catch(e) {report.errors.push({path:f.path,reason:String(e.message||e)});}
    if((index+1)%10===0) console.log(index+1+'/'+pending.length+' traités');
    await sleep(300);
  }
  const reportPath=path.join(root,'manifest','modrinth-rapport.json');
  await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({found:report.found.length,missing:report.missing.length,errors:report.errors.length,report:reportPath},null,2));
  // Deliberately does NOT publish download links or modify the active manifest.
  // Verify license/redistribution terms and downloader compliance before enabling any result.
}
main().catch(e=>{console.error(e);process.exitCode=1;});
