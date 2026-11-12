from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from .database import Base

class Building(Base):
    __tablename__ = "buildings"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), unique=True, nullable=False)
    abbreviation = Column(String(30), nullable=True)
    description = Column(Text, default="")
    location = Column(String(255), default="")
    source_url = Column(String(500), default="https://map.mtu.edu/")
    departments = relationship("Department", back_populates="building", cascade="all, delete-orphan")
    rooms = relationship("Room", back_populates="building", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="building", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=False)
    name = Column(String(180), nullable=False)
    details = Column(Text, default="")
    source_url = Column(String(500), default="")
    building = relationship("Building", back_populates="departments")

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=False)
    room_number = Column(String(40), nullable=False)
    room_type = Column(String(100), default="Unspecified")
    details = Column(Text, default="")
    source_url = Column(String(500), default="")
    building = relationship("Building", back_populates="rooms")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=False)
    title = Column(String(220), nullable=False)
    description = Column(Text, default="")
    starts_at = Column(DateTime, nullable=True)
    room_number = Column(String(40), default="")
    source_url = Column(String(500), default="https://events.mtu.edu/")
    is_demo = Column(Boolean, default=False)
    building = relationship("Building", back_populates="events")
