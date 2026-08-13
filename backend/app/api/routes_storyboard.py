"""
Storyboard & ComfyUI API Routes.

Handles frame rendering, prompt synthesis, scene image persistence,
batch storyboarding, and live ComfyUI status queries.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import Project, Scene, Script, get_db
from app.models.schemas import GenerateFrameRequest, StoryboardFrameOut
from app.services.ai.comfyui_client import ComfyUIClient, get_comfyui_url

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["storyboard"])


def synthesize_default_prompt(project: Project, scene: Scene, style_preset: str = "cinematic") -> str:
    """Synthesize detailed cinematic prompt from project style and scene metadata."""
    project_style = f"{project.style_prompt}, " if project.style_prompt else ""
    cinematic = scene.cinematic_json or {}
    camera = f"{cinematic.get('camera')}, " if cinematic.get("camera") else ""
    lighting = f"{cinematic.get('lighting')} lighting, " if cinematic.get("lighting") else ""
    palette_list = cinematic.get("palette", [])
    palette_str = f", color palette {' & '.join(palette_list)}" if palette_list else ""
    action = scene.action_text.slice(0, 150) if hasattr(scene.action_text, 'slice') else scene.action_text[:150] if scene.action_text else scene.slugline

    return f"Cinematic 35mm film still of {action}. {project_style}{camera}{lighting}{style_preset} style{palette_str}, 8k highly detailed masterwork."


@router.get("/storyboard/comfyui/status")
async def comfyui_status() -> Dict[str, Any]:
    """Get live ComfyUI reachability, URL, latency, and GPU details."""
    client = ComfyUIClient()
    return await client.get_status()


@router.post("/projects/{project_id}/scenes/{scene_id}/generate-frame", response_model=StoryboardFrameOut)
async def generate_scene_frame(
    project_id: str,
    scene_id: str,
    req: GenerateFrameRequest,
    db: Session = Depends(get_db),
):
    """
    Generate or re-render a storyboard frame image for a scene using ComfyUI.
    Persists the generated image URL on the scene in SQLite.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if not scene:
        raise HTTPException(404, "Scene not found")

    prompt = req.prompt or synthesize_default_prompt(project, scene, req.style_preset)

    # Resolution from aspect ratio
    aspect = req.aspect_ratio or "169"
    if aspect == "239":
        width, height = 1216, 512
    elif aspect == "43":
        width, height = 896, 672
    else:
        width, height = 1024, 576

    client = ComfyUIClient()
    status = await client.get_status()

    if not status["reachable"]:
        raise HTTPException(
            503,
            f"ComfyUI server is not reachable at {client.base_url}. Please launch ComfyUI or test connection in Settings.",
        )

    try:
        res = await client.generate_image(
            project_id=project_id,
            scene_id=scene_id,
            prompt=prompt,
            negative_prompt=req.negative_prompt,
            width=width,
            height=height,
            steps=req.steps,
            cfg=req.cfg,
            seed=req.seed,
        )

        # Update scene record in SQLite DB
        scene.generated_image_url = res["image_url"]
        scene.generated_prompt = prompt
        db.commit()

        # Trigger automatic refresh of pitch deck & animatic video manifest
        try:
            from app.services.pitch_deck import save_pitch_deck_files
            from app.services.animatic import save_animatic_files
            save_pitch_deck_files(db, project)
            save_animatic_files(db, project)
        except Exception as ex:
            logger.warning(f"Failed to auto-update pitch deck/animatic after frame generation: {ex}")

        return StoryboardFrameOut(
            scene_id=scene_id,
            image_url=res["image_url"],
            prompt=prompt,
            seed=res["seed"],
            width=width,
            height=height,
            backend="comfyui",
        )
    except Exception as e:
        logger.error(f"Frame generation failed: {e}", exc_info=True)
        raise HTTPException(500, f"ComfyUI frame generation failed: {str(e)}")


@router.delete("/projects/{project_id}/scenes/{scene_id}/frame")
async def clear_scene_frame(project_id: str, scene_id: str, db: Session = Depends(get_db)):
    """Clear generated frame image for a scene."""
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if not scene:
        raise HTTPException(404, "Scene not found")

    scene.generated_image_url = None
    scene.generated_prompt = ""
    db.commit()
    return {"status": "cleared", "scene_id": scene_id}


# Pitch Deck Endpoints

@router.get("/projects/{project_id}/pitch-deck")
async def get_pitch_deck(project_id: str, db: Session = Depends(get_db)):
    """Fetch or build project pitch deck data and URLs."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    from app.services.pitch_deck import save_pitch_deck_files
    return save_pitch_deck_files(db, project)


@router.post("/projects/{project_id}/pitch-deck/generate")
async def generate_pitch_deck(project_id: str, db: Session = Depends(get_db)):
    """Force compile/regenerate project pitch deck slides and HTML presentation."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    from app.services.pitch_deck import save_pitch_deck_files
    return save_pitch_deck_files(db, project)


# Animatic Video Reel Endpoints

@router.get("/projects/{project_id}/animatic")
async def get_animatic(project_id: str, db: Session = Depends(get_db)):
    """Fetch or build animatic video reel manifest and URLs."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    from app.services.animatic import save_animatic_files
    return save_animatic_files(db, project)


@router.post("/projects/{project_id}/animatic/generate")
async def generate_animatic(project_id: str, db: Session = Depends(get_db)):
    """Force compile/regenerate animatic video reel manifest and player."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    from app.services.animatic import save_animatic_files
    return save_animatic_files(db, project)

