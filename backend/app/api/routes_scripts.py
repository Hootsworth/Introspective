from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db import Character, Project, Scene, Script, SessionLocal, get_db
from app.models.schemas import (AnalyzeRequest, ScriptDetailOut, ScriptOut,
                                 SceneOut)
from app.services.ai.orchestrator import AIOrchestrator
from app.services.character_extraction import extract_characters
from app.services.cinematic_analysis import analyze_scene
from app.services.parser import parse_screenplay
from app.storage.keystore import get_secret

router = APIRouter(prefix="/api", tags=["scripts"])


def _scene_to_out(s: Scene) -> SceneOut:
    return SceneOut(
        id=s.id, scene_number=s.scene_number, slugline=s.slugline, location=s.location,
        time_of_day=s.time_of_day, int_ext=s.int_ext, action_text=s.action_text,
        dialogue=s.dialogue_json or [], characters_present=s.characters_present or [],
        dominant_emotion=s.dominant_emotion, emotional_intensity=s.emotional_intensity,
        tension_score=s.tension_score, pacing_score=s.pacing_score,
        themes=s.themes or [], genre_tags=s.genre_tags or [],
        cinematic=s.cinematic_json or {}, director_notes=s.director_notes or "",
        generated_image_url=s.generated_image_url,
        analyzed=bool(s.analyzed),
    )


def _build_orchestrator(project: Project) -> AIOrchestrator:
    gemini_key = get_secret("gemini_api_key")
    openai_key = get_secret("openai_api_key")
    cloud_provider = "gemini" if (gemini_key and gemini_key.strip()) else "openai"
    return AIOrchestrator(
        local_model=get_secret("local_model") or "llama3.2",
        openai_model=get_secret("openai_model") or "gpt-4o-mini",
        gemini_model=get_secret("gemini_model") or "gemini-3.1-flash-lite",
        cloud_provider=cloud_provider,
    )


