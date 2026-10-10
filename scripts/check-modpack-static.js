'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest/manifest-preparation-108.json'),'utf8'));
const problems=[],warnings=[],seenPaths=new Map(),seenHashes=new Map();
if(!Array.isArray(manifest.files)||manifest.files.length!==108)problems.push('Expected 108 manifest entries');
for(const [i,f] of (manifest.files||[]).entries()){
 const id='#'+(i+1);
 if(typeof f.path!=='string'||!/^mods\/[\w .()+-]+\.jar$/i.test(f.path)||f.path.includes('..')){problems.push(id+' invalid path');continue;}
 const normalized=f.path.toLowerCase();
 if(seenPaths.has(normalized))problems.push('Duplicate path (case-insensitive): '+f.path+' and '+seenPaths.get(normalized));
 else seenPaths.set(normalized,f.path);
 if(!Number.isSafeInteger(f.size)||f.size<=0)problems.push(f.path+' invalid size');
 if(typeof f.sha1!=='string'||!/^[0-9a-f]{40}$/i.test(f.sha1))problems.push(f.path+' invalid SHA-1');
 else{
  const hash=f.sha1.toLowerCase();
  if(seenHashes.has(hash))warnings.push('Same SHA-1 under different filenames: '+f.path+' / '+seenHashes.get(hash));
  else seenHashes.set(hash,f.path);
 }
 if(f.url!==null&&f.url!==undefined){
  try{const u=new URL(f.url);if(u.protocol!=='https:')problems.push(f.path+' non-HTTPS URL');}
  catch{problems.push(f.path+' invalid URL');}
 }
}
const resolved=(manifest.files||[]).filter(f=>typeof f.url==='string'&&f.url.length>0).length;
const report={schemaVersion:1,generatedAt:new Date().toISOString(),entries:manifest.files.length,resolved,unresolved:manifest.files.length-resolved,problems,warnings,limitations:['Manifest-only static check; JAR metadata and Forge dependencies are NOT verified.','To verify actual mod IDs and dependencies, inspect META-INF/mods.toml inside the original JARs.','Remote download integrity is not tested by this script.']};
const dest=path.join(root,'manifest/controle-statique-rapport.json');
fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(problems.length)process.exitCode=1;
