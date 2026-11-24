import asyncio
from app.agents import campus_chat, providers

def test_location_and_coffee_reach_model(monkeypatch):
    async def fake(prompt, **kwargs):
        assert '"location": "EERC"' in prompt
        assert 'coffee nearby' in prompt
        return '☕ Try a café.', 'mock'
    monkeypatch.setattr(campus_chat,'generate',fake)
    result=asyncio.run(campus_chat.answer_campus('coffee nearby',[{'role':'user','text':"I'm at EERC"}],None,None,'image/jpeg','',[{'id':1,'name':'EERC','abbreviation':'EERC','aliases':[]}],{}))
    assert result['answer']=='☕ Try a café.'

def test_open_recognition(monkeypatch):
    async def fake(*args,**kwargs):
        return '{"kind":"other","identification":"A cup","confidence":"high","building_id":null}', 'mock'
    monkeypatch.setattr(providers,'generate',fake)
    result=asyncio.run(providers.recognize(b'photo','image/jpeg',[]))
    assert result['status']=='identified'
    assert result['building_id'] is None
