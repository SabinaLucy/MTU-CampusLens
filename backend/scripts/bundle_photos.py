import json,re,requests
from pathlib import Path
from urllib.parse import urljoin,urlsplit
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO
def norm(s): return re.sub(r'[^a-z0-9]+',' ',s.lower()).strip()
def fetch(u):
    if urlsplit(u).hostname not in ('www.mtu.edu','www-cf.mtu.edu','blogs.mtu.edu'): raise ValueError(u)
    r=requests.get(u,timeout=18,allow_redirects=False)
    if r.is_redirect: return requests.get(urljoin(u,r.headers['Location']),timeout=18,allow_redirects=False) if urlsplit(urljoin(u,r.headers['Location'])).hostname in ('www.mtu.edu','www-cf.mtu.edu','blogs.mtu.edu') else None
    r.raise_for_status()
    return r
def candidates(page,match):
    try:
        for img in BeautifulSoup(fetch(page).text,'html.parser').select('img'):
            src=img.get('data-src') or img.get('src','')
            if src and match(norm(img.get('alt',''))): yield urljoin(page,src)
    except Exception as exc: print(page,exc)
def store(url,folder,key):
    try:
        if 'no-photo' in url.lower() or 'placeholder' in url.lower(): return None
        with Image.open(BytesIO(fetch(url).content)) as im:
            im.load()
            if min(im.size)<100:return None
            folder.mkdir(parents=True,exist_ok=True)
            im.convert('RGB').save(folder/(key+'.jpg'),quality=93)
        return '/'+folder.name+'/'+key+'.jpg'
    except Exception as exc: print(url,exc)
p=Path('backend/app/data/buildings.json')
d=json.loads(p.read_text())
e=next(b for b in d['buildings'] if b['id']==1003)
slugs={'wwweaver':'weaver','gearcher':'archer','paulb':'bergstrom','jpbos':'bos','cmcischk':'cischke','fbcosta':'costa','bamork':'mork','oliveira':'oliveira','ajpinar':'pinar'}
base='https://www.mtu.edu/ece/department/'
for x in e['people']:
    key=x['email'].split('@')[0]
    words=norm(x['name']).split()
    matches=lambda a: words[0] in a.split() and words[-1] in a.split()
    pages=[base+'faculty/',base+'staff/',base+'faculty/index.html']
    if key in slugs: pages.insert(0,base+'faculty/'+slugs[key]+'/')
    if key=='wwweaver': pages += ['https://www.mtu.edu/engineering/about/administration/chairs/','https://blogs.mtu.edu/engineering/2025/06/21/wayne-weaver-named-ece-chair/']
    if x.get('image_url','').startswith('/portraits/'):continue
    urls=[x.get('image_url','')]
    for page in pages: urls.extend(candidates(page,matches))
    for url in dict.fromkeys(urls):
        if not url.startswith('https://'):continue
        local=store(url,Path('frontend/public/portraits'),key)
        if local:
            x.update(image_url=local,image_source=url);print('Portrait',x['name'],url);break
    else:
        if 'no-photo' in x.get('image_url',''):x.pop('image_url',None)
ui=Path('frontend/src/main.tsx')
s=ui.read_text()
m=re.search(r'const DINING: Dining\[\] = (\[[\s\S]*?\]);',s)
items=json.loads(m.group(1))
pages=['https://www.mtu.edu/residential-living/dining/index.html','https://www.mtu.edu/admissions/life/housing-dining/wadsworth/','https://www.mtu.edu/facilities/departments/planning-construction/construction-projects/completed-construction/','https://www.mtu.edu/library/','https://www.mtu.edu/mub/','https://www.mtu.edu/mont-ripley/','https://www.mtu.edu/golf/','https://www.mtu.edu/athletics/']
terms={'wads':['social house'],'mcnair':['eatery','mcnair dining'],'dhh':['food hall','dhh dining'],'campus':['campus cafe'],'library':['velodrome'],'mub':['mub grill'],'huski':['huski cafe'],'portage':['par grill','par and grill'],'sdc':['coaches corner']}
for x in items:
    key=x['id']
    for page in pages:
        found=False
        for url in candidates(page,lambda a:any(t in a for t in terms.get(key,[]))):
            local=store(url,Path('frontend/public/dining'),key)
            if local:
                x.update(image_url=local,image_source=url); print('Dining',x['name'],url);found=True;break
        if found:break
    if key=='dhh':x['name']='Food Hall at Douglass Houghton Hall'
for b in d['buildings']:
    for x in b.get('dining',[]):
        for y in items:
            if x['id']==y['id']:x.update(y)
p.write_text(json.dumps(d,indent=2)+'\n')
ui.write_text(s[:m.start(1)]+json.dumps(items,indent=2)+s[m.end(1):])
print('Local portraits',sum(x.get('image_url','').startswith('/portraits/') for x in e['people']))
print('Local dining',sum(x.get('image_url','').startswith('/dining/') for x in items))
