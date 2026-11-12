"""Stateless adapters for hosted AI. No training, model downloads, or credentials in UI.

HTTP calls are deliberately concentrated here so new providers can be added
without changing FastAPI routes or data storage.
"""
import base64
import asyncio
import json
import os
from typing import Any
import httpx
from ..config import provider_order


class AIProviderError(RuntimeError):
    """Safe caller-facing error (no secrets or raw upstream body)."""


def _json_object(text: str) -> dict[str, Any]:
    text = (text or '').strip()
    if text.startswith('```'):
        text = text.split('\n', 1)[-1].rsplit('```', 1)[0].strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    raise AIProviderError('Model returned an invalid structured response.')


async def _gemini(prompt: str, image: bytes | None, mime: str, model: str, json_mode: bool) -> str:
    key = os.getenv('GEMINI_API_KEY', '').strip()
    if not key:
        raise AIProviderError('Gemini key is not configured.')
    parts: list[dict[str, Any]] = [{'text': prompt}]
    if image is not None:
        parts.append({'inline_data': {'mime_type': mime, 'data': base64.b64encode(image).decode('ascii')}})
    payload: dict[str, Any] = {
        'contents': [{'role': 'user', 'parts': parts}],
        'generationConfig': {'temperature': 0.0 if json_mode else 0.2, 'maxOutputTokens': 900}
    }
    if json_mode:
        payload['generationConfig']['responseMimeType'] = 'application/json'

    async def request() -> str:
        # Intentionally no retries: a demo should fail promptly and provide a clear diagnostic.
        timeout = httpx.Timeout(connect=7.0, read=22.0, write=12.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                headers={'x-goog-api-key': key}, json=payload)
            if response.is_error:
                # Parse only the upstream error MESSAGE, not the raw response/request or credentials.
                try:
                    error = response.json().get('error', {})
                    reason = str(error.get('message', '')).strip().replace('\n', ' ')
                except (ValueError, AttributeError):
                    reason = ''
                reason = reason.replace(key, '[redacted]')[:350]
                details = f': {reason}' if reason else ''
                raise AIProviderError(f'Gemini {model} failed (HTTP {response.status_code}){details}')
            try:
                result = response.json()
                candidate = result.get('candidates', [{}])[0]
                answer = ''.join(p.get('text', '') for p in candidate.get('content', {}).get('parts', [])).strip()
                if answer:
                    return answer
                reason = candidate.get('finishReason', 'unknown')
                raise AIProviderError(f'Gemini {model} returned no text (finish reason: {reason}).')
            except (KeyError, IndexError, ValueError, TypeError) as exc:
                raise AIProviderError('Gemini response format was unexpected.') from exc

    try:
        # Hard deadline prevents hanging indefinitely during a student demo.
        return await asyncio.wait_for(request(), timeout=27.0)
    except (asyncio.TimeoutError, httpx.TimeoutException) as exc:
        raise AIProviderError(f'Gemini {model} timed out after approximately 27 seconds.') from exc
    except httpx.RequestError as exc:
        raise AIProviderError(f'Gemini {model} connection failed ({type(exc).__name__}).') from exc


async def _openai(prompt: str, image: bytes | None, mime: str, model: str) -> str:
    key = os.getenv('OPENAI_API_KEY', '').strip()
    if not key:
        raise AIProviderError('OpenAI key is not configured.')
    content: list[dict[str, Any]] = [{'type': 'input_text', 'text': prompt}]
    if image is not None:
        encoded = base64.b64encode(image).decode('ascii')
        content.append({'type': 'input_image', 'image_url': f'data:{mime};base64,{encoded}'})
    payload = {'model': model, 'input': [{'role': 'user', 'content': content}], 'max_output_tokens': 800}
    try:
        async with httpx.AsyncClient(timeout=40) as client:
            response = await client.post('https://api.openai.com/v1/responses',
                headers={'Authorization': f'Bearer {key}'}, json=payload)
            response.raise_for_status()
            result = response.json()
            texts = [part.get('text', '') for output in result.get('output', [])
                     for part in output.get('content', []) if part.get('type') == 'output_text']
            answer = '\n'.join(texts).strip()
            if not answer:
                raise AIProviderError('OpenAI returned no answer.')
            return answer
    except httpx.HTTPStatusError as exc:
        raise AIProviderError(f'OpenAI request failed (HTTP {exc.response.status_code}).') from exc
    except httpx.RequestError as exc:
        raise AIProviderError('OpenAI cannot be reached.') from exc
    except (KeyError, ValueError) as exc:
        raise AIProviderError('OpenAI response format was unexpected.') from exc


async def generate(prompt: str, *, image: bytes | None = None, mime: str = 'image/jpeg',
                   task: str = 'chat', json_mode: bool = False) -> tuple[str, str]:
    configured = provider_order()
    if not configured:
        raise AIProviderError('No AI provider is configured. Set GEMINI_API_KEY in backend/.env.')
    failures = []
    for provider in configured:
        try:
            if provider == 'gemini':
                model = os.getenv('GEMINI_VISION_MODEL' if task == 'vision' else 'GEMINI_CHAT_MODEL',
                                  'gemini-2.5-flash' if task == 'vision' else 'gemini-2.5-flash-lite')
                return await _gemini(prompt, image, mime, model, json_mode), provider
            return await _openai(prompt, image, mime,
                                 os.getenv('OPENAI_MODEL', 'gpt-4.1-mini')), provider
        except AIProviderError as exc:
            failures.append(str(exc))
    raise AIProviderError(' '.join(failures))


async def recognize(image: bytes, mime: str, buildings: list[dict[str, Any]]) -> dict[str, Any]:
    candidates = '\n'.join(f"ID {b['id']}: {b['name']} ({b['abbreviation']}); also called {', '.join(b['aliases'])}"
                           for b in buildings)
    prompt = f'''You are a campus building visual identification assistant for a STUDENT DEMO.
Only use what is VISIBLE IN THE IMAGE. Do not assume it shows a campus building.
Choose exactly one ID from this list or null if uncertain:
{candidates}
If exterior features, signage or clear distinguishing details are missing, return null.
Even if the image seems to be a campus building, do NOT force a match.
Return a JSON object with fields: building_id (integer or null), confidence (low, medium, high),
evidence (one brief sentence specifying visible cues; no invented facts).
Set building_id to null when confidence is low, or image is not recognizable as one of these buildings.
Your confidence is an uncalibrated subjective estimate, not a probability.'''
    response, provider = await generate(prompt, image=image, mime=mime, task='vision', json_mode=True)
    decision = _json_object(response)
    id_ = decision.get('building_id')
    confidence = str(decision.get('confidence', 'low')).lower()
    if type(id_) is not int or not any(b['id'] == id_ for b in buildings) or confidence not in ('high', 'medium'):
        return {'status': 'uncertain', 'building_id': None, 'building': None,
                'confidence': 'low', 'evidence': str(decision.get('evidence',''))[:300],
                'provider': provider, 'message': 'Image does not provide a reliable match. Select a building manually.'}
    chosen = next(b for b in buildings if b['id'] == id_)
    return {'status': 'recognized', 'building_id': id_,
            'building': {k: chosen[k] for k in ('id','name','abbreviation','description','address','campus_map_number','map_url','source')},
            'confidence': confidence, 'evidence': str(decision.get('evidence',''))[:300],
            'provider': provider, 'message': 'AI suggestion only. Confirm before opening the building dashboard.'}
