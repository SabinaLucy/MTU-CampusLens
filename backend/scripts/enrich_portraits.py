import json,re
from pathlib import Path
from urllib.parse import urljoin,urlsplit
import requests
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO
def norm(x): return re.sub(r"[^a-z0-9]+"," ",x.lower()).strip()
def get(url):
    if not url.startswith("https://www.mtu.edu/"): raise ValueError("Nonapproved source")
    r=requests.get(url,timeout=20,allow_redirects=False)
    r.raise_for_status()
    return r
def photos(url):
    r=get(url)
    for img in BeautifulSoup(r.text,"html.parser").select("img"):
        alt=img.get("alt","")
        src=img.get("data-src") or img.get("src")
        if alt and src: yield norm(alt),urljoin(url,src)
def valid(url):
    r=get(url)
    if not r.headers.get("Content-Type","").startswith("image/"): return False
    with Image.open(BytesIO(r.content)) as im:
        im.verify()
        return min(im.size)>=100
p=Path("backend/app/data/buildings.json")
d=json.loads(p.read_text())
e=next(b for b in d["buildings"] if b["id"]==1003)
sources=["https://www.mtu.edu/ece/department/faculty/","https://www.mtu.edu/ece/department/staff/","https://www.mtu.edu/residential-living/dining/"]
results={}
for source in sources:
    try: results[source]=list(photos(source))
    except Exception as exc: print(source,exc)
for person in e["people"]:
    name=norm(person["name"])
    candidates=[(u,s) for s,imgs in results.items() if "/ece/" in s for label,u in imgs if name==label or name+" " in label+" "]
    for u,s in candidates:
        try:
            if valid(u):
                person["image_url"]=u
                print(person["name"],u)
                break
        except Exception as exc: print(exc)
dining={}
for b in d["buildings"]:
    for x in b.get("dining",[]):
        for label,u in results.get(sources[-1],[]):
            if (x["id"]=="wads" and "wadsworth" in label and "social house" in label) or (x["id"]=="mcnair" and "eatery" in label and "mcnair" in label):
                try:
                    if valid(u): x["image_url"]=u; dining[x["id"]]=u
                except Exception as exc: print(exc)
p.write_text(json.dumps(d,indent=2)+"\n")
ui=Path("frontend/src/main.tsx")
s=ui.read_text()
m=re.search(r"const DINING: Dining\[\] = (\[[\s\S]*?\]);",s)
items=json.loads(m.group(1))
for x in items:
    if x["id"] in dining: x["image_url"]=dining[x["id"]]
ui.write_text(s[:m.start(1)]+json.dumps(items,indent=2)+s[m.end(1):])
print("Portraits:",sum(bool(x.get("image_url")) for x in e["people"]),"Dining photos:",len(dining))
