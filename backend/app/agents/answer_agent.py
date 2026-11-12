"""Safe deterministic fallback that works without any external AI key."""
from typing import Any


def fallback_answer(question: str, building: dict[str, Any]) -> str:
    q = question.casefold()
    def names(field: str) -> str:
        items = building.get(field, [])
        return ', '.join(x['name'] for x in items) if items else 'No verified records are loaded.'

    if any(word in q for word in ('event','happening','scheduled','today','tomorrow')):
        events = building.get('events', [])
        return ('No verified upcoming events are loaded for this building. This is a curated snapshot, '
                'not a live event calendar. Check the official MTU Events Calendar for current information.') if not events else (
                 'The stored event records are: ' + '; '.join(f"{e['title']} ({e['starts_at']}; {e.get('record_status','unverified')})" for e in events) + '. Please verify dates with the linked source.')
    if any(word in q for word in ('class','course','schedule','timetable')):
        return ('No verified class schedules are loaded for this building. Check the MTU Registrar for current scheduling.'
                if not building.get('classes') else 'Stored course records: ' + '; '.join(
                f"{c['course_code']} — {c['course_title']} ({c['schedule_text']})" for c in building['classes']))
    if any(word in q for word in ('department','major','academic')):
        return f"Verified departments associated with {building['name']}: {names('departments')}"
    if any(word in q for word in ('office','service','facility','facilities')):
        return f"Recorded offices and services in {building['name']}: {names('offices')}"
    if any(word in q for word in ('room','classroom','lecture','lab')):
        rooms = building.get('rooms', [])
        if not rooms:
            return 'No verified room listings are loaded for this building.'
        return 'Verified room listings: ' + '; '.join(f"{r['room_number']} ({r['room_type']})" for r in rooms) + '. These are not class assignments.'
    if any(word in q for word in ('where','location','located','address','map','navigate','direction')):
        return f"{building['name']} is on Michigan Tech’s campus in Houghton, Michigan. Campus map building number: {building['campus_map_number']}. See {building['map_url']} for the precise location."
    if any(word in q for word in ('what is','tell me','about','describe','overview','building')):
        return building['description']
    return (f"I don't have enough verified information to answer that question about {building['name']}. "
            'Try asking about departments, rooms, location, events, or classes.')
