CREATE DATABASE IF NOT EXISTS campuslens;
USE campuslens;
-- SQLAlchemy creates the tables automatically when the API starts.
-- This file documents the intended relational tables:
-- buildings(id, name, abbreviation, description, location, source_url)
-- departments(id, building_id, name, details, source_url)
-- rooms(id, building_id, room_number, room_type, details, source_url)
-- events(id, building_id, title, description, starts_at, room_number, source_url, is_demo)
