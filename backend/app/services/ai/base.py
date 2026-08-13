"""
Common interface every inference backend implements.

Adding a new backend (a different local runtime, a new cloud provider, or -
in the native macOS build - Apple Foundation Models via a Swift bridge)
means writing one class that implements `complete_json` and registering it
in orchestrator.py. Nothing else in the codebase needs to change.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class AIBackendError(Exception):
    """Raised when a backend is unreachable, unauthenticated, or errors out."""


class AIBackend(ABC):
    provider_name: str = "base"

    @abstractmethod
    async def is_available(self) -> bool:
        """Cheap reachability/credential check, used for UI status + fallback."""

    @abstractmethod
    async def complete_json(self, model: str, system_prompt: str, user_prompt: str,
                             max_tokens: int = 800) -> dict[str, Any]:
        """
        Send a prompt, get back a parsed JSON dict. Implementations are
        responsible for instructing their model to return ONLY JSON and for
        defensively parsing the result (stripping code fences etc).
        """


def strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    return text
