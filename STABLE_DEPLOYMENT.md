# Stable CampusLens deployment

Frontend browser requests are relative /api routes. Vite proxies locally; Vercel rewrites deployed requests to the server-side proxy. The proxy forwards to FastAPI without browser CORS.

The proxy defaults to the verified stable backend branch alias in Preview. BACKEND_API_URL is an optional server-side override; no URL variable is required for this branch. Remove or ignore VITE_API_URL; it is no longer used. If backend Preview deployment protection is enabled, configure BACKEND_PROTECTION_BYPASS as a server-only secret using the backend project's automation bypass secret, or choose an appropriate backend protection setting. Do not expose the secret in VITE_ variables. Backend GEMINI_API_KEY must separately be enabled for Preview to use AI. No production settings need to change for this branch.

After the configuration is saved, deploy both projects from this branch. Open the stable frontend branch URL and run the smoke test below. Vercel function request-size limits still apply to image uploads. Production defaults to the existing production backend unless BACKEND_API_URL is explicitly set.

Smoke test: node frontend/scripts/check-api.mjs https://<frontend-branch-domain> (requires accessible preview; optional VERCEL_AUTOMATION_BYPASS_SECRET for protected frontend). Then manually test photo upload and chat with AI configured. No live deployment verification is implied by this commit.
