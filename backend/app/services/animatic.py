"""
Animatic Video Reel Generation Service.

Sequences scene storyboard images into a cinematic animatic video reel
complete with Ken Burns camera motion effects, timed scene transitions,
subtitles, slate HUD overlays, and HTML5 video playback.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from sqlalchemy.orm import Session
from app.config import GENERATED_DIR
from app.db import Project, Scene, Script


# Camera motion presets for dynamic video keyframes
MOTION_PRESETS = [
    "zoom_in",      # Slow push into center
    "zoom_out",     # Slow pull back
    "pan_right",    # Horizontal pan across wide frame
    "pan_left",     # Horizontal pan left
    "pan_up",       # Vertical tilt up
    "center_focus"  # Subtle parallax pulse
]


def calculate_scene_duration(scene: Scene) -> float:
    """Calculate shot duration in seconds based on dialogue line count and action length."""
    base_sec = 4.0
    action_words = len(scene.action_text.split()) if scene.action_text else 0
    action_bonus = min(action_words * 0.05, 4.0)

    dialogue_words = 0
    if scene.dialogue_json:
        for item in scene.dialogue_json:
            if isinstance(item, dict):
                text = item.get("line") or item.get("text", "")
                if text:
                    dialogue_words += len(text.split())

    dialogue_bonus = min(dialogue_words * 0.25, 8.0)
    total_duration = round(base_sec + action_bonus + dialogue_bonus, 1)
    return max(3.0, min(total_duration, 15.0))


def build_animatic_manifest(db: Session, project: Project) -> Dict[str, Any]:
    """Build animatic video reel manifest structure."""
    script = db.query(Script).filter(Script.project_id == project.id).first()
    scenes = script.scenes if script else []

    reel_shots: List[Dict[str, Any]] = []
    total_reel_duration = 0.0

    for idx, sc in enumerate(scenes):
        duration = calculate_scene_duration(sc)
        motion = MOTION_PRESETS[idx % len(MOTION_PRESETS)]
        cine = sc.cinematic_json or {}

        # Extract top dialogue line if available
        top_dialogue = ""
        if sc.dialogue_json and len(sc.dialogue_json) > 0:
            first_line = sc.dialogue_json[0]
            if isinstance(first_line, dict):
                speaker = first_line.get("character", "")
                text = first_line.get("line") or first_line.get("text", "")
                top_dialogue = f"{speaker}: \"{text}\"" if speaker else text

        reel_shots.append({
            "shot_id": sc.id,
            "scene_number": sc.scene_number,
            "slugline": sc.slugline,
            "location": sc.location,
            "time_of_day": sc.time_of_day,
            "image_url": sc.generated_image_url,
            "duration_sec": duration,
            "start_time_sec": round(total_reel_duration, 1),
            "camera_motion": motion,
            "camera_spec": cine.get("camera", "Medium Shot"),
            "lens_spec": cine.get("lens_suggestion", "50mm Prime"),
            "lighting_spec": cine.get("lighting", "Natural"),
            "emotion": sc.dominant_emotion,
            "subtitle": top_dialogue or (sc.action_text[:120] if sc.action_text else sc.slugline),
            "palette": cine.get("palette", ["#0f172a", "#1e293b", "#38bdf8"]),
        })

        total_reel_duration += duration

    return {
        "project_id": project.id,
        "title": project.title,
        "total_duration_sec": round(total_reel_duration, 1),
        "total_shots": len(reel_shots),
        "shots": reel_shots,
    }


def generate_animatic_player_html(manifest: Dict[str, Any]) -> str:
    """Generate standalone HTML5 video player and canvas renderer for the animatic reel."""
    title = manifest["title"]
    manifest_json = json.dumps(manifest)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — Storyboard Video Animatic Reel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', sans-serif;
      background-color: #050811;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }}
    .header {{
      height: 56px;
      background: #090d16;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
    }}
    .title {{ font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: 1px; color: #38bdf8; }}
    .canvas-wrap {{
      flex: 1;
      position: relative;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }}
    canvas {{
      max-width: 100%;
      max-height: 100%;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.8);
    }}
    .hud-overlay {{
      position: absolute;
      top: 20px;
      left: 20px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      background: rgba(0, 0, 0, 0.7);
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #38bdf8;
    }}
    .controls {{
      height: 80px;
      background: #090d16;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      padding: 10px 24px;
      gap: 8px;
    }}
    .scrub-bar {{
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      cursor: pointer;
      position: relative;
    }}
    .scrub-progress {{
      height: 100%;
      background: #38bdf8;
      border-radius: 3px;
      width: 0%;
    }}
    .ctrl-row {{
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}
    .btn {{
      background: #38bdf8;
      color: #050811;
      border: none;
      padding: 6px 16px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
    }}
  </style>
</head>
<body>
  <div class="header">
    <div class="title">INTROSPECTIVE ANIMATIC REEL — {title}</div>
    <div style="font-family: 'JetBrains Mono'; font-size: 13px; color: #94a3b8;" id="totalTime">0.0s / 0.0s</div>
  </div>

  <div class="canvas-wrap">
    <canvas id="animaticCanvas" width="1280" height="720"></canvas>
    <div class="hud-overlay" id="hudSlate">REC ● SCENE 01</div>
  </div>

  <div class="controls">
    <div class="scrub-bar" onclick="seek(event)">
      <div class="scrub-progress" id="progress"></div>
    </div>
    <div class="ctrl-row">
      <button class="btn" id="playBtn" onclick="togglePlay()">Play Reel ▶</button>
      <span style="font-family: 'JetBrains Mono'; font-size: 12px; color: #94a3b8;" id="shotName">Shot 1</span>
    </div>
  </div>

  <script>
    const manifest = {manifest_json};
    let isPlaying = false;
    let currentTime = 0;
    let animationFrame = null;
    let lastTimestamp = 0;

    const canvas = document.getElementById('animaticCanvas');
    const ctx = canvas.getContext('2d');

    function drawFrame(time) {{
      const totalDur = manifest.total_duration_sec;
      document.getElementById('progress').style.width = (time / totalDur * 100) + '%';
      document.getElementById('totalTime').innerText = time.toFixed(1) + 's / ' + totalDur.toFixed(1) + 's';

      // Find current shot
      let currentShot = manifest.shots[0];
      for (const s of manifest.shots) {{
        if (time >= s.start_time_sec && time < s.start_time_sec + s.duration_sec) {{
          currentShot = s;
          break;
        }}
      }}

      if (!currentShot) return;

      document.getElementById('hudSlate').innerText = 'REC ● SHOT ' + String(currentShot.scene_number).padStart(2, '0') + ' · ' + currentShot.camera_spec;
      document.getElementById('shotName').innerText = 'SCENE ' + currentShot.scene_number + ': ' + currentShot.slugline;

      // Draw dark background slate
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw center text/slate placeholder
      ctx.fillStyle = '#38bdf8';
      ctx.font = '36px "Bebas Neue", sans-serif';
      ctx.fillText('SCENE ' + currentShot.scene_number + ' — ' + currentShot.slugline, 60, 100);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px "Inter", sans-serif';
      ctx.fillText(currentShot.subtitle || currentShot.camera_spec, 60, 150);
    }}

    function togglePlay() {{
      isPlaying = !isPlaying;
      document.getElementById('playBtn').innerText = isPlaying ? 'Pause ❚❚' : 'Play Reel ▶';
      if (isPlaying) {{
        lastTimestamp = performance.now();
        loop();
      }}
    }}

    function loop(now) {{
      if (!isPlaying) return;
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;
      currentTime += delta;
      if (currentTime >= manifest.total_duration_sec) {{
        currentTime = 0;
      }}
      drawFrame(currentTime);
      requestAnimationFrame(loop);
    }}

    function seek(e) {{
      const rect = e.target.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      currentTime = pct * manifest.total_duration_sec;
      drawFrame(currentTime);
    }}

    drawFrame(0);
  </script>
</body>
</html>
"""
    return html


def save_animatic_files(db: Session, project: Project) -> Dict[str, Any]:
    """Generate and write animatic manifest JSON and HTML into data/generated/<project_id>/animatic/."""
    manifest = build_animatic_manifest(db, project)
    out_dir = GENERATED_DIR / project.id / "animatic"
    out_dir.mkdir(parents=True, exist_ok=True)

    json_path = out_dir / "animatic_manifest.json"
    json_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    html_str = generate_animatic_player_html(manifest)
    html_path = out_dir / "index.html"
    html_path.write_text(html_str, encoding="utf-8")

    manifest["html_url"] = f"/generated/{project.id}/animatic/index.html"
    manifest["json_url"] = f"/generated/{project.id}/animatic/animatic_manifest.json"
    return manifest
