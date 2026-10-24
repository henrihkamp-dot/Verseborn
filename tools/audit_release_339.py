import tarfile, hashlib, json
from pathlib import Path
root=Path(__file__).resolve().parents[3]/'outputs'
def manifest(name):
    result={}
    with tarfile.open(root/name,'r|gz') as archive:
        for entry in archive:
            if entry.isfile():
                f=archive.extractfile(entry)
                h=hashlib.sha256()
                while data:=f.read(1024*1024):h.update(data)
                result[entry.name]=(entry.size,h.hexdigest())
    return result
a=manifest('inn-between-worlds-337.tar.gz');b=manifest('inn-overhaul-338-final.tar.gz')
diff=[{'file':key,'before':a.get(key),'after':b.get(key)} for key in sorted(a.keys()|b.keys()) if a.get(key)!=b.get(key)]
print(json.dumps(diff,indent=2))
