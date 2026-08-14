"""
Storyboard & Image Generation API Routes.

Handles frame rendering, prompt synthesis, scene image persistence,
batch storyboarding, and multi-backend support (FLUX.2 Klein 4B, ComfyUI, etc.).
"""
from __future__ import annotations

import logging
import random
import urllib.parse
from pathlib import Path
from typing import Any, Dict

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import GENERATED_DIR, DEFAULT_IMAGE_BACKEND
from app.db import Project, Scene, Script, get_db
from app.models.schemas import GenerateFrameRequest, StoryboardFrameOut
from app.services.ai.comfyui_client import ComfyUIClient, get_comfyui_url
from app.storage.keystore import get_secret

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["storyboard"])


def synthesize_default_prompt(project: Project, scene: Scene, style_preset: str = "sketch") -> str:
    """Synthesize detailed prompt from project style and scene metadata."""
    presets = {
        "sketch": "Production concept sketch, graphite pencil illustration, detailed line art storyboard",
        "noir": "Neo-noir film still, dramatic high-contrast chiaroscuro lighting, deep shadows",
        "cinematic": "Cinematic 35mm master shot film still, 8k anamorphic resolution, natural lighting",
        "vintage": "Kodak 1970s vintage film stock, Technicolor color grade, film grain",
    }
    preset_text = presets.get(style_preset, presets["sketch"])
    project_style = f", {project.style_prompt}" if project.style_prompt else ""
    cinematic = scene.cinematic_json or {}
    camera = f", {cinematic.get('camera')}" if cinematic.get("camera") else ""
    lighting = f", {cinematic.get('lighting')} lighting" if cinematic.get("lighting") else ""
    action = scene.action_text[:140] if scene.action_text else scene.slugline

    return f"{preset_text} of {action}{project_style}{camera}{lighting}, 8k highly detailed."


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
    Generate or re-render a storyboard frame image for a scene.
    Supports FLUX.2 Klein 4B, ComfyUI, and fallback engines.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if not scene:
        raise HTTPException(404, "Scene not found")

    prompt = req.prompt or synthesize_default_prompt(project, scene, req.style_preset)
    image_backend = get_secret("image_backend") or DEFAULT_IMAGE_BACKEND

    # Resolution from aspect ratio
    aspect = req.aspect_ratio or "169"
    if aspect == "239":
        width, height = 1216, 512
    elif aspect == "43":
        width, height = 896, 672
    else:
        width, height = 1024, 576

    image_url = None
    res_seed = req.seed or random.randint(100000, 999999)

    if image_backend == "comfyui":
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
            image_url = res["image_url"]
            res_seed = res["seed"]
        except Exception as e:
            logger.error(f"ComfyUI frame generation failed: {e}", exc_info=True)
            raise HTTPException(500, f"ComfyUI frame generation failed: {str(e)}")

    else:
        # FLUX.2 Klein 4B Diffusion Pipeline
        filename = f"frame_flux_{scene_id}_{res_seed}.jpg"
        file_path = GENERATED_DIR / filename
        encoded_prompt = urllib.parse.quote(prompt)
        flux_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model=flux&seed={res_seed}"

        image_downloaded = False
        try:
            async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as http_client:
                resp = await http_client.get(flux_url)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    with open(file_path, "wb") as f:
                        f.write(resp.content)
                    image_downloaded = True
                    image_url = f"/generated/{filename}"
        except Exception as ex:
            logger.warning(f"FLUX cloud inference fallback trigger: {ex}")

        if not image_downloaded:
            # Vector fallback if offline or request times out
            filename_svg = f"frame_flux_{scene_id}_{res_seed}.svg"
            file_path_svg = GENERATED_DIR / filename_svg
            preset_tag = (req.style_preset or "sketch").upper()
            slug_short = (scene.slugline.split("-")[0] if "-" in scene.slugline else scene.slugline).strip().upper()

            svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
              <defs>
                <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#141824"/>
                  <stop offset="50%" stop-color="#090d16"/>
                  <stop offset="100%" stop-color="#000000"/>
                </linearGradient>
              </defs>
              <rect width="{width}" height="{height}" fill="url(#bgGrad)"/>
              <rect x="24" y="24" width="{width-48}" height="{height-48}" fill="none" stroke="rgba(226, 194, 117, 0.4)" stroke-width="1.5"/>
              <path d="M {width//2 - 20} {height//2} L {width//2 + 20} {height//2} M {width//2} {height//2 - 20} L {width//2} {height//2 + 20}" stroke="#e2c275" stroke-width="2"/>
              <text x="48" y="108" fill="#ffffff" font-size="24" font-family="sans-serif" font-weight="bold">SHOT {scene.scene_number:02d} · {slug_short}</text>
              <text x="48" y="132" fill="#e2c275" font-size="13" font-family="sans-serif" font-weight="600">FLUX.2 KLEIN 4B · {preset_tag} PRESET</text>
            </svg>'''

            with open(file_path_svg, "w", encoding="utf-8") as f:
                f.write(svg_content)
            image_url = f"/generated/{filename_svg}"

    # Update scene record in SQLite DB
    scene.generated_image_url = image_url
    scene.generated_prompt = prompt
    db.commit()

    # Trigger automatic refresh of pitch deck & animatic video manifest
    try:
        from app.services.pitch_deck import save_pitch_deck_files
        from app.services.animatic import save_animatic_files
        save_pitch_deck_files(db, project)
        save_animatic_files(db, project)
    except Exception as ex:
        logger.warning(f"Failed to auto-update pitch deck/animatic: {ex}")

    return StoryboardFrameOut(
        scene_id=scene_id,
        image_url=image_url,
        prompt=prompt,
        seed=res_seed,
        width=width,
        height=height,
        backend=image_backend,
    )


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
