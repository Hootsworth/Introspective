from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db import Character, Project, ProjectNote, Scene, Script, get_db
from app.models.schemas import NoteIn, NoteOut, SceneOut, SceneUpdate, SearchResult
from app.api.routes_scripts import _scene_to_out

router = APIRouter(tags=["workspace"])


@router.patch("/api/scenes/{scene_id}", response_model=SceneOut)
def update_scene(scene_id: str, payload: SceneUpdate, db: Session = Depends(get_db)):
    scene = db.get(Scene, scene_id)
    if not scene:
        raise HTTPException(404, "Scene not found")
    if payload.slugline is not None:
        scene.slugline = payload.slugline
    if payload.action_text is not None:
        scene.action_text = payload.action_text
    if payload.dialogue is not None:
        scene.dialogue_json = [line.model_dump() for line in payload.dialogue]
    if payload.director_notes is not None:
        scene.director_notes = payload.director_notes
    db.commit()
    db.refresh(scene)
    return _scene_to_out(scene)


@router.get("/api/projects/{project_id}/notes", response_model=list[NoteOut])
def list_notes(project_id: str, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    return db.query(ProjectNote).filter(ProjectNote.project_id == project_id).order_by(ProjectNote.updated_at.desc()).all()


@router.post("/api/projects/{project_id}/notes", response_model=NoteOut)
def create_note(project_id: str, payload: NoteIn, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    note = ProjectNote(project_id=project_id, **payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.patch("/api/notes/{note_id}", response_model=NoteOut)
def update_note(note_id: str, payload: NoteIn, db: Session = Depends(get_db)):
    note = db.get(ProjectNote, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    for key, value in payload.model_dump().items():
        setattr(note, key, value)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/api/notes/{note_id}")
def delete_note(note_id: str, db: Session = Depends(get_db)):
    note = db.get(ProjectNote, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    db.delete(note)
    db.commit()
    return {"ok": True}


@router.get("/api/projects/{project_id}/search", response_model=list[SearchResult])
def search_project(project_id: str, q: str = Query(min_length=1), db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    term = f"%{q.strip()}%"
    results: list[SearchResult] = []
    for script in db.query(Script).filter(Script.project_id == project_id).all():
        if q.lower() in script.filename.lower() or q.lower() in (script.parsed_title or "").lower():
            results.append(SearchResult(kind="script", id=script.id, title=script.parsed_title or script.filename, detail=script.filename, url=f"/projects/{project_id}/script"))
        scenes = db.query(Scene).filter(Scene.script_id == script.id).filter(or_(Scene.slugline.ilike(term), Scene.action_text.ilike(term), Scene.director_notes.ilike(term))).all()
        for scene in scenes:
            results.append(SearchResult(kind="scene", id=scene.id, title=f"Shot {scene.scene_number:02d} · {scene.slugline}", detail=scene.action_text[:120] if scene.action_text else "", url=f"/projects/{project_id}/scenes"))
    for character in db.query(Character).filter(Character.project_id == project_id).filter(or_(Character.name.ilike(term))).all():
        results.append(SearchResult(kind="character", id=character.id, title=character.name, detail=f"{character.dialogue_count} dialogue lines", url=f"/projects/{project_id}/characters"))
    for note in db.query(ProjectNote).filter(ProjectNote.project_id == project_id).filter(or_(ProjectNote.title.ilike(term), ProjectNote.body.ilike(term))).all():
        results.append(SearchResult(kind="note", id=note.id, title=note.title or "Working note", detail=note.body[:120], url=f"/projects/{project_id}/notes"))
    return results[:50]
