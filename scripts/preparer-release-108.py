#!/usr/bin/env python3
"""Verify exact 108 original mod JARs from ZIPs before GitHub Release upload."""
import hashlib, json, os, pathlib, sys, zipfile
from collections import defaultdict

ROOT=pathlib.Path(__file__).resolve().parents[1]
STAGING=ROOT/"staging-aeterna"
OUTPUT=ROOT/"release-aeterna-108"
MANIFEST=ROOT/"manifest/manifest-preparation-108.json"

def main():
    expected=json.loads(MANIFEST.read_text(encoding="utf-8"))["files"]
    by_name={pathlib.PurePosixPath(x["path"]).name:x for x in expected}
    if len(by_name)!=108 or len(expected)!=108:
        raise RuntimeError("Inventaire attendu : exactement 108 noms uniques")
    candidates=defaultdict(list)
    archives=sorted(STAGING.glob("*.zip"))
    if not archives:
        raise RuntimeError("Aucune archive ZIP dans staging-aeterna")
    for archive in archives:
        with zipfile.ZipFile(archive) as z:
            for entry in z.infolist():
                if entry.is_dir() or not entry.filename.lower().endswith(".jar"): continue
                filename=pathlib.PurePosixPath(entry.filename.replace("\\","/")).name
                if filename in by_name:
                    with z.open(entry) as source:
                        data=source.read()
                    candidates[filename].append((str(archive.name),data))
    for jar in STAGING.glob("*.jar"):
        if jar.name in by_name:
            candidates[jar.name].append((jar.name,jar.read_bytes()))
    OUTPUT.mkdir(exist_ok=True)
    errors=[]
    for filename, record in by_name.items():
        copies=candidates.get(filename,[])
        if not copies:
            errors.append("MANQUANT : "+filename);continue
        valid=[]
        for origin,data in copies:
            if len(data)==record["size"] and hashlib.sha1(data).hexdigest().lower()==record["sha1"].lower():
                valid.append((origin,data))
        if not valid:
            errors.append("SHA1/TAILLE DIFFERENT : "+filename);continue
        (OUTPUT/filename).write_bytes(valid[0][1])
    report={"expected":108,"verified":108-len(errors),"errors":errors,"archives":[p.name for p in archives]}
    (ROOT/"manifest/rapport-release-108.json").write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2,ensure_ascii=False))
    if errors:
        sys.exit("STOP : release interdite tant que les 108 fichiers ne correspondent pas")
if __name__=="__main__":
    main()
