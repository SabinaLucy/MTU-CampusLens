"""Review-first official source discovery for every campus location."""
import json, re, time
from pathlib import Path
from urllib.parse import urljoin, urlsplit
import requests
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO

ROOT=Path(__file__).resolve().parents[1]
session=requests.Session()
session.headers["User-Agent"]="CampusLens academic directory research/1.0"
def approved(url):
    p=urlsplit(url)
    return p.scheme=="https" and (p.hostname=="mtu.edu" or (p.hostname or "").endswith(".mtu.edu"))
def fetch(url):
    for _ in range(5):
        if not approved(url): raise ValueError("Unapproved URL")
        time.sleep(.25)
        r=session.get(url,timeout=20,allow_redirects=False)
        if r.is_redirect:
            url=urljoin(url,r.headers["Location"])
            continue
        r.raise_for_status()
        return r
    raise ValueError("Too many redirects")
def norm(s):
    return re.sub(r"[^a-z0-9]+"," ",s.lower()).strip()
def matches(text,b):
    t=" "+norm(text)+" "
    return any(len(norm(n))>=4 and " "+norm(n)+" " in t for n in [b["name"],b["abbreviation"],*b.get("aliases",[])])
def image_candidates(soup,url,b):
    for el in soup.select("img"):
        label=" ".join([el.get("alt",""),el.get("title","")])
        if not matches(label,b): continue
        src=el.get("data-src") or el.get("src")
        if src: yield urljoin(url,src),label
def validate(url):
    r=fetch(url)
    if not r.headers.get("Content-Type","").startswith("image/"): raise ValueError("Not an image")
    with Image.open(BytesIO(r.content)) as im:
        size=im.size
        im.verify()
    if min(size)<100: raise ValueError("Image too small")
    return size

def main():
    buildings=json.loads((ROOT/"app/data/buildings.json").read_text())["buildings"]
    report={str(b["id"]):{"name":b["name"],"images":[],"people_candidates":[],"sources":[],"status":"needs_review"} for b in buildings}
    queue=["https://www.mtu.edu/tour/campus/","https://www.mtu.edu/virtual-tours/","https://events.mtu.edu/places","https://www.mtu.edu/ece/department/faculty/","https://www.mtu.edu/ece/department/staff/","https://www.mtu.edu/cs/department/people/","https://www.mtu.edu/applied-computing/about/faculty/","https://www.mtu.edu/"]
    queue += [b["source"]["url"] for b in buildings if not b["source"]["url"].endswith(".pdf")]
    seen=set(); errors=[]; checked={}
    while queue and len(seen)<350:
        url=queue.pop(0)
        if url in seen or not approved(url): continue
        seen.add(url)
        try:
            r=fetch(url)
            if "html" not in r.headers.get("Content-Type",""): continue
            soup=BeautifulSoup(r.text,"html.parser")
            title=soup.title.get_text(" ",strip=True) if soup.title else ""
            for b in buildings:
                out=report[str(b["id"])]
                if matches(title,b): out["sources"].append(r.url)
                for src,label in image_candidates(soup,r.url,b):
                    try:
                        if src not in checked: checked[src]=validate(src)
                        if not any(x["url"]==src for x in out["images"]):
                            out["images"].append({"url":src,"source":r.url,"label":label,"dimensions":checked[src],"status":"needs_visual_review"})
                    except Exception as e: errors.append({"url":src,"error":str(e)})
            for a in soup.select("a[href]"):
                link=urljoin(r.url,a["href"]).split("#")[0]
                label=a.get_text(" ",strip=True)
                if approved(link) and link not in seen and (any(matches(label,b) for b in buildings) or re.search(r"faculty|staff|directory|/people/|/department/|/places",urlsplit(link).path,re.I)):
                    if link not in queue: queue.append(link)
                if a["href"].startswith("mailto:"):
                    card=a.find_parent(["li","article","tr"]) or a.parent
                    context=card.get_text(" ",strip=True)
                    assigned=[b for b in buildings if matches(context,b)]
                    if len(assigned)==1 and re.search(r"\b\d{3,4}\b",context) and len(context)<1800:
                        out=report[str(assigned[0]["id"])]
                        item={"directory_text":context,"source":r.url,"status":"needs_identity_and_office_review"}
                        if item not in out["people_candidates"]: out["people_candidates"].append(item)
        except Exception as e: errors.append({"url":url,"error":str(e)})
    Path("research-output").mkdir(exist_ok=True)
    Path("research-output/coverage.json").write_text(json.dumps({"locations":list(report.values()),"pages_attempted":len(seen),"errors":errors},indent=2))
    print(f"Locations: {len(report)}; pages attempted: {len(seen)}; locations with image candidates: {sum(bool(x['images']) for x in report.values())}")
if __name__=="__main__": main()
