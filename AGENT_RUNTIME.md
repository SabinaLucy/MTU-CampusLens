# CampusLens runtime agent orchestration

The backend now uses three skills: `campuslens-vision`, `campuslens-building-researcher`, and `campuslens-assistant`. Each has a `SKILL.md`, plus folders for scripts, references, and assets. `GET /api/agents/skills` lists them. Existing endpoints are unchanged; recognition and chat responses include `agent_trace` for demonstrations.

**Execution boundary:** SKILL.md is a documented instruction contract, not executable Python. The runtime orchestrator calls allowlisted Python functions; it does not run arbitrary scripts, browse websites, spawn agents, or execute shell commands. The researcher skill's CLI scripts remain optional offline maintenance tools, not exposed to student chat. This is a *deterministic multi-step agent workflow*, not autonomous multi-agent collaboration.

## Workflow

- `/api/recognize`: vision skill → Gemini/OpenAI vision adapter → uncertain/recognized result → student confirmation in React.
- `/api/chat`: researcher skill → curated JSON context and source links → assistant skill → Gemini/OpenAI chat adapter → deterministic fallback if unavailable.
- `/api/agents/skills`: read-only skill registry, safe for the demo.

## Run

From `backend` (after activating your virtual environment):

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Check `http://127.0.0.1:8001/api/agents/skills`. The frontend still runs using `npm run dev` and its existing port-8001 proxy. Credentials remain in backend `.env`, never in Git. Live model calls and the browser UI require testing on your machine.
