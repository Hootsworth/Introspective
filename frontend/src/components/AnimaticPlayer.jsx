import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client";
import { Button, Pill } from "./ui";

function IconVideo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function AnimaticPlayer({ project, script, onRefresh }) {
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const imageCacheRef = useRef({});

  // Fetch animatic manifest
  useEffect(() => {
    if (project?.id) {
      setLoading(true);
      api
        .getAnimatic(project.id)
        .then((data) => setManifest(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [project?.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await api.generateAnimatic(project.id);
      setManifest(data);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to generate animatic:", err);
    } finally {
      setGenerating(false);
    }
  };

  const totalDuration = manifest?.total_duration_sec || 10;
  const shots = manifest?.shots || [];

  // Preload images into memory
  useEffect(() => {
    shots.forEach((shot) => {
      if (shot.image_url && !imageCacheRef.current[shot.image_url]) {
        const img = new Image();
        img.src = shot.image_url.startsWith("http") ? shot.image_url : `${api.base}${shot.image_url}`;
        imageCacheRef.current[shot.image_url] = img;
      }
    });
  }, [shots]);

  // Render canvas frame
  const drawFrame = useCallback(
    (time) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;

      // Find current shot based on time
      let activeIndex = 0;
      for (let i = 0; i < shots.length; i++) {
        if (time >= shots[i].start_time_sec && time <= shots[i].start_time_sec + shots[i].duration_sec) {
          activeIndex = i;
          break;
        }
      }
      setCurrentShotIndex(activeIndex);
      const shot = shots[activeIndex];

      if (!shot) {
        ctx.fillStyle = "#050811";
        ctx.fillRect(0, 0, w, h);
        return;
      }

      // Calculate progress within current shot (0.0 to 1.0)
      const shotProgress = Math.min(1.0, Math.max(0.0, (time - shot.start_time_sec) / (shot.duration_sec || 1)));

      ctx.save();
      ctx.fillStyle = "#050811";
      ctx.fillRect(0, 0, w, h);

      // Check if image exists in cache
      const img = shot.image_url ? imageCacheRef.current[shot.image_url] : null;

      if (img && img.complete && img.naturalWidth > 0) {
        // Ken Burns Pan/Zoom Animation Effect
        let scale = 1.0 + shotProgress * 0.12;
        let dx = 0;
        let dy = 0;

        if (shot.camera_motion === "zoom_out") {
          scale = 1.15 - shotProgress * 0.12;
        } else if (shot.camera_motion === "pan_right") {
          dx = -shotProgress * 40;
        } else if (shot.camera_motion === "pan_left") {
          dx = shotProgress * 40;
        } else if (shot.camera_motion === "pan_up") {
          dy = shotProgress * 30;
        }

        ctx.translate(w / 2 + dx, h / 2 + dy);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        // Flat Slate Graphic fallback
        const palette = shot.palette || ["#0f172a", "#1e293b", "#38bdf8"];
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, palette[0] || "#0f172a");
        grad.addColorStop(0.5, palette[1] || "#1e293b");
        grad.addColorStop(1, "#050811");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Rule of thirds grid
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(w / 3, 0);
        ctx.lineTo(w / 3, h);
        ctx.moveTo((w * 2) / 3, 0);
        ctx.lineTo((w * 2) / 3, h);
        ctx.moveTo(0, h / 3);
        ctx.lineTo(w, h / 3);
        ctx.moveTo(0, (h * 2) / 3);
        ctx.lineTo(w, (h * 2) / 3);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // Slate & Telemetry HUD Overlay
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(24, 24, 460, 80);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(24, 24, 460, 80);

      ctx.fillStyle = "#38bdf8";
      ctx.font = 'bold 18px "Bebas Neue", sans-serif';
      ctx.fillText(`SHOT ${String(shot.scene_number).padStart(2, "0")} · ${shot.slugline.toUpperCase()}`, 40, 54);

      ctx.fillStyle = "#94a3b8";
      ctx.font = '12px "Inter", sans-serif';
      ctx.fillText(`CAM: ${shot.camera_spec} | LENS: ${shot.lens_spec} | MOTION: ${shot.camera_motion.toUpperCase()}`, 40, 80);

      // Subtitle / Dialogue Bar
      if (shot.subtitle) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fillRect(60, h - 90, w - 120, 54);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
        ctx.strokeRect(60, h - 90, w - 120, 54);

        ctx.fillStyle = "#ffffff";
        ctx.font = '500 15px "Inter", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(shot.subtitle, w / 2, h - 58);
        ctx.textAlign = "left";
      }
    },
    [shots]
  );

  // Animation Loop
  const loop = useCallback(
    (now) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const delta = ((now - lastTimeRef.current) / 1000) * playbackSpeed;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        drawFrame(next);
        return next;
      });

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(loop);
      }
    },
    [isPlaying, playbackSpeed, totalDuration, drawFrame]
  );

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(loop);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, loop]);

  useEffect(() => {
    drawFrame(currentTime);
  }, [currentTime, drawFrame]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * totalDuration;
    setCurrentTime(newTime);
    drawFrame(newTime);
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>Loading Animatic Video Reel...</div>;
  }

  const activeShot = shots[currentShotIndex] || {};

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border-soft)",
        borderRadius: 12,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ color: "var(--accent-cyan)", display: "flex" }}>
            <IconVideo />
          </div>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>
              Storyboard Video Reel (Animatic) — {project.title}
            </h2>
            <p style={{ margin: "2px 0 0", color: "var(--text-dim)", fontSize: 13 }}>
              Sequenced storyboard reel with Ken Burns pan/zoom motion, shot subtitles, and timing synchronization.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {manifest?.html_url && (
            <Button
              ghost
              onClick={() => window.open(`${api.base}${manifest.html_url}`, "_blank")}
              style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
            >
              <IconExternal /> Open Video Reel
            </Button>
          )}
          <Button primary onClick={handleGenerate} disabled={generating} style={{ fontSize: 13 }}>
            {generating ? "Re-compiling Reel..." : "Re-compile Video Reel"}
          </Button>
        </div>
      </div>

      {/* HTML5 Canvas Player Stage */}
      <div
        style={{
          position: "relative",
          background: "#050811",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid var(--border-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          aspectRatio: "16/9",
          maxHeight: 520,
        }}
      >
        <canvas ref={canvasRef} width={1280} height={720} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>

      {/* Video Control Bar & Timeline Scrub */}
      <div
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-soft)",
          borderRadius: 10,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Scrub Bar */}
        <div
          onClick={handleScrub}
          style={{
            width: "100%",
            height: 6,
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: 3,
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "var(--accent-cyan)",
              width: `${(currentTime / totalDuration) * 100}%`,
              transition: "width 0.1s linear",
            }}
          />
        </div>

        {/* Transport Buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              primary
              onClick={togglePlay}
              style={{ fontSize: 13, minWidth: 110, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {isPlaying ? <IconPause /> : <IconPlay />} {isPlaying ? "Pause" : "Play Reel"}
            </Button>

            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-dim)" }}>
              {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Speed:</span>
            {[0.5, 1.0, 1.5, 2.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                style={{
                  background: playbackSpeed === spd ? "rgba(56, 189, 248, 0.15)" : "transparent",
                  color: playbackSpeed === spd ? "var(--accent-cyan)" : "var(--text-dim)",
                  border: "1px solid " + (playbackSpeed === spd ? "rgba(56, 189, 248, 0.4)" : "var(--border-soft)"),
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Shot Navigation Pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingTop: 4 }}>
          {shots.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentTime(s.start_time_sec);
                drawFrame(s.start_time_sec);
              }}
              style={{
                background: idx === currentShotIndex ? "rgba(56, 189, 248, 0.15)" : "var(--surface-2)",
                color: idx === currentShotIndex ? "var(--accent-cyan)" : "var(--text-dim)",
                border: "1px solid",
                borderColor: idx === currentShotIndex ? "var(--accent-cyan)" : "var(--border-soft)",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              Shot {s.scene_number} ({s.duration_sec}s)
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
