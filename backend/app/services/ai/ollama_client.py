"""
Local inference via Ollama (http://localhost:11434).

This is the primary local fallback when Apple Foundation Models aren't
available (i.e. whenever this Python backend is running standalone, since
Foundation Models are Swift-only). Works with any model the user has pulled
- llama3.2, qwen, mistral, etc - specified as free text, never a dropdown.

If Ollama isn't running, is_available() returns False and the orchestrator
transparently skips to the next backend in the chain (or surfaces a clear
"no local model available" state to the UI) rather than failing the whole
request.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from app.config import OLLAMA_BASE_URL
from app.services.ai.base import AIBackend, AIBackendError, strip_json_fences


class OllamaBackend(AIBackend):
    provider_name = "ollama"

    def __init__(self, base_url: str = OLLAMA_BASE_URL):
        self.base_url = base_url.rstrip("/")

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    async def complete_json(self, model: str, system_prompt: str, user_prompt: str,
                             max_tokens: int = 800) -> dict[str, Any]:
        payload = {
            "model": model,
            "prompt": f"{system_prompt}\n\n{user_prompt}\n\nRespond with ONLY valid JSON, no prose.",
            "stream": False,
            "format": "json",
            "options": {"num_predict": max_tokens, "temperature": 0.2},
        }
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                r = await client.post(f"{self.base_url}/api/generate", json=payload)
                r.raise_for_status()
                data = r.json()
        except httpx.HTTPError as e:
            raise AIBackendError(f"Ollama request failed: {e}") from e

        text = data.get("response", "")
        try:
            return json.loads(strip_json_fences(text))
        except json.JSONDecodeError as e:
            raise AIBackendError(f"Ollama returned non-JSON output: {e}") from e
