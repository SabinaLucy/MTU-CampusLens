"""Shared, stdlib-only helpers for CampusLens repository-local Agent Skill."""
import json
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = SKILL_DIR.parents[2]  # .agents/skills/<skill> -> repository root
DEFAULT_DATA = REPO_ROOT / 'backend' / 'app' / 'data' / 'buildings.json'


def read_snapshot(path=None):
    target = Path(path) if path else DEFAULT_DATA
    if not target.is_file():
        raise FileNotFoundError(f'Cannot find snapshot: {target}. Run from extracted CampusLens repo root or pass --data.')
    return json.loads(target.read_text(encoding='utf-8'))


def find_building(snapshot, search):
    needle = str(search).strip().casefold()
    if not needle:
        return None
    for b in snapshot.get('buildings', []):
        fields = [str(b.get('id', '')), b.get('name', ''), b.get('abbreviation', '')] + b.get('aliases', [])
        if needle in [str(v).casefold() for v in fields if v is not None]:
            return b
    return None
