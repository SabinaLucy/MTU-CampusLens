# CampusLens Gemini diagnostics patch

Only the following files are in this patch; it does not replace the frontend or building data.

- `backend/app/agents/providers.py` replaces the original provider adapter; adds a 27-second deadline and clearer sanitized error logging.
- `backend/diagnose_gemini.py` tests model listing and text generation; optionally checks image input.

## Installation (from your CampusLens project root)

1. Extract this zip into a temporary location.
2. Back up `backend/app/agents/providers.py`.
3. Copy the two files into their matching locations in your project. Do **not** overwrite `.env`.
4. Set `GEMINI_VISION_MODEL=gemini-3.5-flash-lite` and `GEMINI_CHAT_MODEL=gemini-3.5-flash-lite` in `backend/.env`.
5. Activate the backend virtual environment, then run `python diagnose_gemini.py`.
6. To test image access too, run `python diagnose_gemini.py "C:\path\to\your-photo.jpg"`.
7. Restart backend: `python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload`.

Do not share API keys or `.env` files. The diagnostic intentionally omits them from printed output, but review output before posting.
