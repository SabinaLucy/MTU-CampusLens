
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Camera, Search, MapPin, BookOpen, MessageCircle,
  ArrowLeft, ExternalLink, Building2, AlertCircle,
  Sun, Moon, CalendarDays, Home, Layers, Heart,
  Menu, X, ChevronRight, ChevronDown, ArrowUpRight,
  GraduationCap, Compass, ShieldCheck, Clock,
  Upload, Coffee
} from 'lucide-react';
import './index.css';

// Vite proxies locally; Vercel proxies deployed requests on the same origin.
const API = '';

const EVENT_URL = 'https://events.mtu.edu/';
const ROZSA_URL =
  'https://www.mtu.edu/rozsa/events-and-programs/calendar/';
const CAMPUS_MAP = 'https://map.mtu.edu/';

type Source = {
  title: string;
  url: string;
  checked_at?: string;
};

type Item = {
  id?: number;
  name?: string;
  room_number?: string;
  room_type?: string;
  notes?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  source?: Source;
};

type Person = {name: string; title: string; office: string; phone?: string; interests?: string; email?: string; image_url?: string; profile_url?: string; source: Source};

type Dining = {id:string; name:string; building_ids:number[]; type:string; menu:string; source:string; note:string; hours?:string; image_url?:string; image_source?:string};
const DINING: Dining[] = [
  {
    "id": "wads",
    "name": "The Social House at Wadsworth Hall",
    "building_ids": [
      1017
    ],
    "type": "Dining hall",
    "menu": "https://dineoncampus.com/MTU",
    "source": "https://www.mtu.edu/residential-living/education/break/upcoming-break/",
    "note": "Check official dining site for current menus and hours.",
    "hours": "Thanksgiving: closed until Nov 29, 4:30 PM",
    "image_url": "/dining/wads.jpg",
    "image_source": "https://www.mtu.edu/residential-living/dining/images/socialhouse2025-square250.jpg"
  },
  {
    "id": "mcnair",
    "name": "The Eatery at McNair",
    "building_ids": [
      1018,
      1019
    ],
    "type": "Dining hall",
    "menu": "https://dineoncampus.com/MTU",
    "source": "https://www.mtu.edu/residential-living/education/break/upcoming-break/",
    "note": "Check official dining site for current menus and hours.",
    "hours": "Thanksgiving: closed until Nov 30, 7 AM",
    "image_url": "/dining/mcnair.jpg",
    "image_source": "https://www.mtu.edu/residential-living/dining/images/summerstudentbrand20250604126-banner1200.jpg"
  },
  {
    "id": "dhh",
    "name": "Food Hall at Douglass Houghton Hall",
    "building_ids": [
      1015
    ],
    "type": "Dining hall",
    "menu": "https://dineoncampus.com/MTU",
    "source": "https://www.mtu.edu/residential-living/education/break/upcoming-break/",
    "note": "Check official dining site for current menus and hours.",
    "hours": "Thanksgiving: closed until Nov 30, 7 AM",
    "image_url": "/dining/dhh-card.svg"
  },
  {
    "id": "campus",
    "name": "Campus Café",
    "building_ids": [
      1017
    ],
    "type": "Café",
    "menu": "https://dineoncampus.com/MTU",
    "source": "https://www.mtu.edu/residential-living/education/break/upcoming-break/",
    "note": "Check official dining site for current menus and hours.",
    "hours": "Thanksgiving: closed until Nov 29, 6 PM",
    "image_url": "/dining/campus-card.svg"
  },
  {
    "id": "library",
    "name": "Velodrome Coffee Company",
    "building_ids": [
      5
    ],
    "type": "Café",
    "menu": "https://dineoncampus.com/MTU",
    "source": "https://www.mtu.edu/library/about/hours/",
    "note": "Check official dining site for current menus and hours.",
    "hours": "Published regular hours: Mon–Thu 8 AM–10 PM; Fri 8 AM–6 PM; Sat 9 AM–5 PM; Sun 9 AM–8 PM. Holiday exceptions apply.",
    "image_url": "/dining/library-card.svg"
  },
  {
    "id": "mub",
    "name": "MUB Grill",
    "building_ids": [
      4
    ],
    "type": "Restaurant",
    "menu": "https://dineoncampus.com/MTU",
    "source": "https://www.mtu.edu/residential-living/education/break/upcoming-break/",
    "note": "Check official dining site for current menus and hours.",
    "hours": "Closed Nov 25–29; reopens Nov 30, 10 AM",
    "image_url": "/dining/mub-card.svg"
  },
  {
    "id": "huski",
    "name": "Huski Café",
    "building_ids": [
      1059
    ],
    "type": "Café",
    "menu": "https://dineoncampus.com/MTU",
    "source": "https://www.mtu.edu/it/accounts/huskycard/",
    "note": "Check official dining site for current menus and hours.",
    "image_url": "/dining/huski-card.svg"
  },
  {
    "id": "portage",
    "name": "Par & Grill",
    "building_ids": [
      1033,
      1060
    ],
    "type": "Restaurant",
    "menu": "https://dineoncampus.com/MTU",
    "source": "https://www.mtu.edu/faculty-handbook/faculty/chapter9/s9-6/962/index.html",
    "note": "Listed in MTU's faculty handbook; confirm current operation and hours.",
    "image_url": "/dining/portage-card.svg"
  },
  {
    "id": "sdc",
    "name": "Coaches Corner",
    "building_ids": [
      1012
    ],
    "type": "Concessions",
    "menu": "https://dineoncampus.com/MTU",
    "source": "https://www.mtu.edu/faculty-handbook/faculty/chapter9/s9-6/962/index.html",
    "note": "Listed in MTU's faculty handbook; confirm current operation and hours.",
    "image_url": "/dining/sdc-card.svg"
  }
];
type Building = {
  image_url?: string;
  image_source?: Source;
  people?: Person[];
  directory_sources?: Source[];
  id: number;
  name: string;
  abbreviation: string;
  category?: string;
  location_type?: string;
  aliases?: string[];
  description: string;
  address: string;
  map_url: string;
  campus_map_number?: number;
  source?: Source;
  labs?: Item[];
  departments?: Item[];
  offices?: Item[];
  rooms?: Item[];
  events?: Item[];
  classes?: Item[];
};