# ---------------------------------------------------------------------------
# Upload + parse
# ---------------------------------------------------------------------------
@router.post("/projects/{project_id}/scripts", response_model=ScriptDetailOut)
async def upload_script(project_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    raw_bytes = await file.read()
    try:
        raw_text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raw_text = raw_bytes.decode("latin-1")

    parsed = parse_screenplay(raw_text)

    script = Script(project_id=project.id, filename=file.filename or "screenplay.txt",
                     raw_text=raw_text, parsed_title=parsed.title)
    db.add(script)
    db.flush()  # get script.id before adding scenes

    for ps in parsed.scenes:
        scene = Scene(
            script_id=script.id,
            scene_number=ps.scene_number,
            slugline=ps.slugline,
            location=ps.location,
            time_of_day=ps.time_of_day,
            int_ext=ps.int_ext,
            action_text=ps.action_text,
            dialogue_json=[{"character": d.character, "line": d.line, "parenthetical": d.parenthetical}
                            for d in ps.dialogue],
            characters_present=ps.characters_present,
        )
        db.add(scene)

    # Character rollup across this script, merged into the project registry.
    extracted = extract_characters(parsed)
    existing = {c.name.upper(): c for c in project.characters}
    for ec in extracted:
        key = ec.canonical_name.upper()
        if key in existing:
            c = existing[key]
            c.dialogue_count += ec.dialogue_count
            existing_sn = set(c.scene_numbers or [])
            existing_al = set(c.aliases or [])
            c.scene_count = len(existing_sn | ec.scene_numbers)
            c.scene_numbers = sorted(existing_sn | ec.scene_numbers)
            c.aliases = sorted(existing_al | ec.aliases)
        else:
            c = Character(
                project_id=project.id, name=ec.canonical_name,
                aliases=sorted(ec.aliases), dialogue_count=ec.dialogue_count,
                scene_count=len(ec.scene_numbers), scene_numbers=sorted(ec.scene_numbers),
            )
            db.add(c)
            existing[key] = c

    db.commit()
    db.refresh(script)

    return ScriptDetailOut(
        id=script.id, project_id=script.project_id, filename=script.filename,
        parsed_title=script.parsed_title, created_at=script.created_at,
        scene_count=len(script.scenes), scenes=[_scene_to_out(s) for s in script.scenes],
    )


@router.get("/projects/{project_id}/scripts", response_model=list[ScriptOut])
def list_scripts(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return [ScriptOut(id=s.id, project_id=s.project_id, filename=s.filename,
                       parsed_title=s.parsed_title, created_at=s.created_at,
                       scene_count=len(s.scenes)) for s in project.scripts]


@router.get("/scripts/{script_id}", response_model=ScriptDetailOut)
def get_script(script_id: str, db: Session = Depends(get_db)):
    script = db.get(Script, script_id)
    if not script:
        raise HTTPException(404, "Script not found")
    return ScriptDetailOut(
        id=script.id, project_id=script.project_id, filename=script.filename,
        parsed_title=script.parsed_title, created_at=script.created_at,
        scene_count=len(script.scenes), scenes=[_scene_to_out(s) for s in script.scenes],
    )


@router.delete("/scripts/{script_id}")
def delete_script(script_id: str, db: Session = Depends(get_db)):
    script = db.get(Script, script_id)
    if not script:
        raise HTTPException(404, "Script not found")
    db.delete(script)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# AI analysis - single scene
# ---------------------------------------------------------------------------
@router.post("/scenes/{scene_id}/analyze", response_model=SceneOut)
async def analyze_single_scene(scene_id: str, payload: AnalyzeRequest, db: Session = Depends(get_db)):
    scene = db.get(Scene, scene_id)
    if not scene:
        raise HTTPException(404, "Scene not found")
    script = db.get(Script, scene.script_id)
    project = db.get(Project, script.project_id)

    if scene.analyzed and not payload.force:
        return _scene_to_out(scene)

    mode = payload.mode_override or project.ai_mode
    orchestrator = _build_orchestrator(project)
    try:
        result = await analyze_scene(db, scene, project.style_prompt, mode, orchestrator)
    except Exception as e:
        raise HTTPException(502, f"Analysis failed: {e}")

    scene.dominant_emotion = result["dominant_emotion"]
    scene.emotional_intensity = result["emotional_intensity"]
    scene.tension_score = result["tension_score"]
    scene.pacing_score = result["pacing_score"]
    scene.themes = result["themes"]
    scene.genre_tags = result["genre_tags"]
    scene.cinematic_json = result["cinematic"]
    scene.director_notes = result["director_notes"]
    scene.analyzed = 1
    db.commit()
    db.refresh(scene)
    return _scene_to_out(scene)


# ---------------------------------------------------------------------------
# AI analysis - whole script, streamed (one JSON line per scene as it
# completes) so the UI can show progress instead of one long spinner.
# ---------------------------------------------------------------------------
@router.post("/scripts/{script_id}/analyze-all")
async def analyze_all_scenes(script_id: str, payload: AnalyzeRequest, db: Session = Depends(get_db)):
    script = db.get(Script, script_id)
    if not script:
        raise HTTPException(404, "Script not found")
    project = db.get(Project, script.project_id)
    mode = payload.mode_override or project.ai_mode
    orchestrator = _build_orchestrator(project)

    scene_ids = [s.id for s in script.scenes]

    async def stream():
        with SessionLocal() as stream_db:
            for sid in scene_ids:
                scene = stream_db.get(Scene, sid)
                if not scene:
                    continue
                if scene.analyzed and not payload.force:
                    yield json.dumps({"scene_number": scene.scene_number, "status": "cached"}) + "\n"
                    continue
                try:
                    result = await analyze_scene(stream_db, scene, project.style_prompt, mode, orchestrator)
                    scene.dominant_emotion = result["dominant_emotion"]
                    scene.emotional_intensity = result["emotional_intensity"]
                    scene.tension_score = result["tension_score"]
                    scene.pacing_score = result["pacing_score"]
                    scene.themes = result["themes"]
                    scene.genre_tags = result["genre_tags"]
                    scene.cinematic_json = result["cinematic"]
                    scene.director_notes = result["director_notes"]
                    scene.analyzed = 1
                    stream_db.commit()
                    yield json.dumps({
                        "scene_number": scene.scene_number, "status": "done",
                        "dominant_emotion": scene.dominant_emotion,
                        "provider": result.get("_meta", {}).get("provider", "local"),
                    }) + "\n"
                except Exception as e:
                    yield json.dumps({"scene_number": scene.scene_number, "status": "error",
                                       "error": str(e)}) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")
