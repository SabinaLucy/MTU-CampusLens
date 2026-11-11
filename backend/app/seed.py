from .models import Building

BUILDINGS = [
    ("Rekhi Hall", "Rekhi", "Michigan Tech campus building. Confirm current building details, occupants, and room information through official university resources.", "Houghton, Michigan", "https://map.mtu.edu/"),
    ("R. L. Smith Building", "MEEM", "Michigan Tech's R. L. Smith building, commonly known as MEEM. Confirm current departments, facilities, and room information through official university resources.", "Houghton, Michigan", "https://map.mtu.edu/"),
    ("Fisher Hall", "Fisher", "Michigan Tech campus residence hall. Confirm current services and room information through official university resources.", "Houghton, Michigan", "https://map.mtu.edu/"),
    ("Memorial Union Building", "MUB", "Michigan Tech's Memorial Union Building. Confirm current services, offices, and event locations through official university resources.", "Houghton, Michigan", "https://map.mtu.edu/"),
    ("Van Pelt and Opie Library", "Library", "Michigan Tech's Van Pelt and Opie Library. Confirm current services, spaces, and room information through official university resources.", "Houghton, Michigan", "https://www.mtu.edu/library/")
]

def seed_buildings(db):
    if db.query(Building).count() == 0:
        for name, abbr, desc, location, url in BUILDINGS:
            db.add(Building(name=name, abbreviation=abbr, description=desc, location=location, source_url=url))
        db.commit()
