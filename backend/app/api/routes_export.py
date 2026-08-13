from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db import Project, get_db
from app.services.export import export_json, export_markdown, export_pdf, export_zip

router = APIRouter(prefix="/api/projects", tags=["export"])

_EXPORTERS = {
    "json": (export_json, "application/json"),
    "markdown": (export_markdown, "text/markdown"),
    "pdf": (export_pdf, "application/pdf"),
    "zip": (export_zip, "application/zip"),
}


@router.get("/{project_id}/export/{fmt}")
def export_project(project_id: str, fmt: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if fmt not in _EXPORTERS:
        raise HTTPException(400, f"Unknown export format '{fmt}'. Use one of: {list(_EXPORTERS)}")

    fn, media_type = _EXPORTERS[fmt]
    path = fn(db, project)
    return FileResponse(path, media_type=media_type, filename=path.name)
