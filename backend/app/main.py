"""MTU CampusLens: JSON-backed FastAPI app with optional AI-powered agents."""
from contextlib import asynccontextmanager
from io import BytesIO
import logging
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .config import origins, provider_order
from .services.repository import BuildingRepository
from .agents.providers import recognize, generate, AIProviderError
from .agents.knowledge_agent import grounded_context, collect_sources
from .agents.orchestrator import recognize_workflow, chat_workflow
from .agents.skill_runtime import list_skills

logger = logging.getLogger(__name__)
repo = BuildingRepository()
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000


@asynccontextmanager
async def lifespan(_: FastAPI):
    repo.all()  # Fail clearly on an absent or malformed snapshot at startup.
    yield


app = FastAPI(title='MTU CampusLens API', description='Independent student prototype; not an official MTU service.',
              version='1.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=origins(), allow_credentials=False,
                   allow_methods=['GET','POST'], allow_headers=['Content-Type'])


class ChatRequest(BaseModel):
    building_id: int = Field(ge=1)
    question: str = Field(min_length=2, max_length=500)


def find_building(building_id: int):
    b = repo.get(building_id)
    if b is None:
        raise HTTPException(status_code=404, detail='Building not found. Choose one of the supported campus buildings.')
    return b


@app.get('/api/health')
async def health():
    meta = repo.metadata()
    return {'status': 'ok', 'storage': 'json', 'buildings_count': len(repo.all()),
            'ai_configured': bool(provider_order()), 'providers_available': provider_order(),
            'snapshot_verified_at': meta['last_verified_at'],
            'live_events': False, 'live_classes': False}


@app.get('/api/agents/skills')
async def agent_skills():
    return {'skills': list_skills(), 'runtime': 'explicit-orchestrator', 'executes_skill_scripts': False}


@app.get('/api/buildings')
async def list_buildings():
    return repo.list_buildings()


@app.get('/api/buildings/{building_id}')
async def get_building(building_id: int):
    return find_building(building_id)


@app.get('/api/buildings/{building_id}/events')
async def get_events(building_id: int):
    return find_building(building_id)['events']


@app.get('/api/buildings/{building_id}/departments')
async def get_departments(building_id: int):
    return find_building(building_id)['departments']


@app.get('/api/buildings/{building_id}/classes')
async def get_classes(building_id: int):
    return find_building(building_id)['classes']


def validated_image(raw: bytes) -> tuple[bytes, str]:
    if not raw:
        raise HTTPException(status_code=422, detail='Image file is empty.')
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail='Image is larger than 8 MB.')
    try:
        with Image.open(BytesIO(raw)) as image:
            if image.format not in ('JPEG','PNG','WEBP'):
                raise HTTPException(status_code=415, detail='Only JPEG, PNG, or WebP images are supported.')
            image.verify()
        with Image.open(BytesIO(raw)) as image:
            image = ImageOps.exif_transpose(image).convert('RGB')
            image.thumbnail((1600,1600))
            output = BytesIO()
            image.save(output, 'JPEG', quality=82)
            return output.getvalue(), 'image/jpeg'
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=415, detail='Invalid or unsupported image. Upload a JPG, PNG, or WebP photo.') from exc


@app.post('/api/recognize')
async def recognize_image(file: UploadFile = File(...)):
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    photo, mime = validated_image(raw)
    if not provider_order():
        return {'status': 'unavailable', 'building_id': None, 'building': None,
                'confidence': None, 'evidence': None, 'provider': None,
                'message': 'AI recognition is not configured. Use the manual building selector.'}
    try:
        return await recognize_workflow(photo, mime, repo.all())
    except AIProviderError as exc:
        logger.warning('Recognition provider failed: %s', exc)
        return {'status': 'unavailable', 'building_id': None, 'building': None,
                'confidence': None, 'evidence': None, 'provider': None,
                'message': 'Recognition service is temporarily unavailable. Use manual selection.'}


@app.post('/api/chat')
async def chat(body: ChatRequest):
    building = find_building(body.building_id)
    return await chat_workflow(body.question, building, repo.metadata(), bool(provider_order()))
