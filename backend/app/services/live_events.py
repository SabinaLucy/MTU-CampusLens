
"""Read upcoming public events from Michigan Tech's official iCalendar feed."""

import asyncio
import logging
import time
from datetime import date, datetime, time as dt_time, timedelta
from zoneinfo import ZoneInfo
from urllib.parse import urlsplit

import httpx
from icalendar import Calendar

logger = logging.getLogger(__name__)

FEED_URL = "https://events.mtu.edu/calendar.ics"
TIMEZONE = ZoneInfo("America/Detroit")
CACHE_SECONDS = 900
EVENT_API = "https://events.mtu.edu/api/2/events"

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


def event_key(url):
    return urlsplit(url).path.rstrip("/")


async def enrich_images(client, events):
    """Use the official Localist calendar API; never block the ICS fallback."""
    async def fetch_page(page):
        try:
            response = await client.get(EVENT_API, params={"days": 90, "pp": 100, "page": page}, timeout=5.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return {}

    first = await fetch_page(1)
    pages = min(6, int(first.get("page", {}).get("total", 1) or 1))
    payloads = [first] + await asyncio.gather(*(fetch_page(i) for i in range(2, pages + 1)))
    images = {}
    for payload in payloads:
        for item in payload.get("events", []):
            event = item.get("event", {})
            photo = event.get("photo_url")
            if not isinstance(photo, str) or not photo.startswith("https://"):
                continue
            for url in (event.get("localist_url"), event.get("url")):
                if isinstance(url, str) and url.startswith("https://events.mtu.edu/event/"):
                    images[event_key(url)] = photo
    for event in events:
        photo = images.get(event_key(event["url"]))
        if photo:
            event["image_url"] = photo


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

            events = await asyncio.to_thread(parse_calendar, response.content)
            try:
                await asyncio.wait_for(enrich_images(client, events), timeout=10)
            except Exception:
                logger.warning("Official event images unavailable; retaining calendar entries")

        _cache["events"] = events
        _cache["expires"] = time.monotonic() + CACHE_SECONDS

        return {"events": events, "status": "live"}

    except Exception:
        logger.exception("Could not retrieve the MTU calendar")

        if _cache["events"]:
            return {"events": _cache["events"], "status": "cached"}

        return {"events": [], "status": "unavailable"}
