# Install MTU CampusLens Building Researcher Agent Skill

This add-on is deliberately **non-destructive**. It adds a standard repo-local Agent Skill and does not replace the existing React, FastAPI, Gemini, or JSON files.

## 1. Install

Extract this ZIP into the root of the working project (the folder containing `backend/` and `frontend/`):

`C:\Users\strus\Documents\MTU-CampusLens\`

You should then have:

`.agents/skills/campuslens-building-researcher/SKILL.md`

## 2. Use with an Agent-Skills-aware coding assistant

Open the CampusLens project root in an agent-capable editor or terminal such as Codex. For Codex, ask:

> Use $campuslens-building-researcher to inspect the current Fisher Hall rooms and validate the snapshot. Do not change production data.

Codex loads repository skills from `.agents/skills`. Agent Skill support/invocation varies among assistants. Merely adding the files does not automatically make the FastAPI server read `SKILL.md`.

## 3. Run the skill tools on Windows PowerShell

Run from the **repository root**, not from `backend`:

```powershell
cd C:\Users\strus\Documents\MTU-CampusLens
python .agents/skills/campuslens-building-researcher/scripts/inspect_building.py --list
python .agents/skills/campuslens-building-researcher/scripts/inspect_building.py --building 3 --question "Which rooms are listed?"
python .agents/skills/campuslens-building-researcher/scripts/validate_snapshot.py
python .agents/skills/campuslens-building-researcher/scripts/create_draft.py --kind room --building 3 --output draft-fisher-room.json
```

Scripts are read-only except `create_draft.py`, which writes **only the output draft you choose** and refuses to overwrite the production JSON file. Delete unverified draft files before committing unless explicitly needed for review.

## 4. What it does and doesn't do

**Does:** Inspect existing building JSON, check structure/source metadata, scaffold safe review drafts, guide agent-assisted official-source verification.

**Doesn't:** Call Gemini, automatically recognize photos, fetch official pages, make event feeds live, train AI, or launch independent autonomous agents. The existing FastAPI `agents/` and Gemini provider continue to handle end-user recognition and chat. To wire a runtime agent workflow into FastAPI would require a separate, explicit code integration.

## 5. Keep the project safe

The `.env` and API keys must remain private. Existing `.gitignore` should continue to exclude `.env`, `.venv`, and `node_modules`. Check `git diff` and test manual selection, recognition and chat after changes. All events and classes remain a curated non-live snapshot.
