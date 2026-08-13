"""
Export a project (or a single script) to JSON / Markdown / PDF.

Image-heavy exports (storyboard package, mood board package, ZIP bundle)
are wired here as clean extension points but only assemble what already
exists in data/generated/<project_id>/ - they don't generate anything
themselves. That's the image-generation service's job (Phase 2).
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (PageBreak, Paragraph, SimpleDocTemplate,
                                 Spacer, Table, TableStyle)
from sqlalchemy.orm import Session

from app.config import EXPORTS_DIR, GENERATED_DIR
from app.db import Character, Project, Script


def project_to_dict(db: Session, project: Project) -> dict:
    scripts_out = []
    for script in project.scripts:
        scenes_out = []
        for scene in script.scenes:
            scenes_out.append({
                "scene_number": scene.scene_number,
                "slugline": scene.slugline,
                "location": scene.location,
                "time_of_day": scene.time_of_day,
                "int_ext": scene.int_ext,
                "action_text": scene.action_text,
                "dialogue": scene.dialogue_json,
                "characters_present": scene.characters_present,
                "dominant_emotion": scene.dominant_emotion,
                "emotional_intensity": scene.emotional_intensity,
                "tension_score": scene.tension_score,
                "pacing_score": scene.pacing_score,
                "themes": scene.themes,
                "genre_tags": scene.genre_tags,
                "cinematic": scene.cinematic_json,
                "director_notes": scene.director_notes,
            })
        scripts_out.append({
            "filename": script.filename,
            "title": script.parsed_title,
            "scenes": scenes_out,
        })

    characters_out = [{
        "name": c.name,
        "aliases": c.aliases,
        "dialogue_count": c.dialogue_count,
        "scene_count": c.scene_count,
        "scene_numbers": c.scene_numbers,
        "description": c.description,
    } for c in project.characters]

    return {
        "project": {
            "title": project.title,
            "style_prompt": project.style_prompt,
            "ai_mode": project.ai_mode,
        },
        "scripts": scripts_out,
        "characters": characters_out,
    }


def export_json(db: Session, project: Project) -> Path:
    data = project_to_dict(db, project)
    out_dir = EXPORTS_DIR / project.id
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{project.title.replace(' ', '_')}.json"
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    return path


def export_markdown(db: Session, project: Project) -> Path:
    data = project_to_dict(db, project)
    lines = [f"# {data['project']['title']}", ""]
    if data["project"]["style_prompt"]:
        lines.append(f"*Visual style: {data['project']['style_prompt']}*\n")

    if data["characters"]:
        lines.append("## Characters\n")
        for c in data["characters"]:
            lines.append(f"- **{c['name']}** — {c['dialogue_count']} lines across "
                          f"{c['scene_count']} scenes")
        lines.append("")

    for script in data["scripts"]:
        lines.append(f"## Script: {script['title']}\n")
        for scene in script["scenes"]:
            lines.append(f"### Scene {scene['scene_number']} — {scene['slugline']}\n")
            lines.append(f"**Location:** {scene['location']}  **Time:** {scene['time_of_day']}\n")
            if scene["dominant_emotion"]:
                lines.append(f"**Emotion:** {scene['dominant_emotion']} "
                              f"(intensity {scene['emotional_intensity']})  "
                              f"**Tension:** {scene['tension_score']}  "
                              f"**Pacing:** {scene['pacing_score']}\n")
            if scene["themes"]:
                lines.append(f"**Themes:** {', '.join(scene['themes'])}\n")
            cine = scene.get("cinematic") or {}
            if cine:
                lines.append("**Cinematic notes:** " + ", ".join(
                    f"{k}: {v}" for k, v in cine.items()
                    if v and k not in ("scene", "location", "time")))
                lines.append("")
            if scene["director_notes"]:
                lines.append(f"> {scene['director_notes']}\n")
            lines.append(f"**Action:** {scene['action_text'][:400]}\n")
            lines.append("---\n")

    out_dir = EXPORTS_DIR / project.id
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{project.title.replace(' ', '_')}.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def export_pdf(db: Session, project: Project) -> Path:
    out_dir = EXPORTS_DIR / project.id
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{project.title.replace(' ', '_')}.pdf"

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("S2VTitle", parent=styles["Title"], fontSize=26, spaceAfter=6)
    h2 = ParagraphStyle("S2VH2", parent=styles["Heading2"], spaceBefore=14, spaceAfter=6)
    body = ParagraphStyle("S2VBody", parent=styles["BodyText"], fontSize=10, leading=14)
    meta = ParagraphStyle("S2VMeta", parent=styles["BodyText"], fontSize=9, textColor=colors.grey)

    doc = SimpleDocTemplate(str(path), pagesize=LETTER,
                             topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    story = [Paragraph(project.title, title_style)]
    if project.style_prompt:
        story.append(Paragraph(f"Visual style: {project.style_prompt}", meta))
    story.append(Spacer(1, 0.2 * inch))

    if project.characters:
        story.append(Paragraph("Characters", h2))
        rows = [["Name", "Lines", "Scenes"]]
        for c in project.characters:
            rows.append([c.name, str(c.dialogue_count), str(c.scene_count)])
        table = Table(rows, colWidths=[2.5 * inch, 1.5 * inch, 1.5 * inch])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d1d1f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d2d2d7")),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
        ]))
        story.append(table)

    for script in project.scripts:
        story.append(PageBreak())
        story.append(Paragraph(f"Script: {script.parsed_title}", title_style))
        for scene in script.scenes:
            story.append(Paragraph(f"Scene {scene.scene_number} — {scene.slugline}", h2))
            story.append(Paragraph(
                f"Location: {scene.location} · Time: {scene.time_of_day}", meta))
            if scene.dominant_emotion:
                story.append(Paragraph(
                    f"Emotion: {scene.dominant_emotion} · Tension: {scene.tension_score} · "
                    f"Pacing: {scene.pacing_score}", meta))
            if scene.director_notes:
                story.append(Spacer(1, 0.05 * inch))
                story.append(Paragraph(f"<i>{scene.director_notes}</i>", body))
            story.append(Spacer(1, 0.05 * inch))
            story.append(Paragraph(scene.action_text[:1200].replace("\n", "<br/>"), body))
            story.append(Spacer(1, 0.15 * inch))

    doc.build(story)
    return path


def export_zip(db: Session, project: Project) -> Path:
    """
    Bundles JSON + Markdown + PDF + anything already generated under
    data/generated/<project_id>/ (mood boards, storyboards, character
    sheets once Phase 2 image generation is wired in).
    """
    json_path = export_json(db, project)
    md_path = export_markdown(db, project)
    pdf_path = export_pdf(db, project)

    out_dir = EXPORTS_DIR / project.id
    zip_path = out_dir / f"{project.title.replace(' ', '_')}_package.zip"

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in (json_path, md_path, pdf_path):
            zf.write(p, arcname=p.name)

        gen_dir = GENERATED_DIR / project.id
        if gen_dir.exists():
            for f in gen_dir.rglob("*"):
                if f.is_file():
                    zf.write(f, arcname=f"generated/{f.relative_to(gen_dir)}")

    return zip_path
