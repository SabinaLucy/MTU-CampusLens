import os, json, base64
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from dotenv import load_dotenv
from openai import OpenAI
from .database import Base, engine, get_db
from .models import Building, Department, Room, Event
from .schemas import BuildingOut, DepartmentOut, RoomOut, EventOut
from .seed import seed_buildings

load_dotenv()
Base.metadata.create_all(bind=engine)
app = FastAPI(title="MTU CampusLens API", version="1.0.0")
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    from .database import SessionLocal
    db = SessionLocal()
    try:
        seed_buildings(db)
    finally:
        db.close()

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MTU CampusLens API"}

@app.get("/api/buildings", response_model=list[BuildingOut])
def list_buildings(db: Session = Depends(get_db)):
    return db.scalars(select(Building).order_by(Building.name)).all()

@app.get("/api/buildings/{building_id}")
def get_building(building_id: int, db: Session = Depends(get_db)):
    b = db.get(Building, building_id)
    if not b:
        raise HTTPException(404, "Building not found")
    return {
        "id": b.id, "name": b.name, "abbreviation": b.abbreviation,
        "description": b.description, "location": b.location, "source_url": b.source_url,
        "departments": b.departments, "rooms": b.rooms, "events": b.events
    }

@app.get("/api/buildings/{building_id}/events", response_model=list[EventOut])
def building_events(building_id: int, db: Session = Depends(get_db)):
    if not db.get(Building, building_id):
        raise HTTPException(404, "Building not found")
    return db.scalars(select(Event).where(Event.building_id == building_id).order_by(Event.starts_at)).all()

@app.get("/api/buildings/{building_id}/departments", response_model=list[DepartmentOut])
def building_departments(building_id: int, db: Session = Depends(get_db)):
    if not db.get(Building, building_id):
        raise HTTPException(404, "Building not found")
    return db.scalars(select(Department).where(Department.building_id == building_id)).all()

@app.get("/api/buildings/{building_id}/classes", response_model=list[RoomOut])
def building_classes(building_id: int, db: Session = Depends(get_db)):
    if not db.get(Building, building_id):
        raise HTTPException(404, "Building not found")
    return db.scalars(select(Room).where(Room.building_id == building_id)).all()

@app.post("/api/recognize")
async def recognize(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Please upload an image file.")
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image must be 10 MB or smaller.")
    buildings = db.scalars(select(Building).order_by(Building.name)).all()
    names = [b.name for b in buildings]
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"recognized": False, "needs_manual_selection": True, "message": "OpenAI API key is not configured. Choose a building manually.", "candidates": names}
    try:
        client = OpenAI(api_key=api_key)
        encoded = base64.b64encode(raw).decode("utf-8")
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            input=[{"role": "user", "content": [
                {"type": "input_text", "text": "Identify whether this photograph shows one of these Michigan Tech buildings: " + ", ".join(names) + ". Return JSON only with keys building_name (exact listed name or null), confidence (0 to 1), and reasoning (short). Do not guess if uncertain."},
                {"type": "input_image", "image_url": f"data:{file.content_type};base64,{encoded}"}
            ]}]
        )
        text_out = response.output_text.strip()
        # Be tolerant of JSON fenced output.
        text_out = text_out.replace("```json", "").replace("```", "").strip()
        result = json.loads(text_out)
        match = next((b for b in buildings if b.name == result.get("building_name")), None)
        confidence = float(result.get("confidence", 0))
        if not match or confidence < 0.45:
            return {"recognized": False, "needs_manual_selection": True, "message": result.get("reasoning", "The image could not be identified confidently."), "candidates": names, "confidence": confidence}
        return {"recognized": True, "building": {"id": match.id, "name": match.name, "abbreviation": match.abbreviation}, "confidence": confidence, "reasoning": result.get("reasoning", "")}
    except Exception as exc:
        return {"recognized": False, "needs_manual_selection": True, "message": f"Recognition could not be completed: {str(exc)}", "candidates": names}

@app.post("/api/chat")
async def chat(payload: dict, db: Session = Depends(get_db)):
    building_id = payload.get("building_id")
    question = str(payload.get("question", "")).strip()
    if not question:
        raise HTTPException(400, "Please enter a question.")
    building = db.get(Building, int(building_id)) if building_id else None
    if not building:
        raise HTTPException(404, "Select a building before asking a question.")
    departments = db.scalars(select(Department).where(Department.building_id == building.id)).all()
    rooms = db.scalars(select(Room).where(Room.building_id == building.id)).all()
    events = db.scalars(select(Event).where(Event.building_id == building.id)).all()
    facts = {
        "building": {"name": building.name, "description": building.description, "location": building.location, "source": building.source_url},
        "departments": [{"name": x.name, "details": x.details, "source": x.source_url} for x in departments],
        "rooms": [{"room_number": x.room_number, "type": x.room_type, "details": x.details, "source": x.source_url} for x in rooms],
        "events": [{"title": x.title, "description": x.description, "starts_at": x.starts_at.isoformat() if x.starts_at else None, "room": x.room_number, "source": x.source_url, "demo": x.is_demo} for x in events]
    }
    if not os.getenv("OPENAI_API_KEY"):
        return {"answer": "The AI assistant is not configured because OPENAI_API_KEY is missing. Available database information: " + json.dumps(facts, ensure_ascii=False), "grounded": True}
    try:
        client = OpenAI()
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            input=[
                {"role": "system", "content": "Answer only from the supplied database facts. Do not invent rooms, departments, events, schedules, or opening hours. If the information is absent, say it is not currently available in CampusLens and suggest checking the official source URL. Clearly identify demo records."},
                {"role": "user", "content": f"Database facts:\n{json.dumps(facts, ensure_ascii=False)}\n\nQuestion: {question}"}
            ]
        )
        return {"answer": response.output_text, "grounded": True}
    except Exception as exc:
        raise HTTPException(502, f"AI assistant error: {str(exc)}")
