"""
Character extraction from a parsed script.

Two passes:
  1. Aggregate raw character-cue names across all scenes (dialogue counts,
     scene presence).
  2. Consolidate obvious aliases (e.g. "JOHN" vs "JOHN (O.S.)" vs
     "YOUNG JOHN") using simple normalization - no AI needed for the common
     case. Ambiguous alias merging (e.g. "THE STRANGER" == "MARCUS") is left
     to the optional AI enrichment pass, since that requires actually
     understanding the story.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.services.parser import ParsedScript

_EXT_SUFFIX_RE = re.compile(r"\s*\((V\.?O\.?|O\.?S\.?|CONT'?D|OFF)\)\s*$", re.IGNORECASE)


@dataclass
class ExtractedCharacter:
    canonical_name: str
    aliases: set[str] = field(default_factory=set)
    dialogue_count: int = 0
    scene_numbers: set[int] = field(default_factory=set)


def _normalize(name: str) -> str:
    name = _EXT_SUFFIX_RE.sub("", name).strip()
    name = re.sub(r"\s+", " ", name)
    return name.upper()


def extract_characters(script: ParsedScript) -> list[ExtractedCharacter]:
    registry: dict[str, ExtractedCharacter] = {}

    for scene in script.scenes:
        for d in scene.dialogue:
            canonical = _normalize(d.character)
            if not canonical:
                continue
            if canonical not in registry:
                registry[canonical] = ExtractedCharacter(canonical_name=canonical.title())
            entry = registry[canonical]
            if d.character.strip().upper() != canonical:
                entry.aliases.add(d.character.strip())
            entry.dialogue_count += 1
            entry.scene_numbers.add(scene.scene_number)

    return sorted(registry.values(), key=lambda c: c.dialogue_count, reverse=True)
