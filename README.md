# MTU CampusLens — Building Recognition MVP

A student-built prototype for recognizing selected Michigan Tech campus buildings and browsing building information.

## Included

- React + TypeScript + Vite frontend
- Python + FastAPI backend
- SQLAlchemy database layer: SQLite by default for the quickest setup; MySQL supported through `DATABASE_URL`
- OpenAI vision-based building recognition (optional API key)
- Database-grounded AI Q&A (optional API key)
- Manual building selection fallback
- Seed records for five building identities
- Empty event, room, and department sections until verified records are added

> This is an independent student prototype, not an official Michigan Tech application. Building descriptions in the seed data are intentionally conservative. Do not present empty or unverified records as current MTU schedules or events.

## Requirements

- Python 3.10+
- Node.js 18+
- Optional: MySQL 8+ and an OpenAI API key

## Run on Windows (PowerShell)

### 1. Start the backend

Open PowerShell in the project folder:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Open `backend/.env` and add your OpenAI API key to `OPENAI_API_KEY=` if you want live recognition and AI chat. The app still runs without it; manual building selection works.

Start the API:

```powershell
uvicorn app.main:app --reload
```

Backend: http://localhost:8000  
API documentation: http://localhost:8000/docs

### 2. Start the frontend

Open a **second** PowerShell window:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL Vite prints, normally http://localhost:5173.

## MySQL setup (optional)

SQLite is the default so the demo can run immediately without installing or configuring MySQL.

To use MySQL instead:

1. Create a database and user in MySQL:

```sql
CREATE DATABASE campuslens CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'campuslens'@'localhost' IDENTIFIED BY 'choose_a_password';
GRANT ALL PRIVILEGES ON campuslens.* TO 'campuslens'@'localhost';
FLUSH PRIVILEGES;
```

2. In `backend/.env`, set:

```env
DATABASE_URL=mysql+pymysql://campuslens:choose_a_password@localhost:3306/campuslens
```

3. Restart the backend. SQLAlchemy creates the tables and inserts the five starter buildings.

Never commit `.env`, API keys, or database passwords.

## OpenAI setup

Create an API key in your OpenAI developer account and put it in `backend/.env`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

The key stays on the backend and is never sent to the browser. Recognition is a model suggestion, not a guaranteed identification. Check the suggested building before relying on it.

## Add verified data

The initial seed deliberately does not invent departments, room numbers, class schedules, or events. Add verified records to the corresponding tables (`departments`, `rooms`, `events`) and include source URLs. For example, use the official MTU Events Calendar for events and the Registrar for published classroom information. Do not add scraped or historical records as upcoming events.

## API endpoints

- `GET /api/health`
- `GET /api/buildings`
- `GET /api/buildings/{id}`
- `GET /api/buildings/{id}/events`
- `GET /api/buildings/{id}/departments`
- `GET /api/buildings/{id}/classes`
- `POST /api/recognize` (multipart form field: `file`)
- `POST /api/chat` (JSON: `{"building_id": 1, "question": "..."}`)

## Push to GitHub

From the project root:

```powershell
git init
git add .
git commit -m "Initial MTU CampusLens MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/mtu-campuslens.git
git push -u origin main
```

Create the empty GitHub repository first and replace `YOUR-USERNAME` with your GitHub username.

## Troubleshooting

- Backend import/package errors: ensure the virtual environment is active and run `pip install -r requirements.txt`.
- Frontend cannot reach backend: ensure the API is running at `http://localhost:8000`.
- OpenAI recognition not available: check `OPENAI_API_KEY`, model access, billing, and backend terminal errors. Manual selection is available regardless.
- MySQL connection errors: verify the MySQL service, database, username, password, and `DATABASE_URL`. Use SQLite first if the goal is simply to demo the app.

## Current MVP limitations

- Recognition depends on a configured OpenAI vision model and can be uncertain.
- No official MTU data feed is integrated.
- The seed data contains building identities and cautious descriptions only; event, department, and room data must be verified and populated.
- No authentication, role-based editing, automated data refresh, or production deployment is included.
