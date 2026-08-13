"""
Deterministic cache for AI responses.

Key = sha256(provider + "::" + model + "::" + prompt). Because prompts are
built deterministically (same scene, same fields, same template -> same
string), identical requests always hit cache instead of re-billing. This is
the mechanism behind "cache all AI responses / skip duplicate requests" in
the spec.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db import AICacheEntry


def make_key(provider: str, model: str, prompt: str) -> str:
    h = hashlib.sha256(f"{provider}::{model}::{prompt}".encode("utf-8")).hexdigest()
    return h


def get_cached(db: Session, provider: str, model: str, prompt: str) -> Optional[dict]:
    key = make_key(provider, model, prompt)
    row = db.get(AICacheEntry, key)
    return row.response_json if row else None


def set_cached(db: Session, provider: str, model: str, prompt: str, response: dict[str, Any]) -> None:
    key = make_key(provider, model, prompt)
    row = db.get(AICacheEntry, key)
    if row:
        row.response_json = response
    else:
        row = AICacheEntry(
            key=key,
            provider=provider,
            model=model,
            prompt_hash=key,
            response_json=response,
        )
        db.add(row)
    db.commit()
