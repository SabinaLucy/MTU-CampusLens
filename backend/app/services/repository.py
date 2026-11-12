"""Read-only repository: the only module aware of JSON storage.

Future student teams may replace this class with a SQL implementation while
preserving API routes and agent interfaces.
"""
import json
from pathlib import Path
from typing import Any

DATA_FILE = Path(__file__).resolve().parents[1] / 'data' / 'buildings.json'


class BuildingRepository:
    def __init__(self, path: Path = DATA_FILE):
        self.path = Path(path)

    def _load(self) -> dict[str, Any]:
        data = json.loads(self.path.read_text(encoding='utf-8'))
        if not isinstance(data, dict) or not isinstance(data.get('buildings'), list):
            raise ValueError('Invalid buildings.json: expected object with buildings list')
        return data

    def metadata(self) -> dict[str, Any]:
        return self._load()['metadata']

    def list_buildings(self) -> list[dict[str, Any]]:
        return [self._summary(building) for building in self._load()['buildings']]

    def get(self, building_id: int) -> dict[str, Any] | None:
        return next((b for b in self._load()['buildings'] if b['id'] == building_id), None)

    def all(self) -> list[dict[str, Any]]:
        return self._load()['buildings']

    @staticmethod
    def _summary(b: dict[str, Any]) -> dict[str, Any]:
        return {key: b[key] for key in ('id', 'name', 'abbreviation', 'description', 'address', 'campus_map_number', 'map_url', 'source')}

    def summary(self, b: dict[str, Any]) -> dict[str, Any]:
        return self._summary(b)
