from __future__ import annotations

import datetime as dt
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

AIMode = Literal["local", "cloud", "hybrid"]


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------
class ProjectCreate(BaseModel):
    title: str
    style_prompt: str = ""
    ai_mode: AIMode = "hybrid"


class ProjectOut(BaseModel):
    id: str
    title: str
    style_prompt: str
    ai_mode: AIMode
    created_at: dt.datetime
    updated_at: dt.datetime
    script_count: int = 0
    character_count: int = 0

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Scripts / parsing
# ---------------------------------------------------------------------------
class DialogueLine(BaseModel):
    character: str
    line: str
    parenthetical: Optional[str] = None


class SceneOut(BaseModel):
    id: str
    scene_number: int
    slugline: str
    location: str
    time_of_day: str
    int_ext: str
    action_text: str
    dialogue: list[DialogueLine]
    characters_present: list[str]

    dominant_emotion: Optional[str] = None
    emotional_intensity: Optional[float] = None
    tension_score: Optional[float] = None
    pacing_score: Optional[float] = None
    themes: list[str] = Field(default_factory=list)
    genre_tags: list[str] = Field(default_factory=list)
    cinematic: dict[str, Any] = Field(default_factory=dict)
    director_notes: str = ""
    generated_image_url: Optional[str] = None
    generated_prompt: str = ""
    analyzed: bool = False

    class Config:
        from_attributes = True


class ScriptOut(BaseModel):
    id: str
    project_id: str
    filename: str
    parsed_title: str
    created_at: dt.datetime
    scene_count: int = 0

    class Config:
        from_attributes = True


class ScriptDetailOut(ScriptOut):
    scenes: list[SceneOut]


class SceneUpdate(BaseModel):
    slugline: Optional[str] = None
    action_text: Optional[str] = None
    dialogue: Optional[list[DialogueLine]] = None
    director_notes: Optional[str] = None


class NoteIn(BaseModel):
    script_id: Optional[str] = None
    scene_id: Optional[str] = None
    title: str = ""
    body: str = ""
    color: str = "yellow"


class NoteOut(NoteIn):
    id: str
    project_id: str
    created_at: dt.datetime
    updated_at: dt.datetime

    class Config:
        from_attributes = True


class SearchResult(BaseModel):
    kind: str
    id: str
    title: str
    detail: str = ""
    url: str


# ---------------------------------------------------------------------------
# Characters
# ---------------------------------------------------------------------------
class CharacterOut(BaseModel):
    id: str
    name: str
    aliases: list[str]
    dialogue_count: int
    scene_count: int
    scene_numbers: list[int]
    description: str = ""
    clothing: str = ""
    palette: list[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
class SettingsIn(BaseModel):
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    default_ai_mode: Optional[AIMode] = None
    local_model: Optional[str] = None       # free-text, e.g. "llama3.2"
    openai_model: Optional[str] = None      # free-text, e.g. "gpt-5-mini"
    gemini_model: Optional[str] = None      # free-text, e.g. "gemini-2.5-flash"
    image_backend: Optional[str] = None
    comfyui_url: Optional[str] = None


class SettingsOut(BaseModel):
    has_openai_key: bool
    has_gemini_key: bool
    default_ai_mode: AIMode
    local_model: str
    openai_model: str
    gemini_model: str
    image_backend: str
    comfyui_url: str
    ollama_reachable: bool
    comfyui_reachable: bool


# ---------------------------------------------------------------------------
# Storyboard & ComfyUI Generation
# ---------------------------------------------------------------------------
class GenerateFrameRequest(BaseModel):
    prompt: Optional[str] = None
    negative_prompt: str = "blurry, low quality, distorted, bad anatomy, noise, watermark"
    aspect_ratio: str = "169"  # "169" | "239" | "43"
    steps: int = 20
    cfg: float = 7.0
    seed: Optional[int] = None
    style_preset: str = "cinematic"


class StoryboardFrameOut(BaseModel):
    scene_id: str
    image_url: str
    prompt: str
    seed: Optional[int] = None
    width: int
    height: int
    backend: str


# ---------------------------------------------------------------------------
# Analysis trigger
# ---------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    mode_override: Optional[AIMode] = None
    force: bool = False    # bypass cache
