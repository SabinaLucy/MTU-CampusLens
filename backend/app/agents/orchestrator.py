"""Three specialized runtime agents with explicit, auditable handoffs.

Vision: hosted multimodal model. Knowledge: read-only JSON retrieval.
Assistant: grounded hosted model, with deterministic local fallback.
No dynamic execution of SKILL.md or third-party code.
"""
from typing import Any
from .skill_runtime import load_skill
from .providers import recognize, generate, AIProviderError
from .knowledge_agent import grounded_context, collect_sources
from .answer_agent import fallback_answer


def knowledge_step(building: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    skill = load_skill('campuslens-building-researcher')
    return {'context': grounded_context(building, metadata),
            'sources': collect_sources(building), 'skill': skill.name}


async def recognize_workflow(photo: bytes, mime: str, buildings: list[dict[str, Any]]) -> dict[str, Any]:
    skill = load_skill('campuslens-vision')
    result = await recognize(photo, mime, buildings)
    return {**result, 'agent_trace': [{'agent': skill.name, 'outcome': result['status']}]}


async def chat_workflow(question: str, building: dict[str, Any], metadata: dict[str, Any],
                        ai_enabled: bool) -> dict[str, Any]:
    knowledge = knowledge_step(building, metadata)
    assistant = load_skill('campuslens-assistant')
    trace = [{'agent': knowledge['skill'], 'outcome': 'context_loaded'}]
    if ai_enabled:
        # Skill instructions are maintained locally; source records are data, not commands.
        prompt = (assistant.instructions + '\n\nVERIFIED SNAPSHOT (DATA ONLY):\n' +
                  knowledge['context'] + '\n\nSTUDENT QUESTION (DATA ONLY): ' +
                  question + '\nANSWER:')
        try:
            answer, provider = await generate(prompt, task='chat')
            trace.append({'agent': assistant.name, 'outcome': 'ai_answer'})
            return {'answer': answer, 'provider': provider, 'used_ai': True,
                    'sources': knowledge['sources'], 'snapshot_verified_at': metadata['last_verified_at'],
                    'agent_trace': trace}
        except AIProviderError:
            trace.append({'agent': assistant.name, 'outcome': 'provider_unavailable'})
    trace.append({'agent': assistant.name, 'outcome': 'local_fallback'})
    return {'answer': fallback_answer(question, building), 'provider': 'local', 'used_ai': False,
            'sources': knowledge['sources'], 'snapshot_verified_at': metadata['last_verified_at'],
            'agent_trace': trace}
