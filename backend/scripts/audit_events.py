import asyncio,json
from pathlib import Path
from app.services.live_events import get_live_events, matching_building
async def main():
 d=json.loads(Path('app/data/buildings.json').read_text())
 result=await get_live_events()
 assert result['status']!='unavailable', 'Official calendar unavailable'
 events=result['events']
 report=[]
 for b in d['buildings']:
  matches=[e for e in events if matching_building(e['location'],b['abbreviation'],b['name'],b.get('aliases',[]))]
  report.append({'building':b['name'],'count':len(matches),'locations':sorted(set(e['location'] for e in matches))})
 print(json.dumps({'total':len(events),'buildings':report,'unmatched_locations':sorted(set(e['location'] for e in events if not any(matching_building(e['location'],b['abbreviation'],b['name'],b.get('aliases',[])) for b in d['buildings'])))},indent=2))
asyncio.run(main())
