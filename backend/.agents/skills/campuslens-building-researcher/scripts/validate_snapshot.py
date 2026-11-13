"""Offline schema and official-source metadata checks. No live website verification."""
import argparse
from datetime import datetime
from urllib.parse import urlparse
from common import read_snapshot

RECORD_TYPES = ('departments', 'offices', 'rooms', 'events', 'classes')


def valid_iso(value):
    if not isinstance(value, str):
        return False
    try:
        timestamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return timestamp.tzinfo is not None
    except ValueError:
        return False


def official_url(url):
    if not isinstance(url, str):
        return False
    parsed = urlparse(url)
    host = parsed.hostname or ''
    return parsed.scheme == 'https' and (host == 'mtu.edu' or host.endswith('.mtu.edu'))


def validate(data):
    errors = []
    if not isinstance(data, dict):
        return ['Expected a JSON object at the root']
    meta = data.get('metadata')
    if not isinstance(meta, dict):
        errors.append('metadata: expected object')
        meta = {}
    if not valid_iso(meta.get('last_verified_at')):
        errors.append('metadata.last_verified_at: expected ISO-8601 timestamp with timezone')
    for flag in ('live_events', 'live_classes'):
        if meta.get(flag) is not False:
            errors.append(f'metadata.{flag}: must remain false without a live data integration')
    buildings = data.get('buildings')
    if not isinstance(buildings, list) or not buildings:
        return errors + ['buildings: expected nonempty list']
    ids = set()
    for bi,b in enumerate(buildings):
        where = f'buildings[{bi}]'
        if not isinstance(b,dict):
            errors.append(f'{where}: expected object')
            continue
        bid = b.get('id')
        if not isinstance(bid,int) or isinstance(bid,bool) or bid < 1:
            errors.append(f'{where}.id: positive integer required')
        elif bid in ids:
            errors.append(f'{where}.id: duplicate {bid}')
        ids.add(bid)
        if not isinstance(b.get('name'), str) or not b['name'].strip():
            errors.append(f'{where}.name: required')
        for attr in ('description','address','abbreviation'):
            if not isinstance(b.get(attr),str) or not b[attr].strip():
                errors.append(f'{where}.{attr}: required')
        def check_source(src,loc):
            if not isinstance(src,dict):
                errors.append(f'{loc}.source: required object')
                return
            if not official_url(src.get('url')):
                errors.append(f'{loc}.source.url: expected official HTTPS *.mtu.edu URL')
            if not valid_iso(src.get('checked_at')):
                errors.append(f'{loc}.source.checked_at: expected ISO-8601 timestamp with timezone')
            if src.get('source_type') != 'official_mtu':
                errors.append(f'{loc}.source.source_type: expected official_mtu')
            if not isinstance(src.get('title'),str) or not src['title'].strip():
                errors.append(f'{loc}.source.title: required')
        check_source(b.get('source'),where)
        if not official_url(b.get('map_url')):
            errors.append(f'{where}.map_url: expected official MTU map URL')
        for section in RECORD_TYPES:
            records=b.get(section)
            if not isinstance(records,list):
                errors.append(f'{where}.{section}: expected list')
                continue
            seen=set()
            for ri,record in enumerate(records):
                pos=f'{where}.{section}[{ri}]'
                if not isinstance(record,dict):
                    errors.append(f'{pos}: expected object')
                    continue
                rid=record.get('id')
                if rid is None or isinstance(rid,bool) or not isinstance(rid,int):
                    errors.append(f'{pos}.id: integer required')
                elif rid in seen:
                    errors.append(f'{pos}.id: duplicate within section {rid}')
                seen.add(rid)
                if record.get('draft_status'):
                    errors.append(f'{pos}: unverified draft is present in production snapshot')
                check_source(record.get('source'),pos)
                if section == 'events':
                    if not valid_iso(record.get('start_at')):
                        errors.append(f'{pos}.start_at: required timezone-aware published date/time')
                    if not isinstance(record.get('title'), str) or not record['title'].strip():
                        errors.append(f'{pos}.title: required')
        if not isinstance(b.get('reference_images'),list):
            errors.append(f'{where}.reference_images: expected list')
    return errors


def main():
    p=argparse.ArgumentParser(description='Validate CampusLens JSON structure and source metadata')
    p.add_argument('--data', help='Path to buildings.json (defaults to repo copy)')
    args=p.parse_args()
    try:
        data=read_snapshot(args.data)
        errors=validate(data)
    except (OSError,ValueError) as e:
        p.exit(2,f'Cannot validate snapshot: {e}\n')
    if errors:
        for e in errors:
            print('ERROR:',e)
        p.exit(1,f'{len(errors)} validation issue(s) found. No files were changed.\n')
    print(f"PASS: {len(data['buildings'])} building(s) validated (schema/source metadata only).")
    print('NOTE: This does not verify that official webpages currently contain the asserted facts.')

if __name__=='__main__':
    main()
