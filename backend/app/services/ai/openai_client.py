"""
OpenAI cloud backend. Model name is free text (e.g. "gpt-5-mini",
"gpt-5.5") - whatever the user types is sent as-is, so this never needs a
code change when new models ship.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from app.services.ai.base import AIBackend, AIBackendError, strip_json_fences

API_URL = "https://api.openai.com/v1/chat/completions"


class OpenAIBackend(AIBackend):
    provider_name = "openai"

    def __init__(self, api_key: str | None):
        self.api_key = api_key

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def complete_json(self, model: str, system_prompt: str, user_prompt: str,
                             max_tokens: int = 800) -> dict[str, Any]:
        if not self.api_key:
            raise AIBackendError("No OpenAI API key configured.")

        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                r = await client.post(API_URL, headers=headers, json=payload)
                r.raise_for_status()
                data = r.json()
        except httpx.HTTPStatusError as e:
            raise AIBackendError(f"OpenAI error {e.response.status_code}: {e.response.text[:300]}") from e
        except httpx.HTTPError as e:
            raise AIBackendError(f"OpenAI request failed: {e}") from e

        text = data["choices"][0]["message"]["content"]
        try:
            return json.loads(strip_json_fences(text))
        except json.JSONDecodeError as e:
            raise AIBackendError(f"OpenAI returned non-JSON output: {e}") from e
