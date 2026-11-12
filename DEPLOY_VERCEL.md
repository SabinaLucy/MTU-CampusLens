# Deploy MTU CampusLens on Vercel

This package adds a root-level `pyproject.toml` so Vercel can find the existing
FastAPI application in `backend/app/main.py` *without moving it*. The backend
project must use the Git repository **root** so the runtime can read `.agents/skills`.
The frontend project uses the `frontend` directory.

## Install the deployment config

Extract this ZIP directly into your existing `MTU-CampusLens` repository folder.
Confirm the new file is `MTU-CampusLens/pyproject.toml` (not `backend/pyproject.toml`).

From PowerShell:

```powershell
cd C:\Users\strus\Documents\MTU-CampusLens
python -c "import tomllib; print(tomllib.load(open('pyproject.toml','rb'))['tool']['vercel']['entrypoint'])"
git add pyproject.toml
git commit -m "Configure FastAPI deployment on Vercel"
git push origin main
```

## Vercel project 1: backend

1. Go to https://vercel.com/new and import `SabinaLucy/MTU-CampusLens`.
2. Project name: `campuslens-api` (or any available name).
3. Root Directory: **`./`** (repository root, NOT `backend`).
4. Framework Preset: **FastAPI**; Vercel reads the `pyproject.toml` entrypoint.
5. In Environment Variables, set `GEMINI_API_KEY` to the real key from
   your local `backend/.env`. Optionally copy any working `AI_PROVIDER`,
   `GEMINI_VISION_MODEL`, and `GEMINI_CHAT_MODEL` variables from there.
   Do **not** put an API key in a variable beginning with `VITE_`.
6. Deploy. Open `https://YOUR-API.vercel.app/api/health` and
   `https://YOUR-API.vercel.app/api/agents/skills`.

If `agents/skills` fails, inspect Vercel's runtime logs and verify the project
root is the repository root and `.agents/skills/**/SKILL.md` is included.

## Vercel project 2: frontend

1. Import the **same** GitHub repository as a second Vercel project.
2. Project name: `campuslens-web` (or any available name).
3. Root Directory: **`frontend`**.
4. Framework Preset: **Vite**.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Environment Variable: `VITE_API_URL=https://YOUR-API.vercel.app` (no trailing slash).
8. Deploy and note the public frontend URL.

## Connect the two projects via CORS

In the backend Vercel project's Settings > Environment Variables add:

`FRONTEND_ORIGINS=https://YOUR-WEB.vercel.app`

Select Production (and Preview if applicable), save, and **redeploy backend**.
The origin must match the browser's exact URL origin: no trailing slash, and no
path. To support multiple known origins, separate them with commas.

## Verify

- API: `/api/health` reports `buildings_count` of 5.
- API: `/api/agents/skills` lists three skills.
- Frontend displays five buildings.
- Open a building manually and try chat.
- Test Gemini recognition with a relatively small JPEG file.

Vercel functions have request payload limits; very large phone photos may be
rejected before FastAPI receives them. For a live demo, use photos < 4 MB.

Never upload `backend/.env`, paste an API key in a screenshot, or use
`git push --force` to work around deployment problems.
