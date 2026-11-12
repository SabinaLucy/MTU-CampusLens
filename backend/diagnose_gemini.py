"""Safe Gemini connectivity diagnostic: run from backend with `python diagnose_gemini.py [photo.jpg]`.

Uses the GEMINI_API_KEY already in backend/.env; never prints its value.
Tests model listing, a tiny text request and optionally an image request.
"""
import base64
from io import BytesIO
import os
from pathlib import Path
import sys

import httpx
from dotenv import load_dotenv
from PIL import Image, ImageOps

load_dotenv(Path(__file__).with_name('.env'))
KEY = os.getenv('GEMINI_API_KEY', '').strip()
MODEL = os.getenv('GEMINI_VISION_MODEL', 'gemini-3.5-flash-lite').strip()
BASE = 'https://generativelanguage.googleapis.com/v1beta'
TIMEOUT = httpx.Timeout(connect=7.0, read=22.0, write=12.0, pool=5.0)


def safe_message(response):
    try:
        err = response.json().get('error', {})
        message = str(err.get('message', '')).replace('\n', ' ').strip()
    except (ValueError, AttributeError):
        message = ''
    return message.replace(KEY, '[redacted]')[:300] if KEY else message[:300]


def show_result(response, action):
    if response.is_error:
        print(f'{action}: HTTP {response.status_code}: {safe_message(response)}')
        return False
    try:
        data = response.json()
        candidate = data.get('candidates', [{}])[0]
        parts = candidate.get('content', {}).get('parts', [])
        text = ' '.join(p.get('text', '') for p in parts if 'text' in p)
        print(f'{action}: HTTP {response.status_code}; answer={text[:220]!r}; finish={candidate.get("finishReason", "unknown")}')
    except (ValueError, TypeError, KeyError, IndexError):
        print(f'{action}: HTTP {response.status_code}; unexpected JSON response')
    return True


def main():
    if not KEY:
        print('Missing GEMINI_API_KEY in backend/.env'); return
    print(f'Testing Gemini model: {MODEL}')
    print('The API key will not be displayed.')
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            response = client.get(f'{BASE}/models', headers={'x-goog-api-key': KEY})
            if response.is_error:
                print(f'ListModels: HTTP {response.status_code}: {safe_message(response)}')
                return
            models = response.json().get('models', [])
            usable = [m.get('name','').removeprefix('models/') for m in models if 'generateContent' in m.get('supportedGenerationMethods', [])]
            print(f'ListModels: HTTP 200; {len(usable)} models support generateContent')
            print('Available recommended models: ' + ', '.join(m for m in ('gemini-3.5-flash-lite','gemini-3.8-flash','gemini-3.6-flash') if m in usable))
            if MODEL not in usable:
                print(f'PROBLEM: {MODEL} is not listed as generateContent-capable for this API key.')
                print('Select an available model listed above in backend/.env, restart FastAPI, and retry.')
                return
            payload = {'contents':[{'parts':[{'text':'Reply with just the word OK.'}]}], 'generationConfig':{'maxOutputTokens':100}}
            response = client.post(f'{BASE}/models/{MODEL}:generateContent', headers={'x-goog-api-key': KEY}, json=payload)
            if not show_result(response, 'Text generation'):
                return
            if len(sys.argv) > 1:
                path = Path(sys.argv[1])
                if not path.is_file():
                    print(f'Image not found: {path}'); return
                with Image.open(path) as im:
                    im = ImageOps.exif_transpose(im).convert('RGB')
                    im.thumbnail((960,960))
                    out = BytesIO(); im.save(out, 'JPEG', quality=78)
                b64 = base64.b64encode(out.getvalue()).decode('ascii')
                payload = {'contents':[{'parts':[{'text':'Describe the main object in this photo using one short sentence.'},{'inline_data':{'mime_type':'image/jpeg','data':b64}}]}], 'generationConfig':{'maxOutputTokens':180}}
                response = client.post(f'{BASE}/models/{MODEL}:generateContent', headers={'x-goog-api-key': KEY}, json=payload)
                show_result(response, 'Image generation request')
    except httpx.TimeoutException:
        print('Request timed out. Possible service overload or network/firewall problem.')
    except httpx.RequestError as exc:
        print(f'Network error: {type(exc).__name__} (check internet, firewall, and proxy settings)')


if __name__ == '__main__':
    main()
