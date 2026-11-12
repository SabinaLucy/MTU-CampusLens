"""One-time contributor utility: recreate the initial, explicitly non-live data snapshot."""
import json
from pathlib import Path

CHECKED = '2026-11-11T12:00:00-05:00'
def source(title, url):
    return {'title': title, 'url': url, 'checked_at': CHECKED, 'source_type': 'official_mtu'}

campus_map = source('Michigan Tech campus map (September 2025)', 'https://www.mtu.edu/maps/campus-map.pdf')
room_directory = source('Michigan Tech IT — Classroom directory', 'https://www.mtu.edu/it/services/learning-technology/classrooms/')
lib_directory = source('Van Pelt and Opie Library — Floor directory', 'https://www.mtu.edu/library/about/map/')
lib_site = source('Van Pelt and Opie Library', 'https://www.mtu.edu/library/')
mub_site = source('Michigan Tech Memorial Union', 'https://www.mtu.edu/memorialunion/')
def item(i, name, src, **kwargs):
    return {'id': i, 'name': name, 'source': src, **kwargs}
def room(i, number, typ, src, notes=''):
    return {'id': i, 'room_number': number, 'room_type': typ, 'notes': notes, 'source': src}
def b(i, name, abbr, aliases, desc, number, *, departments=None, offices=None, rooms=None, src=campus_map):
    return {'id': i, 'name': name, 'abbreviation': abbr, 'aliases': aliases,
      'description': desc,
      'address': 'Michigan Technological University, Houghton, MI 49931, USA',
      'campus_map_number': number, 'map_url': 'https://map.mtu.edu/',
      'source': src, 'departments': departments or [], 'offices': offices or [],
      'rooms': rooms or [], 'events': [], 'classes': [], 'reference_images': []}

buildings = [
 b(1, 'Kanwal and Ann Rekhi Hall', 'Rekhi', ['Rekhi Hall', 'College of Computing', 'Kanwal & Ann Rekhi Hall'],
   'Campus building identified on the official MTU map with the College of Computing, Applied Computing, and Computer Science.', 28,
   departments=[item(101,'Applied Computing',campus_map),item(102,'Computer Science',campus_map)],
   offices=[item(103,'College of Computing',campus_map,room_number=None)]),
 b(2,'R. L. Smith Building','MEEM',['R.L. Smith Building','MEEM Building','Mechanical Engineering Building'],
   'Academic building associated with Mechanical and Aerospace Engineering.',20,
   departments=[item(201,'Mechanical and Aerospace Engineering',campus_map)],
   rooms=[room(210,'111','Classroom',room_directory,'100 seats listed in the official classroom directory.'),
          room(211,'112','Classroom',room_directory,'104 seats listed in the official classroom directory.')]),
 b(3,'Fisher Hall','Fisher',['Fisher','Fisher Hall Building'],
   'Academic building for Physics and Mathematical Sciences with classrooms and teaching facilities.',15,
   departments=[item(301,'Physics',campus_map),item(302,'Mathematical Sciences',campus_map)],
   rooms=[room(310,'135','Lecture hall',room_directory,'476 seats listed in the official classroom directory.'),
          room(311,'139','Lecture hall',room_directory,'125 seats listed in the official classroom directory.')]),
 b(4,'Memorial Union Building','MUB',['Memorial Union','MUB','Memorial Union Building'],
   'Student-services building listed on the MTU campus map; includes the Campus Store and McAllister Welcome Center.',34,
   offices=[item(401,'Campus Store',campus_map,room_number=None),
            item(402,'McAllister Welcome Center',campus_map,room_number=None)],src=campus_map),
 b(5,'J. Robert Van Pelt and John and Ruanne Opie Library','Library',
   ['Van Pelt and Opie Library','Van Pelt Library','Opie Library','MTU Library'],
   'Campus library providing collections, study spaces, research assistance, and learning support.',17,
   offices=[item(501,'University Archives and Historical Collections',lib_directory,room_number=None),
            item(502,'Jackson Center for Teaching and Learning',lib_directory,room_number=None)],
   rooms=[room(510,'242','Library instruction room',lib_directory,'Second floor; no current class assignment asserted.'),
          room(511,'244','Library instruction room',lib_directory,'Second floor; no current class assignment asserted.')],src=lib_site)
]

payload = {'metadata': {'dataset': 'CampusLens curated MTU snapshot',
   'last_verified_at': CHECKED,
   'live_events': False, 'live_classes': False,
   'disclaimer': 'This student-built snapshot is not a live MTU feed. Empty event and class lists mean no verified records are loaded, not that nothing is scheduled.'},
   'buildings': buildings}
out = Path(__file__).with_name('buildings.json')
out.write_text(json.dumps(payload, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
print(f'Wrote {out} ({len(buildings)} buildings)')
