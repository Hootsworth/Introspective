"""
Google Gemini cloud backend. Model name is free text (e.g. "gemini-2.5-pro",
"gemini-2.5-flash") - sent as-is via the REST API's {model} path segment.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from app.services.ai.base import AIBackend, AIBackendError, strip_json_fences

API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiBackend(AIBackend):
    provider_name = "gemini"

    def __init__(self, api_key: str | None):
        self.api_key = api_key

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def complete_json(self, model: str, system_prompt: str, user_prompt: str,
                             max_tokens: int = 800) -> dict[str, Any]:
        if not self.api_key:
            raise AIBackendError("No Gemini API key configured.")

        url = f"{API_BASE}/{model}:generateContent?key={self.api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json",
            },
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                r = await client.post(url, json=payload)
                r.raise_for_status()
                data = r.json()
        except httpx.HTTPStatusError as e:
            raise AIBackendError(f"Gemini error {e.response.status_code}: {e.response.text[:300]}") from e
        except httpx.HTTPError as e:
            raise AIBackendError(f"Gemini request failed: {e}") from e

        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(strip_json_fences(text))
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            raise AIBackendError(f"Gemini returned unexpected output: {e}") from e
