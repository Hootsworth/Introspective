from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import Project, get_db
from app.models.schemas import CharacterOut

router = APIRouter(prefix="/api/projects", tags=["characters"])


@router.get("/{project_id}/characters", response_model=list[CharacterOut])
def list_characters(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    chars = sorted(project.characters, key=lambda c: c.dialogue_count, reverse=True)
    return [CharacterOut.model_validate(c) for c in chars]
