
"""Read upcoming public events from Michigan Tech's official iCalendar feed."""

import asyncio
import logging
import time
from datetime import date, datetime, time as dt_time, timedelta
from zoneinfo import ZoneInfo

import httpx
from icalendar import Calendar

logger = logging.getLogger(__name__)

FEED_URL = "https://events.mtu.edu/calendar.ics"
TIMEZONE = ZoneInfo("America/Detroit")
CACHE_SECONDS = 900

_cache = {"expires": 0.0, "events": []}


def to_datetime(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=TIMEZONE)
        return value.astimezone(TIMEZONE)
    if isinstance(value, date):
        return datetime.combine(value, dt_time.min, TIMEZONE)
    return None


def matching_building(location, abbreviation):
    location = location.lower()
    names = {
        "Rozsa": ["rozsa"],
        "Rekhi": ["rekhi"],
        "MEEM": ["r. l. smith", "meem"],
        "Fisher": ["fisher hall"],
        "MUB": ["memorial union", "mub"],
        "Library": ["van pelt", "opie library"],
    }
    return any(
        name in location for name in names.get(abbreviation, [])
    )


def parse_calendar(raw):
    calendar = Calendar.from_ical(raw)
    now = datetime.now(TIMEZONE)
    cutoff = now + timedelta(days=90)
    results = []

    for component in calendar.walk("VEVENT"):
        start = component.get("DTSTART")
        if not start:
            continue

        start_at = to_datetime(start.dt)
        if start_at is None or not (now <= start_at <= cutoff):
            continue

        title = str(component.get("SUMMARY", "")).strip()
        location = str(component.get("LOCATION", "")).strip()
        url = str(component.get("URL", "")).strip()

        if not title:
            continue

        # Only expose links from the official event calendar.
        if not url.startswith("https://events.mtu.edu/"):
            url = FEED_URL

        results.append({
            "title": title,
            "location": location or "Location not specified",
            "start_time": start_at.isoformat(),
            "url": url,
            "source": "Michigan Tech Events Calendar",
        })

    results.sort(key=lambda event: event["start_time"])

    # Deduplicate repeated calendar entries.
    unique = {}
    for event in results:
        key = (event["title"], event["start_time"], event["location"])
        unique[key] = event

    return list(unique.values())


async def get_live_events():
    if time.monotonic() < _cache["expires"]:
        return {"events": _cache["events"], "status": "live"}

    try:
        async with httpx.AsyncClient(
            timeout=20.0, follow_redirects=True
        ) as client:
            response = await client.get(
                FEED_URL,
                headers={"User-Agent": "MTU-CampusLens-Student-Project/1.0"},
            )
            response.raise_for_status()

        events = await asyncio.to_thread(
            parse_calendar, response.content
        )

        _cache["events"] = events
        _cache["expires"] = time.monotonic() + CACHE_SECONDS

        return {"events": events, "status": "live"}

    except Exception:
        logger.exception("Could not retrieve the MTU calendar")

        if _cache["events"]:
            return {"events": _cache["events"], "status": "cached"}

        return {"events": [], "status": "unavailable"}
