#!/usr/bin/env python3
"""Offline Forge mod metadata audit. Does not execute mod code."""
import argparse, hashlib, json, pathlib, re, tomllib, zipfile
from collections import defaultdict

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("mods_dir", help="Folder containing original mod JARs")
    ap.add_argument("--manifest", default="manifest/manifest-preparation-108.json")
    ap.add_argument("--output", default="manifest/audit-forge-local.json")
    args=ap.parse_args()
    manifest=json.loads(pathlib.Path(args.manifest).read_text(encoding="utf-8"))
    folder=pathlib.Path(args.mods_dir)
    entries=[]; mod_ids=defaultdict(list); missing=[]; problems=[]
    for expected in manifest["files"]:
        name=pathlib.Path(expected["path"]).name
        jar=folder/name
        if not jar.is_file():
            missing.append(name); continue
        info={"file":name,"mods":[],"dependencies":[],"issues":[]}
        raw=jar.read_bytes()
        sha=hashlib.sha1(raw).hexdigest()
        if sha.lower()!=expected["sha1"].lower() or len(raw)!=expected["size"]:
            info["issues"].append("SHA-1 or size differs from manifest")
        try:
            with zipfile.ZipFile(jar) as archive:
                for candidate in ("META-INF/mods.toml","META-INF/neoforge.mods.toml"):
                    if candidate not in archive.namelist(): continue
                    parsed=tomllib.loads(archive.read(candidate).decode("utf-8-sig"))
                    for mod in parsed.get("mods",[]):
                        mid=mod.get("modId")
                        if mid:
                            info["mods"].append(mid);mod_ids[mid].append(name)
                    for modid, deps in parsed.get("dependencies",{}).items():
                        for dep in deps:
                            info["dependencies"].append({"for":modid,"modId":dep.get("modId"),"mandatory":dep.get("mandatory"),"versionRange":dep.get("versionRange"),"side":dep.get("side")})
                if not info["mods"]:info["issues"].append("No readable Forge mods.toml mod IDs (may be library or other loader)")
        except (zipfile.BadZipFile,UnicodeDecodeError,ValueError) as e:
            info["issues"].append("Cannot parse JAR metadata: "+str(e))
        entries.append(info)
    for modid, filenames in mod_ids.items():
        if len(filenames)>1: problems.append({"type":"duplicate-mod-id","modId":modid,"files":filenames})
    for entry in entries:
        for dep in entry["dependencies"]:
            if dep["mandatory"] is True and dep["modId"] not in mod_ids and dep["modId"] not in ("minecraft","forge"):
                problems.append({"type":"missing-mandatory-dependency","file":entry["file"],"modId":dep["modId"],"versionRange":dep["versionRange"]})
    report={"summary":{"expected":len(manifest["files"]),"present":len(entries),"missing":len(missing),"duplicateModIds":sum(p["type"]=="duplicate-mod-id" for p in problems),"missingDependencies":sum(p["type"]=="missing-mandatory-dependency" for p in problems)},"missingFiles":missing,"problems":problems,"entries":entries,"limitations":["No mods are executed.","Version range satisfaction and mod loading are not validated.","Forge built-ins and dependency declarations may require manual interpretation.","Missing JARs prevent a complete audit."]}
    pathlib.Path(args.output).parent.mkdir(parents=True,exist_ok=True)
    pathlib.Path(args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report["summary"],indent=2))
    if missing or problems or any(e["issues"] for e in entries):raise SystemExit(1)
if __name__=="__main__":main()
