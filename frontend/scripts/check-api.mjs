const base = process.argv[2];
if (!base) throw new Error('Pass the frontend branch URL');
const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? {'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET} : {};
for (const route of ['health','buildings','events']) {
  const response = await fetch(new URL('/api/'+route,base),{headers});
  if (!response.ok) throw new Error(route+': '+response.status+' '+await response.text());
  const data = await response.json();
  if (route==='health' && (data.status!=='ok'||data.buildings_count!==76)) throw new Error('Unexpected health: '+JSON.stringify(data));
  if (route==='buildings' && (!Array.isArray(data)||data.length!==76)) throw new Error('Expected 76 buildings');
  if (route==='events' && !Array.isArray(data.events)) throw new Error('Invalid events response');
  console.log(route, 'OK', route==='events'?data.status:'');
}
