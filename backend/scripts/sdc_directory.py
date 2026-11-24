import json,re
from pathlib import Path
from urllib.parse import urljoin
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor
import requests
from bs4 import BeautifulSoup
from PIL import Image
URL='https://michigantechhuskies.com/staff-directory'
def get(u):
 r=requests.get(u,timeout=25);r.raise_for_status();return r
soup=BeautifulSoup(get(URL).text,'html.parser')
people={}
for tr in soup.select('tr'):
 a=tr.select_one('a[href*="/staff-directory/"]')
 if not a:continue
 name=a.get_text(' ',strip=True)
 cells=tr.find_all('td')
 if not name or len(cells)<2:continue
 profile=urljoin(URL,a['href'])
 title=cells[1].get_text(' ',strip=True)
 phone=re.search(r'\b\d{3}-\d{3}-\d{4}\b',tr.get_text(' ',strip=True))
 email=tr.select_one('a[href^="mailto:"]')
 x={'name':name,'title':title,'office':'Athletics and Recreation directory (individual office not published)','profile_url':profile,'source':{'title':'Official athletics staff profile','url':profile,'source_type':'official_mtu'}}
 if phone:x['phone']=phone.group()
 if email:x['email']=email['href'][7:]
 people[name]=x
def photo(x):
 try:
  p=BeautifulSoup(get(x['profile_url']).text,'html.parser')
  tokens=re.findall(r'\w+',x['name'].lower())
  for img in p.select('img'):
   alt=img.get('alt','').lower()
   if not all(t in alt for t in (tokens[0],tokens[-1])):continue
   u=urljoin(x['profile_url'],img.get('data-src') or img.get('src') or '')
   if re.search('placeholder|no.photo|default',u,re.I):continue
   im=Image.open(BytesIO(get(u).content));im.load()
   if min(im.size)<100:continue
   key='sdc-'+re.sub(r'[^a-z0-9]+','-',x['name'].lower()).strip('-')+'.jpg'
   dest=Path('frontend/public/portraits');dest.mkdir(parents=True,exist_ok=True)
   im.thumbnail((800,800));im.convert('RGB').save(dest/key,quality=90)
   x.update(image_url='/portraits/'+key,image_source=u);break
 except Exception as e:print(x['name'],str(e))
 return x
assert len(people)>=20, 'Official directory extraction incomplete'
with ThreadPoolExecutor(max_workers=6) as pool: records=list(pool.map(photo,people.values()))
p=Path('backend/app/data/buildings.json');d=json.loads(p.read_text());b=next(b for b in d['buildings'] if b['id']==1012);b['people']=records;p.write_text(json.dumps(d,indent=2)+'\n')
print('SDC',len(records),'portraits',sum('image_url' in x for x in records))
