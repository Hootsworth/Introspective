"""
The orchestrator is the single choke point every AI call goes through. It
enforces the spec's credit-optimization rules in one place instead of
scattering them across call sites:

  - Local Only  -> only ever calls the local backend. Cloud keys are never
                   touched, even if present.
  - Cloud Only  -> only ever calls the configured cloud provider.
  - Hybrid      -> tries local first; if local is unavailable/fails AND a
                   cloud key is configured, falls back to cloud - but only
                   ever sends the compact structured prompt built for a
                   SINGLE scene, never the full screenplay.
  - Every call is cache-checked first (services/cache.py) using a
    deterministic hash of provider+model+prompt, so re-analyzing an
    unchanged scene never re-bills, locally or in the cloud.

Callers (cinematic_analysis.py) never talk to a backend class directly.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, Optional

from sqlalchemy.orm import Session

from app.config import (DEFAULT_GEMINI_MODEL, DEFAULT_LOCAL_MODEL,
                         DEFAULT_OPENAI_MODEL, MAX_CLOUD_INPUT_CHARS)
from app.services.ai.base import AIBackendError
from app.services.ai.gemini_client import GeminiBackend
from app.services.ai.ollama_client import OllamaBackend
from app.services.ai.openai_client import OpenAIBackend
from app.services.cache import get_cached, set_cached
from app.storage.keystore import get_secret

AIMode = Literal["local", "cloud", "hybrid"]


@dataclass
class OrchestratorResult:
    data: dict[str, Any]
    provider_used: str
    model_used: str
    from_cache: bool


class AIOrchestrator:
    def __init__(self, local_model: str = DEFAULT_LOCAL_MODEL,
                 openai_model: str = DEFAULT_OPENAI_MODEL,
                 gemini_model: str = DEFAULT_GEMINI_MODEL,
                 cloud_provider: Literal["openai", "gemini"] = "openai"):
        self.local_model = local_model
        self.openai_model = openai_model
        self.gemini_model = gemini_model
        self.cloud_provider = cloud_provider

        self.ollama = OllamaBackend()
        self.openai = OpenAIBackend(get_secret("openai_api_key"))
        self.gemini = GeminiBackend(get_secret("gemini_api_key"))

    def _cloud_backend(self):
        return self.openai if self.cloud_provider == "openai" else self.gemini

    def _cloud_model(self) -> str:
        return self.openai_model if self.cloud_provider == "openai" else self.gemini_model

    async def run(self, db: Session, mode: AIMode, system_prompt: str, user_prompt: str,
                   max_tokens: int = 800) -> OrchestratorResult:
        # Hard safety valve regardless of mode: never ship a runaway prompt
        # to a cloud API. Local models can handle longer context fine.
        cloud_prompt = user_prompt
        if len(cloud_prompt) > MAX_CLOUD_INPUT_CHARS:
            cloud_prompt = cloud_prompt[:MAX_CLOUD_INPUT_CHARS] + "\n[...truncated for cost control...]"

        if mode == "local":
            return await self._call_local(db, system_prompt, user_prompt, max_tokens)

        if mode == "cloud":
            return await self._call_cloud(db, system_prompt, cloud_prompt, max_tokens)

        # hybrid: local first, cloud as fallback only
        try:
            return await self._call_local(db, system_prompt, user_prompt, max_tokens)
        except AIBackendError:
            return await self._call_cloud(db, system_prompt, cloud_prompt, max_tokens)

    async def _call_local(self, db: Session, system_prompt: str, user_prompt: str,
                           max_tokens: int) -> OrchestratorResult:
        cached = get_cached(db, "ollama", self.local_model, system_prompt + user_prompt)
        if cached is not None:
            return OrchestratorResult(cached, "ollama", self.local_model, True)

        if not await self.ollama.is_available():
            raise AIBackendError("Local model backend (Ollama) is not reachable.")

        result = await self.ollama.complete_json(self.local_model, system_prompt, user_prompt, max_tokens)
        set_cached(db, "ollama", self.local_model, system_prompt + user_prompt, result)
        return OrchestratorResult(result, "ollama", self.local_model, False)

    async def _call_cloud(self, db: Session, system_prompt: str, user_prompt: str,
                           max_tokens: int) -> OrchestratorResult:
        backend = self._cloud_backend()
        model = self._cloud_model()

        cached = get_cached(db, backend.provider_name, model, system_prompt + user_prompt)
        if cached is not None:
            return OrchestratorResult(cached, backend.provider_name, model, True)

        if not await backend.is_available():
            raise AIBackendError(
                f"No {backend.provider_name} API key configured. Add one in Settings, "
                f"or switch this project to Local Only mode."
            )

        result = await backend.complete_json(model, system_prompt, user_prompt, max_tokens)
        set_cached(db, backend.provider_name, model, system_prompt + user_prompt, result)
        return OrchestratorResult(result, backend.provider_name, model, False)

    async def status(self) -> dict[str, Any]:
        return {
            "ollama_reachable": await self.ollama.is_available(),
            "openai_key_set": bool(self.openai.api_key),
            "gemini_key_set": bool(self.gemini.api_key),
        }
