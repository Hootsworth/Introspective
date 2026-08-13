"""
Builds the compact, deterministic per-scene prompt and turns the model's
JSON response into the Scene's analysis fields + intermediate
representation described in the spec.

Only ever sends ONE scene's worth of structured text per call - never the
full screenplay - and the prompt template is fixed, so identical scenes
(re-analysis, or duplicate scenes) hit the cache in orchestrator.py instead
of re-billing.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db import Scene
from app.services.ai.orchestrator import AIMode, AIOrchestrator

SYSTEM_PROMPT = (
    "You are an assistant director and cinematographer analyzing a single "
    "screenplay scene for pre-production planning. You think in terms of "
    "emotion, tension, pacing, and concrete cinematography choices - not "
    "generic descriptions. Always respond with ONLY a single JSON object, "
    "no prose, no markdown fences, matching exactly the schema you're given."
)

RESPONSE_SCHEMA_HINT = """
Respond with exactly this JSON shape:
{
  "dominant_emotion": "<one or two words, e.g. Lonely, Tense, Joyful>",
  "emotional_intensity": <float 0.0-1.0>,
  "tension_score": <float 0.0-1.0>,
  "pacing_score": <float 0.0-1.0, 0=slow/lingering 1=fast/frantic>,
  "themes": ["<up to 3 themes from: love, revenge, isolation, hope, betrayal, family, fear, justice, identity, power, grief, redemption>"],
  "genre_tags": ["<up to 2 of: Romance, Comedy, Horror, Action, Drama, Thriller, Sci-Fi, Mystery, Noir>"],
  "cinematic": {
    "lighting": "<e.g. Low Key, High Key, Natural, Practical>",
    "weather": "<e.g. Clear, Rain, Fog, Snow, N/A>",
    "camera": "<shot size + angle, e.g. Medium Close-Up, low angle>",
    "lens_suggestion": "<e.g. 35mm, 50mm anamorphic>",
    "movement": "<e.g. Static, Handheld, Slow Dolly In, Steadicam>",
    "composition": "<e.g. Rule of Thirds, Symmetry, Leading Lines>",
    "palette": ["<2-4 colors>"],
    "film_stock_inspiration": "<e.g. Kodak Vision3 500T, digital clean>",
    "visual_motifs": ["<0-3 short motif phrases>"]
  },
  "director_notes": "<2-4 sentences of concrete, actionable director notes for this scene>"
}
"""


def build_scene_prompt(scene: Scene, style_prompt: str) -> str:
    dialogue_preview = "\n".join(
        f"{d['character']}: {d['line']}" for d in (scene.dialogue_json or [])[:40]
    )
    style_line = f"Overall visual style for this project: {style_prompt}.\n" if style_prompt else ""
    return (
        f"{style_line}"
        f"SCENE {scene.scene_number} - {scene.slugline}\n"
        f"Location: {scene.location} | Time: {scene.time_of_day} | INT/EXT: {scene.int_ext}\n\n"
        f"ACTION:\n{scene.action_text.strip()[:2000]}\n\n"
        f"DIALOGUE:\n{dialogue_preview[:2000]}\n\n"
        f"{RESPONSE_SCHEMA_HINT}"
    )


def _clamp01(v: Any) -> float:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return 0.5
    return max(0.0, min(1.0, f))


async def analyze_scene(db: Session, scene: Scene, style_prompt: str, mode: AIMode,
                         orchestrator: AIOrchestrator) -> dict[str, Any]:
    prompt = build_scene_prompt(scene, style_prompt)
    result = await orchestrator.run(db, mode, SYSTEM_PROMPT, prompt, max_tokens=700)
    data = result.data

    cinematic = data.get("cinematic", {}) if isinstance(data.get("cinematic"), dict) else {}
    normalized = {
        "dominant_emotion": str(data.get("dominant_emotion", "Neutral"))[:60],
        "emotional_intensity": _clamp01(data.get("emotional_intensity")),
        "tension_score": _clamp01(data.get("tension_score")),
        "pacing_score": _clamp01(data.get("pacing_score")),
        "themes": list(data.get("themes", []))[:5],
        "genre_tags": list(data.get("genre_tags", []))[:4],
        "cinematic": {
            "scene": scene.scene_number,
            "location": scene.location,
            "time": scene.time_of_day,
            "lighting": cinematic.get("lighting", ""),
            "weather": cinematic.get("weather", ""),
            "camera": cinematic.get("camera", ""),
            "lens_suggestion": cinematic.get("lens_suggestion", ""),
            "movement": cinematic.get("movement", ""),
            "composition": cinematic.get("composition", ""),
            "palette": cinematic.get("palette", []),
            "film_stock_inspiration": cinematic.get("film_stock_inspiration", ""),
            "visual_motifs": cinematic.get("visual_motifs", []),
        },
        "director_notes": str(data.get("director_notes", ""))[:1000],
        "_meta": {"provider": result.provider_used, "model": result.model_used, "from_cache": result.from_cache},
    }
    return normalized
