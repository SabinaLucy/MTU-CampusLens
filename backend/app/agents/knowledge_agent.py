"""Returns an explicit, bounded context built from stored, cited facts only."""
import json
from typing import Any


def grounded_context(building: dict[str, Any], metadata: dict[str, Any]) -> str:
    selected = {k: building.get(k) for k in (
        'name','abbreviation','address','description','campus_map_number','map_url',
        'departments','offices','rooms','events','classes','source')}
    return json.dumps({'building': selected,
        'data_quality': metadata['disclaimer'],
        'live_events': metadata['live_events'],
        'live_classes': metadata['live_classes']}, ensure_ascii=False)


def collect_sources(building: dict[str, Any]) -> list[dict[str, str]]:
    sources: dict[str, dict[str, str]] = {}
    for entry in [building]:
        if isinstance(entry, dict) and entry.get('source'):
            src = entry['source']; sources[src['url']] = src
    for name in ('departments', 'offices', 'rooms', 'events', 'classes'):
        for record in building.get(name, []):
            src = record.get('source')
            if src:
                sources[src['url']] = src
    return list(sources.values())
