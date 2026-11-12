"""Offline API smoke tests; no paid credentials or network needed."""
import io
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def jpeg() -> bytes:
    out = io.BytesIO()
    Image.new('RGB', (32, 32), 'blue').save(out, 'JPEG')
    return out.getvalue()


def test_health_and_five_buildings():
    health = client.get('/api/health')
    assert health.status_code == 200
    assert health.json()['storage'] == 'json'
    assert health.json()['buildings_count'] == 5
    buildings = client.get('/api/buildings').json()
    assert len(buildings) == 5
    assert all(b['source']['url'].startswith('https://www.mtu.edu/') for b in buildings)


def test_building_data_and_missing_ids():
    b = client.get('/api/buildings/3')
    assert b.status_code == 200
    assert b.json()['name'] == 'Fisher Hall'
    assert any(r['room_number'] == '135' for r in b.json()['rooms'])
    assert client.get('/api/buildings/3/events').json() == []
    assert client.get('/api/buildings/3/classes').json() == []
    assert client.get('/api/buildings/3/departments').status_code == 200
    assert client.get('/api/buildings/999').status_code == 404
    assert client.get('/api/buildings/999/events').status_code == 404


def test_local_chat(monkeypatch):
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    response = client.post('/api/chat', json={'building_id': 3, 'question': 'Which rooms are here?'})
    assert response.status_code == 200
    assert response.json()['provider'] == 'local'
    assert '135' in response.json()['answer']
    assert response.json()['sources']
    noevents = client.post('/api/chat', json={'building_id': 1, 'question': 'Any events tomorrow?'})
    assert 'No verified upcoming events' in noevents.json()['answer']
    assert client.post('/api/chat', json={'building_id': 999, 'question':'Where?'}).status_code == 404
    assert client.post('/api/chat', json={'building_id': 1, 'question':'x'}).status_code == 422


def test_image_errors_and_no_key_fallback(monkeypatch):
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    missing = client.post('/api/recognize', files={'file':('wrong.jpg',b'not a photo','image/jpeg')})
    assert missing.status_code == 415
    huge = client.post('/api/recognize', files={'file':('large.jpg',b'1' * (8 * 1024 * 1024 + 1),'image/jpeg')})
    assert huge.status_code == 413
    response = client.post('/api/recognize', files={'file':('photo.jpg',jpeg(),'image/jpeg')})
    assert response.status_code == 200
    assert response.json()['status'] == 'unavailable'
    assert response.json()['building_id'] is None
