"""Environment configuration. API keys stay on the server."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / '.env', override=False)


def origins() -> list[str]:
    return [x.strip() for x in os.getenv('FRONTEND_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',') if x.strip()]


def provider_order() -> list[str]:
    provider = os.getenv('AI_PROVIDER', 'gemini').lower().strip()
    if provider not in ('gemini', 'openai', 'auto'):
        raise ValueError('AI_PROVIDER must be gemini, openai, or auto')
    enabled = [name for name, env in [('gemini','GEMINI_API_KEY'),('openai','OPENAI_API_KEY')]
               if os.getenv(env, '').strip()]
    return enabled if provider == 'auto' else [provider] if provider in enabled else []
