from fastapi.testclient import TestClient
from app.main import app
from app.agents.skill_runtime import load_skill

client = TestClient(app)

def test_skills_list():
    response = client.get('/api/agents/skills')
    assert response.status_code == 200
    assert len(response.json()['skills']) == 3
    assert response.json()['executes_skill_scripts'] is False

def test_skill_path_restricted():
    import pytest
    with pytest.raises(ValueError):
        load_skill('../secrets')

def test_chat_agent_handoffs(monkeypatch):
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    result = client.post('/api/chat', json={'building_id': 3, 'question': 'Which rooms are listed?'})
    assert result.status_code == 200
    assert [x['agent'] for x in result.json()['agent_trace']] == ['campuslens-building-researcher','campuslens-assistant']
    assert result.json()['used_ai'] is False
