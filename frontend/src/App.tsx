import { useEffect, useState } from 'react';
import { Camera, Search, MapPin, Building2, CalendarDays, DoorOpen, MessageCircle, Upload, Loader2, ExternalLink, ArrowRight, Info } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
type Building = {id:number; name:string; abbreviation:string; description:string; location:string; source_url:string};
type Detail = Building & {departments:any[]; rooms:any[]; events:any[]};
export default function App(){
  const [buildings,setBuildings]=useState<Building[]>([]);
  const [selected,setSelected]=useState<Detail|null>(null);
  const [tab,setTab]=useState('Overview');
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [question,setQuestion]=useState('');
  const [answer,setAnswer]=useState('');
  const [chatBusy,setChatBusy]=useState(false);
  const [search,setSearch]=useState('');
  useEffect(()=>{fetch(`${API}/api/buildings`).then(r=>r.json()).then(setBuildings).catch(()=>setNotice('Cannot reach backend. Start the FastAPI server on port 8000.'));},[]);
  async function loadBuilding(id:number){
    setBusy(true); setNotice('');
    try{const r=await fetch(`${API}/api/buildings/${id}`); if(!r.ok) throw new Error('Could not load building'); setSelected(await r.json()); setTab('Overview'); setAnswer('');}
    catch(e:any){setNotice(e.message)} finally{setBusy(false)}
  }
  function chooseFile(f?:File){if(!f)return; if(!f.type.startsWith('image/')){setNotice('Please choose an image file.');return;} setFile(f);setPreview(URL.createObjectURL(f));setNotice('');}
  async function recognize(){
    if(!file){setNotice('Take or upload a building photo first.');return}
    setBusy(true);setNotice('Analyzing image…');
    try{const fd=new FormData();fd.append('file',file);const r=await fetch(`${API}/api/recognize`,{method:'POST',body:fd});const data=await r.json();
      if(data.recognized && data.building){setNotice(`Suggested: ${data.building.name} (${Math.round(data.confidence*100)}% confidence). Confirm by opening the building below.`);await loadBuilding(data.building.id);}
      else setNotice(data.message || 'Could not identify the building. Please select it manually below.');
    }catch{setNotice('Recognition service unavailable. Select a building manually below.')}finally{setBusy(false)}
  }
  async function ask(){
    if(!selected||!question.trim())return;setChatBusy(true);setAnswer('');
    try{const r=await fetch(`${API}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({building_id:selected.id,question})});const d=await r.json();setAnswer(d.answer||d.detail||'No answer returned.');}
    catch{setAnswer('Could not contact the assistant. Check that the backend is running.')}finally{setChatBusy(false)}
  }
  const filtered=buildings.filter(b=>(b.name+' '+b.abbreviation).toLowerCase().includes(search.toLowerCase()));
  const tabs=['Overview','Departments','Events','Rooms','Ask CampusLens'];
  return <div className="app">
    <header><div className="brand"><div className="brandIcon"><Building2 size={22}/></div><div><strong>CampusLens</strong><small>MICHIGAN TECH CAMPUS GUIDE</small></div></div><span className="beta">STUDENT MVP</span></header>
    <main>
      <section className="hero"><div className="heroCopy"><div className="eyebrow">YOUR CAMPUS, UNDERSTOOD</div><h1>Discover what's<br/><em>inside the buildings.</em></h1><p>Take a photo of a Michigan Tech building to identify it and explore the information available in CampusLens.</p></div><div className="heroMark"><div className="orbit o1"></div><div className="orbit o2"></div><Building2 size={72}/><span>MTU</span></div></section>
      <section className="workspace">
        <div className="leftCol">
          <div className="sectionTitle"><span className="step">01</span><div><h2>Identify a building</h2><p>Upload a photo or use your camera.</p></div></div>
          <div className="uploadCard">
            <label className="dropzone">
              {preview?<img src={preview} className="preview" />:<div className="uploadPrompt"><div className="uploadIcon"><Camera size={25}/></div><b>Drop a building photo here</b><span>or browse files from your device</span><small>JPG, PNG or WEBP · max 10 MB</small></div>}
              <input type="file" accept="image/*" capture="environment" onChange={e=>chooseFile(e.target.files?.[0])}/>
            </label>
            <button className="primary full" onClick={recognize} disabled={busy||!file}>{busy?<Loader2 className="spin" size={17}/>:<Camera size={17}/>} {busy?'Working…':'Recognize building'} <ArrowRight size={16}/></button>
            {notice&&<div className="notice"><Info size={16}/><span>{notice}</span></div>}
          </div>
          <div className="sectionTitle buildingHeading"><span className="step">02</span><div><h2>Or choose a building</h2><p>Manual selection always works, even without an API key.</p></div></div>
          <div className="searchBox"><Search size={17}/><input placeholder="Search campus buildings…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <div className="buildingList">{filtered.map(b=><button key={b.id} className={`buildingOption ${selected?.id===b.id?'active':''}`} onClick={()=>loadBuilding(b.id)}><div className="buildingMini"><Building2 size={19}/></div><div><b>{b.name}</b><small>{b.abbreviation} · {b.location}</small></div><ArrowRight size={16}/></button>)}</div>
        </div>
        <div className="rightCol">
          <div className="sectionTitle"><span className="step">03</span><div><h2>Building information</h2><p>Explore the selected building.</p></div></div>
          {selected?<div className="detailCard">
            <div className="detailHero"><div className="detailTag">SELECTED BUILDING</div><h2>{selected.name}</h2><p><MapPin size={15}/> {selected.location}</p><a href={selected.source_url} target="_blank" rel="noreferrer">Official information <ExternalLink size={13}/></a></div>
            <nav className="tabs">{tabs.map(t=><button className={tab===t?'selected':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</nav>
            <div className="tabContent">
              {tab==='Overview'&&<><h3>About this building</h3><p>{selected.description}</p><div className="statGrid"><div><Building2/><b>{selected.departments?.length||0}</b><small>Departments listed</small></div><div><CalendarDays/><b>{selected.events?.length||0}</b><small>Events listed</small></div><div><DoorOpen/><b>{selected.rooms?.length||0}</b><small>Rooms listed</small></div></div><div className="caution">Information is limited to records currently loaded into this student prototype. Check official MTU sources for current details.</div></>}
              {tab==='Departments'&&<><h3>Departments & offices</h3>{selected.departments?.length?selected.departments.map((d:any)=><div className="dataRow" key={d.id}><b>{d.name}</b><p>{d.details}</p>{d.source_url&&<a href={d.source_url} target="_blank">Source <ExternalLink size={12}/></a>}</div>):<Empty text="No department records have been added yet."/>}</>}
              {tab==='Events'&&<><h3>Events</h3>{selected.events?.length?selected.events.map((e:any)=><div className="dataRow" key={e.id}><b>{e.title}</b><p>{e.description}</p><small>{e.starts_at?new Date(e.starts_at).toLocaleString():'Date not provided'} · {e.room_number||'Room not provided'}</small>{e.is_demo&&<span className="demoTag">DEMO RECORD</span>}<a href={e.source_url} target="_blank">Event source <ExternalLink size={12}/></a></div>):<Empty text="No verified events are loaded for this building. Check the MTU Events Calendar." link="https://events.mtu.edu/"/>}</>}
              {tab==='Rooms'&&<><h3>Rooms & classrooms</h3>{selected.rooms?.length?selected.rooms.map((r:any)=><div className="dataRow" key={r.id}><b>Room {r.room_number}</b><p>{r.room_type} {r.details}</p></div>):<Empty text="No verified room or classroom records are loaded yet." link="https://www.mtu.edu/registrar/"/>}</>}
              {tab==='Ask CampusLens'&&<><h3>Ask about this building</h3><p className="muted">Answers are grounded in the building records currently stored in CampusLens.</p><div className="chatInput"><input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()} placeholder="Ask a question about this building…"/><button className="primary" onClick={ask} disabled={chatBusy||!question.trim()}>{chatBusy?<Loader2 className="spin"/>:<ArrowRight/>}</button></div>{answer&&<div className="answer"><MessageCircle size={17}/><p>{answer}</p></div>}</>}
            </div>
          </div>:<div className="emptyState"><div className="emptyIllustration"><Building2 size={52}/></div><h3>Your campus discovery starts here</h3><p>Upload a photo or select a building to see its details, events, rooms, and ask questions.</p><div className="emptyHint"><Info size={15}/> Choose any of the five buildings to preview the dashboard.</div></div>}
        </div>
      </section>
      <section className="sources"><div><div className="eyebrow">TRUSTED CAMPUS SOURCES</div><h2>Information should come from MTU.</h2><p>Use official university resources to verify and maintain building information.</p></div><div className="sourceLinks"><a href="https://map.mtu.edu/" target="_blank">Campus Map <ExternalLink/></a><a href="https://events.mtu.edu/" target="_blank">Events Calendar <ExternalLink/></a><a href="https://www.mtu.edu/registrar/" target="_blank">Registrar <ExternalLink/></a><a href="https://www.mtu.edu/" target="_blank">MTU Website <ExternalLink/></a></div></section>
    </main>
    <footer><b>CampusLens</b><span>Independent student prototype · Not an official Michigan Tech application.</span><span>Built for learning and demonstration.</span></footer>
  </div>
}
function Empty({text,link}:{text:string;link?:string}){return <div className="emptyData"><Info size={18}/><p>{text} {link&&<a href={link} target="_blank">View official source <ExternalLink size={12}/></a>}</p></div>}
