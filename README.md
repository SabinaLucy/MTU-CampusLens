# MTU CampusLens

CampusLens is an independent Michigan Technological University student project that uses agentic AI and multimodal building recognition to help students, staff and visitors explore campus.

The system uses React, TypeScript and Tailwind CSS for the frontend, FastAPI for the backend, curated JSON records for campus data, and Gemini or OpenAI for AI-powered recognition and assistance. No custom model training or SQL database is required.

## Features

- Building recognition from uploaded photos or camera captures, with manual confirmation and search.
- Campus directory with building images, departments, offices, faculty, staff and available room information.
- Live campus events, dining information and links to official resources.
- Ask CampusLens with conversational history, image and document attachments, and optional location sharing.
- Explore Nearby with an interactive campus map.
- Daily campus brief with weather, events, dining and Building of the Day.
- Saved buildings, campus resources, responsive navigation, and light and dark themes.

## Agentic AI architecture

| Component | Responsibility |
| --- | --- |
| Vision Agent | Uses a hosted multimodal model to suggest building matches. |
| Building Research and Knowledge Agent | Retrieves curated building records and their source references. |
| Campus Assistant Agent | Generates grounded answers with a deterministic fallback for building-specific questions. |
| Profile Research Agent | Offline tool for collecting candidate images from approved university websites for human review. |
| Agent Orchestrator | Coordinates runtime workflows and records agent handoffs. |

Three dedicated `SKILL.md` definitions describe the vision, building researcher and assistant responsibilities. Skills are loaded through an explicit allowlist rather than executed as arbitrary code. The architecture is intended to support adaptation to other universities with appropriate campus data and configuration.

## Run on Windows PowerShell

Requires Python 3.10+ and Node.js 18+.

**Terminal 1 — backend**

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

**Terminal 2 — frontend**

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. API documentation: http://localhost:8000/docs.

### Enable Gemini

Create an API key at https://aistudio.google.com/apikey and edit `backend/.env`:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_VISION_MODEL=gemini-2.5-flash
GEMINI_CHAT_MODEL=gemini-2.5-flash-lite
```

Restart the backend. For deployment, configure these variables in the backend hosting environment. Never commit API keys or `.env` files. OpenAI is also supported through `AI_PROVIDER=openai` and `OPENAI_API_KEY`. Free-tier availability and quotas may change.

## Project structure

- `frontend/src/main.tsx`: campus interface, recognition, directory and chat.
- `backend/app/main.py`: API endpoints and request validation.
- `backend/app/agents/`: agent workflows, provider adapters, knowledge retrieval and assistant logic.
- `backend/.agents/skills/`: runtime agent skill definitions.
- `backend/app/services/`: JSON repository and live event retrieval.
- `backend/app/data/`: curated campus records.
- `backend/tests/`: API and agent tests.

## API

- `GET /api/health`
- `GET /api/agents/skills`
- `GET /api/buildings`
- `GET /api/buildings/{building_id}`
- `GET /api/events`
- `GET /api/buildings/{building_id}/events`
- `GET /api/buildings/{building_id}/departments`
- `GET /api/buildings/{building_id}/classes`
- `POST /api/recognize`
- `POST /api/chat`
- `POST /api/campus-chat`

## Tests

```powershell
cd backend
pip install -r requirements-dev.txt
python -m pytest -q
```

After configuring Gemini, check the health endpoint and test recognition with genuine campus and non-campus images, building-specific questions and general campus chat.

## Contributing

```powershell
git clone https://github.com/SabinaLucy/MTU-CampusLens.git
cd MTU-CampusLens
git pull origin main
git switch -c feature/your-feature
```

Make changes on a feature branch and open a pull request. Use official university sources for new records, preserve source references and avoid inventing missing information.

## Limitations and future improvements

- Some buildings have incomplete faculty, staff, departmental and room information.
- Live events are supported, but most directory records are curated snapshots. Class schedules and dining hours are not guaranteed to be current.
- Building recognition is a model suggestion and requires user confirmation.
- Nearby results depend on available coordinates; distances are straight-line estimates, not walking routes.
- AI features depend on provider availability and API quotas. Manual browsing and building-specific fallback answers remain available.
- Runtime agents use structured handoffs rather than fully autonomous planning. Offline research results require human review.
- Further work includes expanding verified campus records, improving agent workflows and integrating additional free, reliable data sources.

CampusLens is a student prototype, not an official university service.
