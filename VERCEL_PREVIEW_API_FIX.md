# Preview deployment API configuration

The 76 building records and the live events endpoint are on the backend. The frontend screenshot showing `Request failed (404)`, zero buildings, and unavailable events is consistent with the preview frontend requesting its own domain's `/api` paths instead of the backend.

1. In the Vercel **frontend** project `mtu-campus-lens`, open Settings > Environment Variables.
2. Set `VITE_API_URL` to the public HTTPS backend domain of the separate `mtu-campuslens-backend` Vercel project, **without** `/api` or a trailing slash. Select the **Preview** environment (and Production as needed).
3. Redeploy the **frontend preview** after changing this variable. Vite injects environment variables at build time.
4. Check `https://YOUR-BACKEND-DOMAIN/api/health` returns a building count of 76 and `https://YOUR-BACKEND-DOMAIN/api/buildings` returns the directory.
5. In the backend Vercel project, set `FRONTEND_ORIGINS` to the exact frontend preview and production origins (comma-separated) and redeploy if needed. CORS matters after the URL points to the backend.
6. Test the frontend building list and the existing `/api/events` endpoint. The events integration was not removed; if the backend responds with `status: unavailable`, investigate the official MTU calendar feed separately.

Do not expose backend API keys in any `VITE_` variable.
