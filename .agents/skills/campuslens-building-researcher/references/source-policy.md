# MTU CampusLens source and data policy

This is a **student prototype**, not an official MTU application. Facts require current primary-source verification before inclusion; this file lists places to look, **not verified records**.

## Preferred official sources

- Campus map: https://map.mtu.edu/ and https://www.mtu.edu/maps/
- University sites and department/office descriptions: https://www.mtu.edu/
- Public university calendar: https://events.mtu.edu/
- Registrar / published classroom and course information: https://www.mtu.edu/registrar/
- Classroom directory: https://www.mtu.edu/it/services/learning-technology/classrooms/

## Rules for adding information

1. For each assertion, record `source.title`, `source.url`, `source.checked_at` (ISO 8601 with timezone), and `source.source_type` (`official_mtu`).
2. A dated source is not necessarily current. Distinguish past events from upcoming ones by comparing actual event start times to the current time. Don't claim automated refresh or live data.
3. A room's existence does **not** imply that a particular class or event meets there.
4. A class listing needs a publicly accessible, verified term, course identifier, room, days, and time. If not all are known, keep the `classes` list empty.
5. Don't scrape authenticated data or publish private student/class enrollment information.
6. Download photographs only if you have permission to use them, and record attribution/license where applicable. Do not add photos to `assets/` by guessing their ownership.
7. Data is a snapshot: don't set `live_events` or `live_classes` to true without implementing actual refresh and freshness checks.
8. Leave uncertainty explicit. Empty lists mean "no verified records loaded," not "nothing is scheduled."

## Evidence workflow

For each candidate fact: open the official page, inspect the precise building/room/date wording, capture the URL and the verification timestamp, then stage the record as a draft. Only merge it after human review. `validate_snapshot.py` checks local structure and URLs but **cannot** determine whether a web page really confirms the fact.
