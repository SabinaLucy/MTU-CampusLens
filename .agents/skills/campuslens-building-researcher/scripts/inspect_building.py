"""Inspect verified JSON data without calling Gemini or mutating the app."""
import argparse
import json
from common import read_snapshot, find_building


def format_records(label, records, fields):
    if not records:
        return f'{label}: No verified records are loaded.'
    values = []
    for item in records:
        rendered = ' | '.join(str(item[f]) for f in fields if item.get(f))
        values.append(rendered or '(no public detail)')
    return f'{label}: ' + '; '.join(values)


def describe(b, question=None):
    lines = [f"{b['name']} ({b.get('abbreviation','')})", f"Description: {b.get('description','not documented')}", f"Location: {b.get('address','not documented')}"]
    keys = ('departments', 'offices', 'rooms', 'events', 'classes')
    query = (question or '').lower()
    if not query:
        chosen = keys
    elif 'department' in query:
        chosen = ('departments',)
    elif 'office' in query:
        chosen = ('offices',)
    elif 'room' in query or 'classroom' in query:
        chosen = ('rooms',)
    elif 'event' in query:
        chosen = ('events',)
    elif 'class' in query or 'schedule' in query:
        chosen = ('classes',)
    elif any(x in query for x in ('where', 'map', 'location')):
        chosen = ()
    else:
        chosen = keys
    for k in chosen:
        lines.append(format_records(k.capitalize(), b.get(k, []), ('name', 'title', 'room_number', 'start_at', 'location')))
    source = b.get('source') or {}
    if source.get('url'):
        lines.append('Source: ' + source['url'])
    return '\n'.join(lines)


def main():
    p = argparse.ArgumentParser(description='Inspect CampusLens building facts without calling AI')
    p.add_argument('--data', help='Optional path to buildings.json')
    p.add_argument('--list', action='store_true', help='List the supported buildings')
    p.add_argument('--building', help='Building name, alias, abbreviation, or numeric ID')
    p.add_argument('--question', help='Optional local question about a selected building')
    p.add_argument('--json', action='store_true', help='Print building record as JSON')
    args = p.parse_args()
    data = read_snapshot(args.data)
    if args.list:
        for b in data['buildings']:
            print(f"{b['id']}: {b['name']} ({b.get('abbreviation','')})")
        return
    if not args.building:
        p.error('Pass --building NAME or --list')
    b = find_building(data, args.building)
    if not b:
        p.error('This building is not in the current snapshot. Use --list to see available buildings.')
    print(json.dumps(b, indent=2, ensure_ascii=False) if args.json else describe(b, args.question))
    if not args.json:
        meta = data.get('metadata', {})
        print('Snapshot last verified:', meta.get('last_verified_at', 'not specified'))
        print('Events/classes are not live; an empty list is not evidence of no activities.')

if __name__ == '__main__':
    main()
