"""
Pitch Deck Generation Service.

Assembles structured presentation slides (JSON + standalone HTML deck)
explaining the movie, visual style, character gallery, and scene-by-scene
storyboard breakdown.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from sqlalchemy.orm import Session
from app.config import GENERATED_DIR
from app.db import Project, Scene, Script, Character


def build_pitch_deck_data(db: Session, project: Project) -> Dict[str, Any]:
    """Compile structured JSON representation of the movie pitch deck."""
    script = db.query(Script).filter(Script.project_id == project.id).first()
    scenes = script.scenes if script else []
    characters = project.characters or []

    # Collect project-wide color palette
    all_palettes: List[str] = []
    for sc in scenes:
        if sc.cinematic_json and "palette" in sc.cinematic_json:
            for color in sc.cinematic_json["palette"]:
                if color and color not in all_palettes:
                    all_palettes.append(color)

    # Title slide metadata
    total_scenes = len(scenes)
    total_characters = len(characters)
    dominant_emotions = list(set([s.dominant_emotion for s in scenes if s.dominant_emotion]))

    slides = []

    # Slide 1: Title & Vision Overview
    slides.append({
        "type": "title",
        "title": project.title,
        "subtitle": "Cinematic Pre-Production & Visual Pitch Deck",
        "style_prompt": project.style_prompt or "Cinematic 35mm film aesthetic",
        "stats": {
            "total_scenes": total_scenes,
            "total_characters": total_characters,
            "emotions": dominant_emotions[:5],
        },
        "color_palette": all_palettes[:6] or ["#0f172a", "#1e293b", "#38bdf8", "#0284c7"],
    })

    # Slide 2: Visual Vision & Director's Intent
    slides.append({
        "type": "vision",
        "title": "Director's Visual Vision",
        "summary": (
            f"A visually striking narrative rendered in '{project.style_prompt or 'Cinematic 35mm'}' style. "
            f"Encompassing {total_scenes} distinct scenes across dynamic emotional arcs."
        ),
        "palette": all_palettes[:8] or ["#0f172a", "#1e293b", "#38bdf8", "#0284c7", "#f59e0b"],
        "key_motifs": list(set([
            sc.cinematic_json.get("lighting")
            for sc in scenes
            if sc.cinematic_json and sc.cinematic_json.get("lighting")
        ]))[:5],
    })

    # Slide 3..N: Scene Breakdown Slides (one per scene)
    for sc in scenes:
        cine = sc.cinematic_json or {}
        slides.append({
            "type": "scene",
            "scene_number": sc.scene_number,
            "slugline": sc.slugline,
            "location": sc.location,
            "time_of_day": sc.time_of_day,
            "image_url": sc.generated_image_url,
            "prompt": sc.generated_prompt,
            "emotion": sc.dominant_emotion,
            "tension": sc.tension_score,
            "pacing": sc.pacing_score,
            "camera": cine.get("camera", "Medium Shot"),
            "lens": cine.get("lens_suggestion", "50mm Prime"),
            "movement": cine.get("movement", "Static"),
            "lighting": cine.get("lighting", "Natural Ambient"),
            "palette": cine.get("palette", []),
            "action_text": (sc.action_text[:300] + "...") if sc.action_text and len(sc.action_text) > 300 else sc.action_text,
            "director_notes": sc.director_notes,
            "characters_present": sc.characters_present or [],
        })

    # Slide N+1: Character Gallery
    char_list = []
    for c in characters:
        char_list.append({
            "name": c.name,
            "lines": c.dialogue_count,
            "scenes_count": c.scene_count,
            "description": c.description or "Key character",
        })

    slides.append({
        "type": "characters",
        "title": "Character Roster & Dynamics",
        "characters": char_list,
    })

    # Slide N+2: Closing / Production Summary
    slides.append({
        "type": "closing",
        "title": "Production Outlook & Package",
        "summary": "Full storyboard sequence, shot list, and character relationship graph finalized.",
        "project_title": project.title,
    })

    return {
        "project_id": project.id,
        "title": project.title,
        "total_slides": len(slides),
        "slides": slides,
    }


def generate_standalone_html_deck(deck_data: Dict[str, Any]) -> str:
    """Generate a sleek, responsive HTML/CSS pitch deck presentation."""
    title = deck_data["title"]
    slides_json = json.dumps(deck_data["slides"])

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — Movie Pitch Deck</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg: #090d16;
      --card-bg: #131b2e;
      --accent: #38bdf8;
      --accent-amber: #f59e0b;
      --text: #f8fafc;
      --text-dim: #94a3b8;
      --border: rgba(255,255,255,0.1);
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', sans-serif;
      background-color: var(--bg);
      color: var(--text);
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }}
    .deck-container {{
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
    }}
    .slide-viewport {{
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      position: relative;
    }}
    .slide-card {{
      width: 100%;
      max-width: 1200px;
      height: 80vh;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 40px;
      display: none;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      animation: fadeIn 0.4s ease;
      overflow-y: auto;
    }}
    .slide-card.active {{ display: flex; }}
    @keyframes fadeIn {{
      from {{ opacity: 0; transform: scale(0.98); }}
      to {{ opacity: 1; transform: scale(1); }}
    }}
    h1, h2 {{ font-family: 'Bebas Neue', sans-serif; letter-spacing: 2px; }}
    .controls {{
      height: 70px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(10px);
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 40px;
    }}
    .btn {{
      background: var(--accent);
      color: #090d16;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }}
    .btn:hover {{ opacity: 0.9; transform: translateY(-1px); }}
    .btn:disabled {{ opacity: 0.4; cursor: not-allowed; transform: none; }}
    .slide-num {{ font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--text-dim); }}
    .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 30px; height: 100%; }}
    .frame-img {{ width: 100%; height: 100%; max-height: 420px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border); }}
    .pill {{ display: inline-block; padding: 4px 12px; border-radius: 20px; background: rgba(56, 189, 248, 0.15); color: var(--accent); font-size: 12px; font-weight: 600; }}
  </style>
</head>
<body>
  <div class="deck-container">
    <div class="slide-viewport" id="viewport"></div>
    <div class="controls">
      <button class="btn" id="prevBtn" onclick="changeSlide(-1)">◀ Previous</button>
      <span class="slide-num" id="slideNum">Slide 1</span>
      <button class="btn" id="nextBtn" onclick="changeSlide(1)">Next ▶</button>
    </div>
  </div>

  <script>
    const slides = {slides_json};
    let currentIndex = 0;

    function renderSlides() {{
      const vp = document.getElementById("viewport");
      vp.innerHTML = slides.map((s, idx) => {{
        const active = idx === 0 ? "active" : "";
        if (s.type === "title") {{
          return `<div class="slide-card ${{active}}" style="justify-content: center; text-align: center;">
            <div class="pill" style="align-self: center; margin-bottom: 20px;">INTROSPECTIVE PITCH DECK</div>
            <h1 style="font-size: 72px; color: var(--accent); margin-bottom: 10px;">${{s.title}}</h1>
            <p style="font-size: 24px; color: var(--text-dim); margin-bottom: 30px;">${{s.subtitle}}</p>
            <p style="font-size: 16px; color: var(--accent-amber);">Visual Style: ${{s.style_prompt}}</p>
          </div>`;
        }}
        if (s.type === "scene") {{
          const imgHtml = s.image_url 
            ? `<img class="frame-img" src="${{s.image_url}}" alt="Scene ${{s.scene_number}}">`
            : `<div style="width: 100%; height: 350px; background: #090d16; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--text-dim); border: 1px solid var(--border);">Scene ${{s.scene_number}} Frame Slate</div>`;
          
          return `<div class="slide-card ${{active}}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2>SCENE ${{String(s.scene_number).padStart(2, '0')}} · ${{s.slugline}}</h2>
              <span class="pill">${{s.emotion || "Cinematic"}} (Tension: ${{s.tension || 5}}/10)</span>
            </div>
            <div class="grid-2">
              <div>
                ${{imgHtml}}
                <div style="margin-top: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-dim);">
                  📷 ${{s.camera}} | 🔍 ${{s.lens}} | 🎬 ${{s.movement}} | 💡 ${{s.lighting}}
                </div>
              </div>
              <div style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h3 style="font-size: 16px; margin-bottom: 10px; color: var(--accent);">Action Narrative</h3>
                  <p style="font-size: 14px; line-height: 1.6; color: var(--text-dim);">${{s.action_text || "No action text available."}}</p>
                </div>
                ${{s.director_notes ? `<div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid var(--accent-amber); padding: 12px; border-radius: 6px; font-style: italic; font-size: 13px;">Director Notes: ${{s.director_notes}}</div>` : ""}}
              </div>
            </div>
          </div>`;
        }}
        return `<div class="slide-card ${{active}}" style="justify-content: center; text-align: center;">
          <h1 style="font-size: 48px; color: var(--accent); margin-bottom: 20px;">${{s.title}}</h1>
          <p style="font-size: 18px; color: var(--text-dim);">${{s.summary || ""}}</p>
        </div>`;
      }}).join("");
      updateNav();
    }}

    function changeSlide(dir) {{
      const cards = document.querySelectorAll(".slide-card");
      cards[currentIndex].classList.remove("active");
      currentIndex = Math.max(0, Math.min(slides.length - 1, currentIndex + dir));
      cards[currentIndex].classList.add("active");
      updateNav();
    }}

    function updateNav() {{
      document.getElementById("slideNum").innerText = `Slide ${{currentIndex + 1}} of ${{slides.length}}`;
      document.getElementById("prevBtn").disabled = currentIndex === 0;
      document.getElementById("nextBtn").disabled = currentIndex === slides.length - 1;
    }}

    document.addEventListener("keydown", (e) => {{
      if (e.key === "ArrowLeft") changeSlide(-1);
      if (e.key === "ArrowRight") changeSlide(1);
    }});

    renderSlides();
  </script>
</body>
</html>
"""
    return html


def save_pitch_deck_files(db: Session, project: Project) -> Dict[str, Any]:
    """Generate and write pitch deck JSON and HTML into data/generated/<project_id>/pitch_deck/."""
    deck_data = build_pitch_deck_data(db, project)
    out_dir = GENERATED_DIR / project.id / "pitch_deck"
    out_dir.mkdir(parents=True, exist_ok=True)

    json_path = out_dir / "pitch_deck.json"
    json_path.write_text(json.dumps(deck_data, indent=2), encoding="utf-8")

    html_str = generate_standalone_html_deck(deck_data)
    html_path = out_dir / "index.html"
    html_path.write_text(html_str, encoding="utf-8")

    deck_data["html_url"] = f"/generated/{project.id}/pitch_deck/index.html"
    deck_data["json_url"] = f"/generated/{project.id}/pitch_deck/pitch_deck.json"
    return deck_data
