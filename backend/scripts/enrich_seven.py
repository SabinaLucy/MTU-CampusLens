import json,re
from pathlib import Path
from urllib.parse import urljoin,urlsplit
from io import BytesIO
import requests
from bs4 import BeautifulSoup
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
BASE='https://www.mtu.edu/'
targets={
1:('Rekhi', ['computing/about/staff/','cs/department/faculty/','cs/department/staff/','computing/applied-computing/faculty-staff/']),
2:('MEEM|R\\. L\\. Smith', ['mechanical-aerospace/department/faculty/','mechanical-aerospace/department/staff/','mechanical-aerospace/department/faculty-staff/']),
3:('Fisher',['math/department/faculty/','math/department/staff/','math/department/faculty-staff/','physics/department/faculty/','physics/department/staff/']),
1000:('Admin(?:istration)?(?: and Student Services)?',['international/about/staff/','international/about/contact/','career/about/staff/','gradschool/about/staff/','deanofstudents/about/staff/','finaid/about/staff/','registrar/about/staff/']),
1002:('AOB|Academic Office Building',['business/people-groups/faculty-staff/','social-sciences/department/faculty-staff/']),
1012:('SDC|Student Development Complex',['recreation/about/staff/','athletics/']),
4:('MUB|Memorial Union(?: Building)?',['student-leadership/about/staff/','mub/about/staff/','admissions/about/staff/'])
}
def allowed(u):return urlsplit(u).scheme=='https' and urlsplit(u).hostname in ('www.mtu.edu','www-cf.mtu.edu')
def fetch(u):
    for _ in range(4):
        if not allowed(u):raise ValueError(u)
        r=requests.get(u,timeout=15,allow_redirects=False)
        if r.is_redirect:u=urljoin(u,r.headers['Location']);continue
        r.raise_for_status();return r
    raise ValueError('redirect limit')
def norm(s):return re.sub('[^a-z0-9]+',' ',s.lower()).strip()
def store(u,folder,key):
    if re.search('no.photo|placeholder|default|silhouette',u,re.I):return None
    try:
        with Image.open(BytesIO(fetch(u).content)) as im:
            im.load()
            if min(im.size)<100:return None
            folder=Path('frontend/public')/folder
            folder.mkdir(parents=True,exist_ok=True)
            im.thumbnail((1600,1600))
            im.convert('RGB').save(folder/(key+'.jpg'),quality=91)
        return '/'+folder.name+'/'+key+'.jpg'
    except Exception as e:print('image rejected',u,str(e))
def load(path):
    u=urljoin(BASE,path)
    try:return u,BeautifulSoup(fetch(u).text,'html.parser')
    except Exception as e:print('page unavailable',u,str(e));return u,None
def source(u):return {'title':'MTU official directory','url':u,'source_type':'official_mtu'}
def image_for(card,name,page):
    words=norm(name).split()
    if len(words)<2:return None
    for img in card.select('img'):
        alt=norm(img.get('alt',''))
        if words[0] in alt.split() and words[-1] in alt.split():
            s=img.get('data-src') or img.get('src')
            if s:return urljoin(page,s)
def records(soup,page,building):
    pattern=re.compile(r'(?<![A-Za-z])(?:'+building+r')\\s*(?:Hall|Building)?\\s*(?:Room\\s*)?([A-Z]?\\d{2,4}[A-Z]?)\\b',re.I)
    for a in soup.select('a[href^="mailto:"]'):
        email=a.get('href','')[7:].split('?')[0]
        if not email.endswith('@mtu.edu'):continue
        for card in list(a.parents)[:6]:
            headings=card.select('h2,h3,h4,h5')
            if len(headings)!=1:continue
            name=headings[0].get_text(' ',strip=True)
            if len(name.split())<2 or len(name)>90:continue
            text=card.get_text(' ',strip=True)
            office=pattern.search(text)
            if not office:continue
            if len(card.select('a[href^="mailto:"]'))!=1:continue
            title=''
            for el in card.select('.title,.position,.person-title,li,p'):
                t=el.get_text(' ',strip=True)
                if t and len(t)<160 and re.search(r'professor|director|manager|coordinator|advisor|adviser|assistant|specialist|coach|dean|chair|technician|aide',t,re.I) and '@' not in t:
                    title=t;break
            phone=re.search(r'906[-. ]487[-. ]\\d{4}',text)
            x={'name':name,'title':title or 'University personnel','office':office.group(0),'email':email,'source':source(page)}
            if phone:x['phone']=phone.group(0)
            img=image_for(card,name,page)
            if img:x['image_source']=img
            yield x;break
p=Path('backend/app/data/buildings.json')
d=json.loads(p.read_text())
report=[]
for b in d['buildings']:
    if b['id'] not in targets:continue
    pattern,paths=targets[b['id']]
    existing=b.get('people',[])
    found={}
    with ThreadPoolExecutor(max_workers=5) as pool: pages=list(pool.map(load,paths))
    for u,soup in pages:
        if soup is None:continue
        for x in records(soup,u,pattern):found[x['email']]=x
    for x in found.values():
        old=next((y for y in existing if y.get('email')==x['email'] or norm(y['name'])==norm(x['name'])),None)
        if old:old.update(x)
        else:existing.append(x)
    for x in existing:
        if x.get('image_url','').startswith('/portraits/'):continue
        img=x.get('image_source')
        if not img:
            for u,soup in pages:
                if soup is not None:
                    img=image_for(soup,x['name'],u)
                    if img:break
        if img:
            key=norm(x['name']).replace(' ','-')
            local=store(img,'portraits',key)
            if local:x.update(image_url=local,image_source=img)
    b['people']=existing
    url=b.get('image_url','')
    if not url.startswith('/buildings/'):
        if not url:
            # Only accept images whose alt text identifies the exact building.
            for page in ['tour/campus/','maps/','tour/campus/index.html']:
                u,soup=load(page)
                if soup is None:continue
                for img in soup.select('img'):
                    if norm(b['name']) in norm(img.get('alt','')) or re.search(pattern,img.get('alt',''),re.I):
                        v=img.get('data-src') or img.get('src')
                        if v:url=urljoin(u,v);break
                if url:break
        if url:
            local=store(url,'buildings',str(b['id']))
            if local:b.update(image_url=local,image_source=url)
    report.append({'building':b['name'],'people':len(existing),'new_source_matches':len(found),'local_portraits':sum(x.get('image_url','').startswith('/portraits/') for x in existing),'local_building_image':b.get('image_url','').startswith('/buildings/')})
p.write_text(json.dumps(d,indent=2)+'\n')
Path('directory-audit.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
