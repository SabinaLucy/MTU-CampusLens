# MTU CampusLens — JSON-backed student MVP

An independent Michigan Tech student prototype. **No database, no model training.** React + TypeScript + Tailwind frontend; FastAPI backend; JSON curated records; optional Gemini or OpenAI recognition and grounded Q&A.

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

### Enable Gemini recognition and AI chat

Create an API key at https://aistudio.google.com/apikey and edit `backend/.env`:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_VISION_MODEL=gemini-2.5-flash
GEMINI_CHAT_MODEL=gemini-2.5-flash-lite
```

Restart the backend. Free-tier eligibility and quotas can change. The UI works without credentials: use **Browse manually**; the chat route uses a local, non-AI answer fallback. The backend also supports `AI_PROVIDER=openai` with `OPENAI_API_KEY`, or `AI_PROVIDER=auto` for Gemini then OpenAI. Do not commit `.env`.

## Architecture

- `frontend/src/main.tsx`: upload, confirmation, building dashboard, chat, manual search.
- `backend/app/main.py`: HTTP endpoints, validation, error handling.
- `backend/app/agents/providers.py`: Gemini and OpenAI HTTP adapters.
- `backend/app/agents/knowledge_agent.py`: curated source-grounded context.
- `backend/app/agents/answer_agent.py`: deterministic fallback answers.
- `backend/app/services/repository.py`: read-only JSON repository; can later be replaced by SQL.
- `backend/app/data/buildings.json`: five campus building identities and curated information with source URLs.

Data is **not live**. Empty events and classes do not mean nothing is scheduled. Only add records checked against official MTU sources; record `source.url` and `source.checked_at`. Do not invent schedules, room numbers, or upcoming events. No automatic scraping or refresh is implemented.

## API

`GET /api/health`, `GET /api/buildings`, `GET /api/buildings/{id}`, `GET /api/buildings/{id}/events`, `GET /api/buildings/{id}/departments`, `GET /api/buildings/{id}/classes`, `POST /api/recognize` (multipart `file`), `POST /api/chat` (`{"building_id":1,"question":"Where is this building?"}`).

## Tests

```powershell
cd backend
pip install -r requirements-dev.txt
python -m pytest -q
```

Test recognition with a genuine building photo and a non-campus image after setting a valid key. Model guesses are **not guaranteed**; users must confirm or manually correct them.

## GitHub

This package is a standalone implementation; compare against your existing repository before replacing files.

```powershell
git clone https://github.com/SabinaLucy/MTU-CampusLens.git
cd MTU-CampusLens
# Copy the contents of this project package into this cloned folder.
git status
git add .
git commit -m "Replace database with JSON repository and add CampusLens UI"
git push origin main
```

If you lack push permissions, create a branch and pull request. Keep API keys and `.env` out of Git. The `.gitignore` excludes these files.

## Limitations and handover

Recognition is a vision-model suggestion rather than a verified image classifier; no custom training/reference-image embeddings are included. The model can decline uncertain matches. No live MTU integration, production authentication, persistent feedback, or automatic event refresh. Extend the JSON dataset carefully, or swap the repository class for SQL later. A free-tier API may rate-limit or fail, so always demo the manual fallback.