type LiveEvent = {
  title: string;
  location: string;
  start_time: string;
  url: string;
  source: string;
  image_url?: string;
};

type EventsResponse = {
  events: LiveEvent[];
  status: 'live' | 'cached' | 'unavailable';
  building?: string;
};

type Prediction = {
  status: string;
  building_id: number | null;
  confidence?: string;
  evidence?: string;
  message?: string;
  provider?: string;
};

type Page =
  | 'Home'
  | 'Buildings'
  | 'Events'
  | 'Saved Buildings'
  | 'Dining & Cafés'
  | 'Ask CampusLens';

type BuildingTab =
  | 'Overview'
  | 'Departments & offices'
  | 'Dining & Cafés'
  | 'Faculty & Staff'
  | 'Events'
  | 'Classes & rooms'
  | 'Location'
  | 'Ask CampusLens';

const CAMPUS_CATEGORIES = ['Academic & Research', 'Sports & Recreation', 'Student Housing', 'Administration & Services', 'Other Campus Locations'] as const;

const tabs: BuildingTab[] = [
  'Overview',
  'Departments & offices',
  'Dining & Cafés',
  'Faculty & Staff',
  'Events',
  'Classes & rooms',
  'Location',
  'Ask CampusLens'
];

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API}${url}`, options);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();

      if (typeof data.detail === 'string') {
        message = data.detail;
      }
    } catch {
      // Keep the HTTP error message.
    }

    if (response.status === 404 && url.startsWith('/api/')) {
      message = `API endpoint ${url} returned 404. Check the server-side CampusLens API proxy configuration.`;
    }
    throw new Error(message);
  }

  return response.json();
}

function SourceLink({ source }: { source?: Source }) {
  if (!source?.url) return null;

  return (
    <a
      className="source-link"
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {source.title || 'Official source'}
      <ExternalLink size={13} />
    </a>
  );
}

function EventImage({ event, compact = false }: { event: LiveEvent; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={compact ? 'event-image compact' : 'event-image'}>
    {event.image_url && !failed
      ? <img src={event.image_url} alt={event.title} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      : <CalendarDays size={compact ? 26 : 40} aria-label="Event image unavailable" />}
  </div>;
}

function ProfilePhoto({ url, name, person = false }: {url?: string; name: string; person?: boolean}) {
  const [failed, setFailed] = useState(false);
  return <div className={person ? 'person-photo' : 'profile-photo'}>{url && !failed ? <img src={url} alt={name} loading="lazy" onError={() => setFailed(true)} /> : person ? <GraduationCap size={30} /> : <span><Building2 size={32} /> Official photograph not available</span>}</div>;
}

function Thumb({building}: {building:Building}) { const [failed,setFailed]=useState(false); return <span className="tile-icon campus-thumb">{building.image_url && !failed ? <img src={building.image_url} alt={building.name} loading="lazy" onError={()=>setFailed(true)}/> : <Building2 size={20}/>}</span>; }
function DiningCards({items, buildings, openBuilding}: {items:Dining[]; buildings:Building[]; openBuilding:(id:number)=>void}) { const [active,setActive]=useState<string|null>(null); const [q,setQ]=useState(''); const filtered=items.filter(x=>(x.name+' '+x.type+' '+buildings.filter(b=>x.building_ids.includes(b.id)).map(b=>b.name).join(' ')).toLowerCase().includes(q.toLowerCase())); const chosen=items.find(x=>x.id===active); return <><h2>{chosen?chosen.name:'Dining & Cafés'}</h2>{chosen?<button className="back-link" onClick={()=>setActive(null)}>Back to dining</button>:<input className="dining-search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search dining, cafés or buildings"/>}<div className="dining-grid">{(chosen?[chosen]:filtered).map(x=><article className="item-card dining-card" key={x.id}>{x.image_url?<ProfilePhoto url={x.image_url} name={x.name}/>:<div className="dining-photo"><Coffee size={32}/><small>Outlet photo not yet available</small></div>}<button className="text-action" onClick={()=>setActive(x.id)}>{x.name}</button><p>{x.type}</p><p><Clock size={15}/> {x.hours || 'Hours: check current official schedule'}</p><p>{x.note}</p><a href={x.menu} target="_blank" rel="noreferrer">Official menus & hours <ExternalLink size={14}/></a><a href={x.source} target="_blank" rel="noreferrer">University source</a>{buildings.filter(b=>x.building_ids.includes(b.id)).map(b=><button key={b.id} className="outline-btn" onClick={()=>{setActive(null);openBuilding(b.id)}}>{b.name}</button>)}</article>)}</div></>; }
function People({building}: {building: Building}) {
  const [search, setSearch] = useState('');
  const people = (building.people || []).filter(p => (p.name + ' ' + p.title + ' ' + p.office).toLowerCase().includes(search.toLowerCase()));
  return <><h2>Faculty & Staff</h2><p className="muted">Public university directory entries with offices verified in this building.</p>
    <div className="search-field"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search faculty and staff"/></div>
    {!people.length && <p className="muted">No matching verified profiles are loaded.</p>}
    <div className="people-grid">{people.map(p=><article className="item-card person-card" key={p.name+'-'+p.office}><ProfilePhoto key={p.image_url} url={p.image_url} name={p.name} person/><div><h3>{p.name}</h3><p>{p.title}</p><p><MapPin size={15}/> {p.office}</p>{p.email && <a href={'mailto:'+p.email}>{p.email}</a>}{p.phone && <p><a href={'tel:'+p.phone}>{p.phone}</a></p>}{p.interests && <p>{p.interests}</p>}<SourceLink source={p.profile_url ? {...p.source,url:p.profile_url,title:'Official profile'} : p.source}/></div></article>)}</div>
    {(building.directory_sources || []).map(source=><SourceLink key={source.url} source={source}/>)}</>;
}

function FilteredEvents({events,status}: {events:LiveEvent[];status:string}) {
 const [q,Q]=useState(''),[period,P]=useState('Upcoming'),[location,L]=useState(''),[from,F]=useState(''),[to,T]=useState(''),[sort,S]=useState('soon'),[view,V]=useState('cards');
 const day=(d:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
 const today=day(new Date());
 const shift=(n:number)=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return day(d)};
 const locations=[...new Set(events.map(e=>e.location).filter(Boolean))].sort();
 const filtered=events.filter(e=>{const date=new Date(e.start_time);if(!Number.isFinite(date.getTime()))return period==='Upcoming'&&!location;
 const k=day(date);return (!q||[e.title,e.location].join(' ').toLowerCase().includes(q.toLowerCase()))&&(!location||e.location===location)&&
 (period==='Upcoming'||period==='Today'&&k===today||period==='Tomorrow'&&k===shift(1)||period==='This week'&&k>=today&&k<=shift(6)||period==='This month'&&k.slice(0,7)===today.slice(0,7)||period==='Custom'&&(!from||k>=from)&&(!to||k<=to));
 }).sort((a,b)=>sort==='name'?a.title.localeCompare(b.title):sort==='latest'?Date.parse(b.start_time)-Date.parse(a.start_time):Date.parse(a.start_time)-Date.parse(b.start_time));
 return <><div className="event-filters"><input aria-label="Search events" placeholder="Search events or locations" value={q} onChange={e=>Q(e.target.value)}/><div className="event-periods">{['Upcoming','Today','Tomorrow','This week','This month','Custom'].map(x=><button key={x} type="button" aria-pressed={period===x} onClick={()=>P(x)}>{x}</button>)}</div>{period==='Custom'&&<div className="event-filter-grid"><label>From<input type="date" value={from} onChange={e=>F(e.target.value)}/></label><label>To<input type="date" min={from} value={to} onChange={e=>T(e.target.value)}/></label></div>}<div className="event-filter-grid"><label>Building / location<select value={location} onChange={e=>L(e.target.value)}><option value="">All locations</option>{locations.map(x=><option key={x}>{x}</option>)}</select></label><label>Sort<select value={sort} onChange={e=>S(e.target.value)}><option value="soon">Soonest first</option><option value="latest">Latest first</option><option value="name">Name A–Z</option></select></label><label>View<select value={view} onChange={e=>V(e.target.value)}><option value="cards">Cards</option><option value="days">By date</option></select></label></div><button type="button" onClick={()=>{Q('');P('Upcoming');L('');F('');T('');S('soon');V('cards')}}>Reset filters</button><p className="muted">{filtered.length} of {events.length} events • Eastern time</p></div>{view==='days'&&filtered.length&&status!=='loading'&&status!=='unavailable'? [...new Set(filtered.map(e=>day(new Date(e.start_time))))].sort().map(k=><section key={k}><h3>{k}</h3><LiveEventCards events={filtered.filter(e=>day(new Date(e.start_time))===k)} status={status}/></section>):<LiveEventCards events={filtered} status={status}/>}</>
}

function LiveEventCards({
  events,
  status
}: {
  events: LiveEvent[];
  status: string;
}) {
  if (status === 'loading') {
    return (
      <div className="empty-record">
        <CalendarDays size={20} />
        Loading upcoming university events...
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="empty-record">
        <AlertCircle size={20} />
        The university calendar is temporarily unavailable.
        Please check the official calendar.
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="empty-record">
        <CalendarDays size={20} />
        No upcoming events were found for this location.
      </div>
    );
  }

  return (
    <>
      <p className="muted">
        {events.length} upcoming event
        {events.length === 1 ? '' : 's'} found
        {status === 'cached' ? ' (cached results)' : ''}.
      </p>

      <div className="items-grid">
        {events.map((event, index) => {
          const date = new Date(event.start_time);

          const formattedDate = Number.isNaN(date.getTime())
            ? event.start_time
            : date.toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'America/Detroit'
              });

          return (
            <article
              className="item-card"
              key={`${event.title}-${event.start_time}-${index}`}
            >
              <EventImage event={event} />
              <span className="eyebrow">
                <CalendarDays size={14} />
                MTU EVENT
              </span>

              <h3>{event.title}</h3>

              <p>
                <Clock size={15} />
                {' '}{formattedDate}
              </p>

              <p>
                <MapPin size={15} />
                {' '}{event.location}
              </p>

              <a
                className="source-link"
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View official event
                <ExternalLink size={14} />
              </a>
            </article>
          );
        })}
      </div>
    </>
  );
}

function Items({
  items,
  empty
}: {
  items?: Item[];
  empty: string;
}) {
  if (!items?.length) {
    return (
      <div className="empty-record">
        <ShieldCheck size={20} />
        {empty}
      </div>
    );
  }

  return (
    <div className="items-grid">
      {items.map((item, index) => (
        <article
          className="item-card"
          key={item.id ?? index}
        >
          <strong>
            {item.name ||
              item.title ||
              (item.room_number
                ? `Room ${item.room_number}`
                : 'Record')}
          </strong>

          {item.room_type && <p>{item.room_type}</p>}
          {item.description && <p>{item.description}</p>}
          {item.notes && <p>{item.notes}</p>}

          {item.start_time && (
            <p>
              <Clock size={13} />
              {item.start_time}
              {item.end_time ? ` – ${item.end_time}` : ''}
            </p>
          )}

          <SourceLink source={item.source} />
        </article>
      ))}
    </div>
  );
}

type CampusTurn={role:'user'|'assistant';text:string;attachment?:string;nearby?:{id:number;name:string;meters:number}[]};
function CampusChat({openBuilding}:{openBuilding:(id:number)=>void}){
 const key='campuslens-chat-v1';
 const bottom=React.useRef<HTMLDivElement>(null),watch=React.useRef<number|null>(null); const [preview,Preview]=useState('');
 const [turns,U]=useState<CampusTurn[]>(()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}}),[q,Q]=useState(''),[file,F]=useState<File|null>(null),[busy,B]=useState(false),[pos,P]=useState<GeolocationCoordinates|null>(null),[notice,N]=useState('');
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(turns))}catch{}},[turns]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest',behavior:'smooth'})},[turns,busy]);
 useEffect(()=>{if(!file||!file.type.startsWith('image/')){Preview('');return}const url=URL.createObjectURL(file);Preview(url);return()=>URL.revokeObjectURL(url)},[file]);
 function stopLocation(){if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);watch.current=null;P(null);N('Location sharing stopped.');}
 useEffect(()=>()=>{if(watch.current!==null)navigator.geolocation.clearWatch(watch.current)},[]);
 function clear(){if(window.confirm('Clear this conversation history from this device?')){U([]);Q('');F(null);stopLocation();N('');localStorage.removeItem(key)}}
 function locate(){if(!navigator.geolocation){N('Location is unavailable.');return}if(watch.current!==null){stopLocation();return}watch.current=navigator.geolocation.watchPosition(p=>{P(p.coords);N('Live location enabled')},()=>{stopLocation();N('Location permission denied or unavailable. You can still chat.')},{enableHighAccuracy:true,timeout:12000,maximumAge:0})}
 async function send(e:React.FormEvent){e.preventDefault();if(busy||(!q.trim()&&!file))return;if(file&&file.size>3*1024*1024){N('Choose an attachment under 3 MB.');return}const text=q.trim()||'What can you tell me about this attachment?';const data=new FormData();data.append('question',text);data.append('history',JSON.stringify(turns.slice(-12)));data.append('location',JSON.stringify(pos?{latitude:pos.latitude,longitude:pos.longitude,accuracy:pos.accuracy}:null));if(file)data.append('file',file);U(t=>[...t,{role:'user',text,attachment:file?.name}]);Q('');F(null);B(true);try{const res=await request<{answer:string;nearby:CampusTurn['nearby']}>('/api/campus-chat',{method:'POST',body:data});U(t=>[...t,{role:'assistant',text:res.answer,nearby:res.nearby}])}catch{U(t=>[...t,{role:'assistant',text:'Could not reach CampusLens. Please try again.'}])}finally{B(false)}}
 return <section className="campus-chat"><header><div className="chat-heading"><span className="chat-brand-icon"><MessageCircle size={22}/></span><div><h2>Ask CampusLens</h2><small>Your intelligent campus companion</small></div></div><button className="chat-action" disabled={busy} onClick={clear}>Clear history</button></header><div className="chat-thread">{!turns.length&&<div className="chat-welcome"><span className="chat-orb"><Compass size={38}/></span><h1>Explore. Discover. Ask.</h1><p>Your campus. Your questions. One place.</p><div className="chat-prompts">{[{q:'What buildings are near me?',t:'Near me',d:'Explore nearby places',I:MapPin},{q:'Identify a building from a photo',t:'Identify a place',d:'Take or upload a photo',I:Camera},{q:'Find food nearby',t:'Find food',d:'Explore dining options',I:Coffee},{q:'What events are happening today?',t:'Campus events',d:'Discover what is happening',I:CalendarDays},{q:'Find faculty and staff',t:'Find someone',d:'Search the directory',I:GraduationCap},{q:'Help me find my way around',t:'Get directions',d:'Explore the campus',I:Compass}].map(({q,t,d,I})=><button className="chat-suggestion" key={q} onClick={()=>Q(q)}><span><I size={22}/></span><strong>{t}</strong><small>{d}</small></button>)}</div></div>}{turns.map((t,i)=><article className={'chat-turn '+t.role} key={i}><strong>{t.role==='user'?'You':'CampusLens'}</strong>{t.attachment&&<small>{t.attachment}</small>}<p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{t.text}</p>{t.nearby?.map(x=><button className="chat-action" key={x.id} onClick={()=>openBuilding(x.id)}>{x.name} · {x.meters} m straight-line</button>)}{t.role==='assistant'&&<button className="chat-action" onClick={()=>navigator.clipboard.writeText(t.text)}>Copy</button>}</article>)}{busy&&<p className="chat-thinking">CampusLens is thinking…</p>}<div ref={bottom}/></div><form className="chat-composer" onSubmit={send}><textarea rows={3} maxLength={4000} value={q} onChange={e=>Q(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&window.matchMedia('(pointer:fine)').matches){e.preventDefault();e.currentTarget.form?.requestSubmit()}}} placeholder="Ask CampusLens anything…"/>{file&&<div className="chat-attachment">{preview&&<img src={preview} alt="Attachment preview"/>}{file.name} <button type="button" onClick={()=>F(null)}>Remove</button></div>}<div className="chat-tools"><label className="chat-action"><Upload size={16}/> Attach<input hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={e=>{F(e.target.files?.[0]||null);e.target.value=''}}/></label><label className="chat-action"><Camera size={16}/> Camera<input hidden type="file" accept="image/*" capture="environment" onChange={e=>{F(e.target.files?.[0]||null);e.target.value=''}}/></label><button type="button" className="chat-action" onClick={locate}><MapPin size={16}/>{pos?'Stop location':'Use location'}</button>{pos&&<button type="button" className="chat-action" onClick={stopLocation}>Remove location</button>}<button type="submit" className="gold-btn" disabled={busy||(!q.trim()&&!file)} aria-label="Send message"><ArrowUpRight size={22}/></button></div><small>{notice||'Optional attachments and location are sent with your question. Chat text is saved on this device.'}</small></form><small>CampusLens may make mistakes. Verify important information.</small></section>
}

function App() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selected, setSelected] = useState<Building | null>(null);

  const [prediction, setPrediction] =
    useState<Prediction | null>(null);

  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [tab, setTab] = useState<BuildingTab>('Overview');

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerSources, setAnswerSources] =
    useState<Source[]>([]);
  const [chatBusy, setChatBusy] = useState(false);

  const [page, setPage] = useState<Page>('Home');
  const [mobileMenu, setMobileMenu] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    localStorage.getItem('campuslens-theme') === 'dark'
      ? 'dark'
      : 'light'
  );

  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('campuslens-favorites') || '[]'
      );
    } catch {
      return [];
    }
  });

  // LIVE EVENTS STATE
  const [liveEvents, setLiveEvents] =
    useState<LiveEvent[]>([]);
  const [eventsStatus, setEventsStatus] =
    useState('loading');

  const [buildingEvents, setBuildingEvents] =
    useState<LiveEvent[]>([]);
  const [buildingEventsStatus, setBuildingEventsStatus] =
    useState('loading');

  // THEME
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('campuslens-theme', theme);
  }, [theme]);

  // FAVORITES
  useEffect(() => {
    localStorage.setItem(
      'campuslens-favorites',
      JSON.stringify(favorites)
    );
  }, [favorites]);

  // LOAD BUILDINGS
  useEffect(() => {
    request<Building[]>('/api/buildings')
      .then(setBuildings)
      .catch(e => setError(e.message));
  }, []);

  // CLEAN UP IMAGE PREVIEWS
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // LOAD ALL UPCOMING MTU EVENTS
  useEffect(() => {
    let cancelled = false;

    request<EventsResponse>('/api/events')
      .then(data => {
        if (cancelled) return;
        setLiveEvents(data.events);
        setEventsStatus(data.status);
      })
      .catch(() => {
        if (!cancelled) {
          setEventsStatus('unavailable');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // LOAD EVENTS FOR THE SELECTED BUILDING
  useEffect(() => {
    if (!selected || tab !== 'Events') return;

    let cancelled = false;

    setBuildingEvents([]);
    setBuildingEventsStatus('loading');

    request<EventsResponse>(
      `/api/buildings/${selected.id}/events`
    )
      .then(data => {
        if (cancelled) return;

        setBuildingEvents(data.events);
        setBuildingEventsStatus(data.status);
      })
      .catch(() => {
        if (!cancelled) {
          setBuildingEventsStatus('unavailable');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.id, tab]);

  const filtered = useMemo(() => {
    const search = query.toLowerCase();

    return buildings.filter(building =>
      `${building.name} ${building.abbreviation} ${(building.aliases || []).join(' ')} ${building.category || ''} ${building.description}`
        .toLowerCase()
        .includes(search)
    );
  }, [buildings, query]);

  function navigate(destination: Page) {
    setPage(destination);
    setSelected(null);
    setMobileMenu(false);
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  async function openBuilding(id: number) {
    setLoading(true);
    setError('');

    try {
      const building = await request<Building>(
        `/api/buildings/${id}`
      );

      setSelected(building);
      setPrediction(null);
      setTab('Overview');
      setQuestion('');
      setAnswer('');
      setAnswerSources([]);

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function chooseFile(file?: File) {
    if (!file) return;

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (
      !allowed.includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError(
        'Please select a JPG, PNG or WebP image under 8 MB.'
      );
      return;
    }

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setPrediction(null);
    setError('');
  }

  async function analyze() {
    if (!photo) return;

    setLoading(true);
    setError('');
    setPrediction(null);

    const form = new FormData();
    form.append('file', photo);

    try {
      const result = await request<Prediction>(
        '/api/recognize',
        {
          method: 'POST',
          body: form
        }
      );

      setPrediction(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();

    if (!selected || question.trim().length < 2) {
      return;
    }

    setChatBusy(true);
    setAnswer('');

    try {
      const response = await request<{
        answer: string;
        sources: Source[];
      }>('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          building_id: selected.id,
          question
        })
      });

      setAnswer(response.answer);
      setAnswerSources(response.sources || []);
    } catch (e) {
      setAnswer(String(e));
    } finally {
      setChatBusy(false);
    }
  }

  function toggleFavorite(id: number) {
    setFavorites(current =>
      current.includes(id)
        ? current.filter(value => value !== id)
        : [...current, id]
    );
  }

  const nav: [Page, React.ReactNode][] = [
    ['Home', <Home size={18} />],
    ['Buildings', <Building2 size={18} />],
    ['Dining & Cafés', <Coffee size={18} />],
    ['Events', <CalendarDays size={18} />],
    ['Saved Buildings', <Heart size={18} />],
    ['Ask CampusLens', <MessageCircle size={18} />]
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => navigate('Home')}
        >
          <span className="brand-symbol">
  <img
    src="/images/husky-icon.png"
    alt="Michigan Tech Husky icon"
    className="brand-logo-img"
  />
</span>

          <span className="brand-text">
            <strong>
              MTU <em>CampusLens</em>
            </strong>
            <small>
              Michigan Technological University · Student project
            </small>
          </span>
        </button>

        <nav className="topnav">
          {nav.map(([destination, icon]) => (
            <button
              key={destination}
              className={
                page === destination ? 'active' : ''
              }
              onClick={() => navigate(destination)}
            >
              {icon}
              {destination}
            </button>
          ))}
        </nav>

        <div className="top-actions">
          <button
            className="icon-btn"
            aria-label="Switch theme"
            title="Switch light/dark theme"
            onClick={() =>
              setTheme(current =>
                current === 'dark' ? 'light' : 'dark'
              )
            }
          >
            {theme === 'dark'
              ? <Sun size={19} />
              : <Moon size={19} />}
          </button>

          <button
            className="icon-btn mobile-menu"
            aria-label="Toggle menu"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <div className="layout">
        <aside
          className={`sidebar ${mobileMenu ? 'open' : ''}`}
        >
          <div className="side-label">DISCOVER</div>

          {nav.filter(([destination]) => destination !== 'Saved Buildings').map(([destination, icon]) => (
            <button
              key={destination}
              className={`side-item ${
                page === destination ? 'active' : ''
              }`}
              onClick={() => navigate(destination)}
            >
              {icon}
              {destination}
            </button>
          ))}

          <div className="side-divider" />

          <div className="side-label">
            CAMPUS RESOURCES
          </div>

          <a
            className="side-item"
            href={CAMPUS_MAP}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin size={18} />
            Campus map
            <ExternalLink size={13} />
          </a>

          <a
            className="side-item"
            href={EVENT_URL}
            target="_blank"
            rel="noreferrer"
          >
            <CalendarDays size={18} />
            MTU events
            <ExternalLink size={13} />
          </a>

          <a
            className="side-item"
            href={ROZSA_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Compass size={18} />
            Rozsa Center
            <ExternalLink size={13} />
          </a>

          <a
            className="side-item"
            href="https://www.mtu.edu/registrar/"
            target="_blank"
            rel="noreferrer"
          >
            <GraduationCap size={18} />
            Registrar
            <ExternalLink size={13} />
          </a>

          <div className="side-divider" />

          <div className="side-label">YOUR SPACE</div>

          <button className={`side-item ${page === 'Saved Buildings' ? 'active' : ''}`} onClick={() => navigate('Saved Buildings')}>
            <Heart size={18} />
            Saved Buildings ({favorites.length})
          </button>

          <div className="side-foot">
            <span>✦ CAMPUSLENS</span>
            <p>
              Built by students. Grounded in public MTU information.
            </p>
          </div>
        </aside>

        <main className="main-area">
          {error && (
            <div className="error-box" role="alert">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {selected ? (
            <>
              <button
                className="back-link"
                onClick={() => {
                  setSelected(null);
                }}
              >
                <ArrowLeft size={17} />
                {page === 'Saved Buildings' ? 'Saved Buildings' : 'Back'}
              </button>

              <ProfilePhoto key={selected.id} url={selected.image_url} name={selected.name}/>
              {selected.image_source && <SourceLink source={selected.image_source}/>}
              <div className="building-banner">
                <span className="eyebrow">
                  BUILDING {selected.campus_map_number ?? '—'}
                  {' '}· CAMPUSLENS
                </span>

                <h1>{selected.name}</h1>

                <p>
                  <MapPin size={17} />
                  {selected.address}
                </p>

                <button
                  className={`favorite-btn ${
                    favorites.includes(selected.id)
                      ? 'saved'
                      : ''
                  }`}
                  onClick={() => toggleFavorite(selected.id)}
                >
                  <Heart
                    size={17}
                    fill={
                      favorites.includes(selected.id)
                        ? 'currentColor'
                        : 'none'
                    }
                  />
                  {favorites.includes(selected.id)
                    ? 'Saved'
                    : 'Save building'}
                </button>
              </div>

              <div className="tabs">
                {tabs.filter(value=>value !== 'Dining & Cafés' || DINING.some(x=>x.building_ids.includes(selected.id))).map(value => (
                  <button
                    key={value}
                    className={
                      tab === value ? 'active' : ''
                    }
                    onClick={() => setTab(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <section className="content-card">
                {tab === 'Overview' && (
                  <>
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">
                          BUILDING PROFILE
                        </span>
                        <h2>About this building</h2>
                      </div>
                      <ShieldCheck className="accent" />
                    </div>

                    <p className="body-copy">
                      {selected.description}
                    </p>

                    <div className="metric-row">
                      <div>
                        <Building2 size={21} />
                        <strong>
                          {(selected.departments?.length || 0) +
                            (selected.offices?.length || 0)}
                        </strong>
                        <span>
                          Verified departments & offices
                        </span>
                      </div>

                      <div>
                        <BookOpen size={21} />
                        <strong>
                          {selected.rooms?.length || 0}
                        </strong>
                        <span>Verified rooms</span>
                      </div>

                      <div>
                        <CalendarDays size={21} />
                        <strong>
                          {selected.events?.length || 0}
                        </strong>
                        <span>Curated events</span>
                      </div>
                    </div>

                    <SourceLink source={selected.source} />

                    <p className="disclaimer">
                      Building records are curated snapshots.
                      Check the Events tab for live calendar listings.
                    </p>
                  </>
                )}

                {tab === 'Departments & offices' && (
                  <>
                    <h2>Departments</h2>
                    {(selected.directory_sources || []).map(source => <SourceLink key={source.url} source={source}/>)}

                    <Items
                      items={selected.departments}
                      empty="No verified department records are loaded."
                    />

                    <h2 className="subhead">
                      Offices & facilities
                    </h2>

                    <Items
                      items={selected.offices}
                      empty="No verified office records are loaded."
                    />
                    {!!selected.labs?.length && <><h2 className="subhead">Research laboratories & facilities</h2><Items items={selected.labs} empty="No verified laboratory records are loaded."/></>}
                  </>
                )}

                {tab === 'Dining & Cafés' && <DiningCards key={selected.id} items={DINING.filter(x=>x.building_ids.includes(selected.id))} buildings={buildings} openBuilding={openBuilding}/>}
                {tab === 'Faculty & Staff' && <People key={selected.id} building={selected}/>}

                {tab === 'Events' && (
                  <>
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">
                          LIVE CAMPUS CALENDAR
                        </span>
                        <h2>Events at {selected.name}</h2>
                      </div>
                      <CalendarDays className="accent" />
                    </div>

                    <p className="muted">
                      Upcoming events retrieved from Michigan
                      Tech's official university calendar.
                    </p>

                    <LiveEventCards
                      events={buildingEvents}
                      status={buildingEventsStatus}
                    />

                    <div className="resource-buttons">
                      <a
                        href={EVENT_URL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Official MTU events
                        <ArrowUpRight size={16} />
                      </a>

                      <a
                        href={ROZSA_URL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Rozsa calendar
                        <ArrowUpRight size={16} />
                      </a>
                    </div>
                  </>
                )}

                {tab === 'Classes & rooms' && (
                  <>
                    <h2>Verified rooms</h2>

                    <Items
                      items={selected.rooms}
                      empty="No verified room records are loaded."
                    />

                    <h2 className="subhead">
                      Published classes
                    </h2>

                    <Items
                      items={selected.classes}
                      empty="No verified class schedules are loaded."
                    />
                  </>
                )}

                {tab === 'Location' && (
                  <>
                    <h2>Find this building</h2>

                    <p className="body-copy">
                      {selected.address}
                    </p>

                    <a
                      className="gold-btn inline"
                      href={selected.map_url || CAMPUS_MAP}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={17} />
                      Open official campus map
                      <ArrowUpRight size={16} />
                    </a>
                  </>
                )}

                {tab === 'Ask CampusLens' && (
                  <>
                    <h2>Ask CampusLens</h2>

                    <p className="muted">
                      Ask about {selected.abbreviation}.
                      Answers use curated building records
                      and cite available sources.
                    </p>

                    <form
                      className="ask-form"
                      onSubmit={ask}
                    >
                      <input
                        value={question}
                        onChange={e =>
                          setQuestion(e.target.value)
                        }
                        minLength={2}
                        maxLength={500}
                        placeholder="Which departments are in this building?"
                      />

                      <button
                        className="gold-btn"
                        disabled={
                          chatBusy ||
                          question.trim().length < 2
                        }
                      >
                        {chatBusy ? 'Thinking…' : 'Ask AI'}
                        <ArrowUpRight size={17} />
                      </button>
                    </form>

                    {answer && (
                      <div className="answer">
                        <MessageCircle size={19} />

                        <div>
                          <p>{answer}</p>

                          {answerSources.map((source, index) => (
                            <SourceLink
                              key={index}
                              source={source}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          ) : page === 'Home' ? (
            <>
              <section className="hero">
                <div className="hero-inner">
                  <span className="eyebrow">
                    ✦ EXPLORE MICHIGAN TECH
                  </span>

                  <h1>
                    Discover MTU
                    <br />
                    buildings, events
                    <br />
                    <em>& resources.</em>
                  </h1>

                  <p>
                    Identify a building from a photo,
                    explore verified campus information,
                    and ask questions with AI.
                  </p>

                  <div className="hero-actions">
                    <button
                      className="gold-btn"
                      onClick={() => navigate('Buildings')}
                    >
                      <Camera size={18} />
                      Identify a building
                    </button>

                    <button
                      className="outline-btn"
                      onClick={() => navigate('Buildings')}
                    >
                      Explore buildings
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>

                <div className="hero-art campus-photo">
  <img
    src="/images/mtu-campus.webp"
    alt="Aerial view of Michigan Technological University campus"
    className="campus-hero-image"
  />

  <span className="campus-photo-label">
    <MapPin size={14} />
    MICHIGAN TECH · HOUGHTON, MI
  </span>
</div>
              </section>

              <div className="quick-actions">
                <button
                  onClick={() => navigate('Buildings')}
                >
                  <Camera />
                  <span>
                    <strong>Identify a building</strong>
                    <small>
                      Upload a photo for AI recognition
                    </small>
                  </span>
                  <ChevronRight />
                </button>

                <button
                  onClick={() => navigate('Buildings')}
                >
                  <Layers />
                  <span>
                    <strong>Explore buildings</strong>
                    <small>
                      Browse supported campus locations
                    </small>
                  </span>
                  <ChevronRight />
                </button>

                <button
                  onClick={() => navigate('Events')}
                >
                  <CalendarDays />
                  <span>
                    <strong>Campus events</strong>
                    <small>
                      Live university calendar listings
                    </small>
                  </span>
                  <ChevronRight />
                </button>

                <button
                  onClick={() => navigate('Ask CampusLens')}
                >
                  <MessageCircle />
                  <span>
                    <strong>Ask CampusLens</strong>
                    <small>
                      Grounded answers about buildings
                    </small>
                  </span>
                  <ChevronRight />
                </button>
              </div>

              <div className="home-columns">
                <section className="content-card">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">
                        WHAT'S HAPPENING
                      </span>
                      <h2>Campus events</h2>
                    </div>

                    <button
                      className="text-action"
                      onClick={() => navigate('Events')}
                    >
                      Explore
                      <ArrowUpRight size={16} />
                    </button>
                  </div>

                  <div className="event-promo">
                    <CalendarDays size={30} />

                    <div>
                      <strong>
                        Upcoming events at Michigan Tech
                      </strong>

                      {eventsStatus === 'loading' ? (
                        <p>Loading university events...</p>
                      ) : eventsStatus === 'unavailable' ? (
                        <p>
                          The live calendar is temporarily
                          unavailable.
                        </p>
                      ) : (
                        <p>
                          {liveEvents.length} upcoming
                          university events retrieved.
                        </p>
                      )}

                      <button
                        className="text-action"
                        onClick={() => navigate('Events')}
                      >
                        Explore events
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>

                  {liveEvents.slice(0, 2).map((event, index) => (
                    <div
                      className="event-promo"
                      key={`${event.start_time}-${index}`}
                    >
                      <EventImage event={event} compact />

                      <div>
                        <strong>{event.title}</strong>

                        <p>
                          {new Date(
                            event.start_time
                          ).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'America/Detroit'
                          })}
                        </p>

                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View event
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  ))}
                </section>

                <section className="content-card">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">
                        START EXPLORING
                      </span>
                      <h2>Featured buildings</h2>
                    </div>

                    <button
                      className="text-action"
                      onClick={() => navigate('Buildings')}
                    >
                      View all
                      <ArrowUpRight size={16} />
                    </button>
                  </div>

                  <div className="featured-grid">
                    {[1029,1047,1003,1028,1,1012,4,6].flatMap(id=>buildings.filter(b=>b.id===id && !!b.image_url)).map(building => (
                      <button
                        key={building.id}
                        className="featured-tile"
                        onClick={() =>
                          openBuilding(building.id)
                        }
                      >
                        <Thumb key={building.id} building={building}/>

                        <span>
                          <strong>{building.name}</strong>
                          <small>
                            {building.abbreviation}
                          </small>
                        </span>

                        <ChevronRight size={18} />
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="trust-line">
                <ShieldCheck size={18} />
                Information is sourced from public
                university pages. This is an independent
                student prototype, not an official MTU application.
              </div>
            </>
          ) : page === 'Buildings' ? (
            <>
              <div className="page-heading">
                <span className="eyebrow">
                  EXPLORE THE CAMPUS
                </span>

                <h1>Find your next destination.</h1>

                <p>
                  Upload a photo for an AI suggestion or
                  choose a building from the curated directory.
                </p>
              </div>

              <div className="explore-grid">
                <section className="content-card">
                  <h2>
                    <Camera size={23} />
                    Identify a building
                  </h2>

                  <p className="muted">
                    JPG, PNG or WebP · up to 8 MB
                  </p>

                  <label className="upload-zone">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={e =>
                        chooseFile(e.target.files?.[0])
                      }
                    />

                    {preview ? (
                      <img
                        src={preview}
                        alt="Uploaded building"
                      />
                    ) : (
                      <>
                        <Upload size={34} />
                        <strong>
                          Upload or take a photo
                        </strong>
                        <span>
                          AI will suggest a supported
                          campus building
                        </span>
                      </>
                    )}
                  </label>

                  <button
                    className="gold-btn wide"
                    disabled={!photo || loading}
                    onClick={analyze}
                  >
                    {loading
                      ? 'Analyzing photo…'
                      : 'Recognize building'}
                    <ArrowUpRight size={17} />
                  </button>

                  {prediction && (
                    <div className="prediction">
                      <strong>
                        {prediction.status === 'recognized'
                          ? 'AI building suggestion'
                          : 'Recognition uncertain'}
                      </strong>

                      <p>{prediction.message}</p>

                      {prediction.evidence && (
                        <p>
                          Visible evidence:
                          {' '}{prediction.evidence}
                        </p>
                      )}

                      {prediction.building_id && (
                        <>
                          <h3>
                            {buildings.find(
                              building =>
                                building.id ===
                                prediction.building_id
                            )?.name}
                          </h3>

                          <small>
                            Confidence:
                            {' '}{prediction.confidence}
                            {' '}· Provider:
                            {' '}{prediction.provider}
                          </small>

                          <button
                            className="gold-btn"
                            onClick={() =>
                              openBuilding(
                                prediction.building_id!
                              )
                            }
                          >
                            Confirm and explore
                            <ChevronRight size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </section>

                <section className="content-card">
                  <h2>
                    <Search size={23} />
                    Browse campus buildings
                  </h2>

                  <p className="muted">
                    Works without an AI key.
                  </p>

                  <div className="search-field">
                    <Search size={18} />

                    <input
                      value={query}
                      onChange={e =>
                        { setQuery(e.target.value); setExpandedCategories({}); }
                      }
                      placeholder="Search buildings, departments…"
                    />
                  </div>

                  <p className="muted">{filtered.length} locations found across {CAMPUS_CATEGORIES.length} categories.</p>
                  {CAMPUS_CATEGORIES.map(category => {
                    const locations = filtered.filter(building => building.category === category);
                    if (!locations.length) return null;
                    return (
                      <section className="campus-category" key={category} aria-label={category}>
                        <button className="campus-category-toggle" aria-expanded={expandedCategories[category] ?? Boolean(query.trim())} onClick={() => setExpandedCategories(current => ({...current, [category]: !(current[category] ?? Boolean(query.trim()))}))}>
                          <span>{category}</span><span className="category-count">{locations.length}</span><ChevronDown size={19} className={(expandedCategories[category] ?? Boolean(query.trim())) ? 'category-chevron expanded' : 'category-chevron'} />
                        </button>
                        {(expandedCategories[category] ?? Boolean(query.trim())) && <div className="building-results">
                          {locations.map(building => (
                            <button key={building.id} onClick={() => openBuilding(building.id)}>
                              <Thumb key={building.id} building={building}/>
                              <span><strong>{building.name}</strong><small>{building.abbreviation}{building.location_type === 'campus_location' ? ' · Campus location' : ''}</small></span>
                              <ChevronRight size={17} />
                            </button>
                          ))}
                        </div>}
                      </section>
                    );
                  })}
                  {!filtered.length && <p className="muted">No matching campus locations.</p>}
                </section>
              </div>
            </>
          ) : page === 'Saved Buildings' ? (
            <>
              <div className="page-heading"><span className="eyebrow">YOUR SPACE</span><h1>Saved Buildings</h1><p>Quickly return to your favorite campus locations.</p></div>
              <section className="content-card">
                <h2><Heart size={23} /> Saved Buildings ({favorites.length})</h2>
                {!favorites.length ? <div className="empty-record"><Heart size={20} /> No saved buildings yet. Open a building and select Save building.</div> :
                  !buildings.length ? <p className="muted">Building directory is not loaded yet.</p> :
                  <div className="saved-list">{buildings.filter(building => favorites.includes(building.id)).map(building => (
                    <div className="saved-row" key={building.id}>
                      <div className="building-results"><button onClick={() => openBuilding(building.id)}><Thumb key={building.id} building={building}/><span><strong>{building.name}</strong><small>{building.abbreviation}</small></span><ChevronRight size={17} /></button></div>
                      <button className="icon-btn saved-remove" aria-label={`Remove ${building.name} from saved buildings`} title="Remove saved building" onClick={() => toggleFavorite(building.id)}><Heart size={20} fill="currentColor" /></button>
                    </div>
                  ))}</div>}
                <button className="outline-btn" onClick={() => navigate('Buildings')}>Browse buildings <ChevronRight size={17} /></button>
              </section>
            </>
          ) : page === 'Dining & Cafés' ? (
            <section className="content-card"><DiningCards items={DINING} buildings={buildings} openBuilding={openBuilding}/></section>
          ) : page === 'Events' ? (
            <>
              <div className="page-heading">
                <span className="eyebrow">
                  CAMPUS LIFE
                </span>

                <h1>What's happening at MTU?</h1>

                <p>
                  Discover upcoming university events,
                  performances, and campus activities
                  from Michigan Tech's official calendar.
                </p>
              </div>

              <section className="content-card">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">
                      LIVE UNIVERSITY CALENDAR
                    </span>

                    <h2>Upcoming MTU events</h2>
                  </div>

                  <CalendarDays className="accent" />
                </div>

                <FilteredEvents
                  events={liveEvents}
                  status={eventsStatus}
                />

                <div className="resource-buttons">
                  <a
                    href={EVENT_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Full MTU calendar
                    <ArrowUpRight size={16} />
                  </a>

                  <a
                    href={ROZSA_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Rozsa performances
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </section>
            </>
          ) : (
            <CampusChat openBuilding={openBuilding}/>
          )}

          <footer className="footer">
            <span>
              © 2026 MTU CampusLens · Student prototype
            </span>

            <span>
              Not affiliated with or endorsed by
              Michigan Technological University.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
