"""Safe, explicit runtime skill registry. SKILL.md is policy text, never executable code.

Only audited Python functions can be called. No shell, arbitrary imports, or file writes.
"""
from dataclasses import dataclass
from pathlib import Path
import re

SKILLS_ROOT = Path(__file__).resolve().parents[2] / '.agents' / 'skills'

@dataclass(frozen=True)
class Skill:
    name: str
    description: str
    instructions: str


def load_skill(name: str) -> Skill:
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name):
        raise ValueError('Invalid skill name')
    # Allowlist prevents reading arbitrary markdown files from user input.
    if name not in {'campuslens-building-researcher', 'campuslens-vision', 'campuslens-assistant'}:
        raise ValueError('Unknown skill')
    path = SKILLS_ROOT / name / 'SKILL.md'
    content = path.read_text(encoding='utf-8')
    if not content.startswith('---\n'):
        raise ValueError('Skill must include YAML-style frontmatter')
    header, body = content[4:].split('\n---\n', 1)
    fields = dict(line.split(':', 1) for line in header.splitlines() if ':' in line)
    if fields.get('name', '').strip() != name:
        raise ValueError('Skill name does not match directory')
    return Skill(name=name, description=fields.get('description', '').strip(), instructions=body.strip())


def list_skills() -> list[dict[str, str]]:
    return [{'name': s.name, 'description': s.description} for s in
            (load_skill(name) for name in ('campuslens-vision', 'campuslens-building-researcher', 'campuslens-assistant'))]
