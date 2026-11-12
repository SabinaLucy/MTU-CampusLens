from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class BuildingOut(BaseModel):
    id: int
    name: str
    abbreviation: Optional[str] = None
    description: str = ""
    location: str = ""
    source_url: str = ""
    class Config:
        from_attributes = True

class DepartmentOut(BaseModel):
    id: int
    name: str
    details: str = ""
    source_url: str = ""
    class Config:
        from_attributes = True

class RoomOut(BaseModel):
    id: int
    room_number: str
    room_type: str = ""
    details: str = ""
    source_url: str = ""
    class Config:
        from_attributes = True

class EventOut(BaseModel):
    id: int
    title: str
    description: str = ""
    starts_at: Optional[datetime] = None
    room_number: str = ""
    source_url: str = ""
    is_demo: bool = False
    class Config:
        from_attributes = True
