import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../api/client";
import PitchDeckViewer from "../components/PitchDeckViewer";
import AnimaticPlayer from "../components/AnimaticPlayer";
import { Button, Pill } from "../components/ui";
import styles from "./Storyboard.module.css";

function parseColor(colorStr) {
  if (!colorStr) return "#e2c275";
  colorStr = colorStr.trim();
  if (colorStr.startsWith("#")) return colorStr;
  if (/^[0-9a-fA-F]{3,6}$/.test(colorStr)) return `#${colorStr}`;
  const knownColors = {
    red: "#ef4444",
    blue: "#e2c275",
    green: "#10b981",
    yellow: "#eab308",
    amber: "#e2c275",
    gold: "#e2c275",
    cyan: "#e2c275",
    teal: "#e2c275",
    purple: "#a855f7",
    orange: "#f97316",
    black: "#121212",
    dark: "#0a0a0a",
    shadow: "#262626",
    slate: "#333333",
    gray: "#64748b",
    grey: "#64748b",
    white: "#f8fafc",
    warm: "#e2c275",
    cold: "#e2c275",
    neon: "#10b981",
  };
  const lower = colorStr.toLowerCase();
  for (const [key, hex] of Object.entries(knownColors)) {
    if (lower.includes(key)) return hex;
  }
  return "#e2c275";
}

function SceneFrameArtwork({ scene, generatedFrameUrl, isGenerating, stylePreset = "sketch", aspectRatio }) {
  const imageUrl = generatedFrameUrl || scene.generated_image_url;

  if (imageUrl) {
    const fullUrl = imageUrl.startsWith("http") ? imageUrl : `${api.base}${imageUrl}`;
    return (
      <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
        <img
          src={fullUrl}
          alt={`Storyboard frame for scene ${scene.scene_number}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        {/* Rule of Thirds Grid Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background:
              "linear-gradient(to right, transparent 33%, rgba(255,255,255,0.05) 33%, rgba(255,255,255,0.05) 34%, transparent 34%, transparent 66%, rgba(255,255,255,0.05) 66%, rgba(255,255,255,0.05) 67%, transparent 67%), linear-gradient(to bottom, transparent 33%, rgba(255,255,255,0.05) 33%, rgba(255,255,255,0.05) 34%, transparent 34%, transparent 66%, rgba(255,255,255,0.05) 66%, rgba(255,255,255,0.05) 67%, transparent 67%)",
          }}
        />
        {/* Telemetry HUD */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            right: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: "rgba(255, 255, 255, 0.9)",
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            padding: "4px 10px",
            borderRadius: 4,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <span>
            SHOT {String(scene.scene_number).padStart(2, "0")} · {scene.cinematic?.camera || "35mm"}
          </span>
          <span>{scene.cinematic?.lens_suggestion || "50mm"}</span>
        </div>
      </div>
    );
  }

  const presetLabel = {
    sketch: "PRODUCTION CONCEPT SKETCH",
    noir: "NEO NOIR CHIAROSCURO",
    cinematic: "CINEMATIC 35MM",
    vintage: "KODAK VINTAGE 70S",
  }[stylePreset] || "PRODUCTION CONCEPT SKETCH";

  const accentStroke = {
    sketch: "#e2c275",
    noir: "#f59e0b",
    cinematic: "#38bdf8",
    vintage: "#d97706",
  }[stylePreset] || "#e2c275";

  // Dynamic Slate Stage adapting to stylePreset
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#000000" }}>
      <svg
        viewBox="0 0 800 450"
        style={{ width: "100%", height: "100%", display: "block" }}
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="800" height="450" fill="#000000" />

        {/* Dynamic Preset Overlay Elements */}
        {stylePreset === "sketch" && (
          <g stroke="rgba(226, 194, 117, 0.08)" strokeWidth="1">
            <line x1="0" y1="0" x2="800" y2="450" strokeDasharray="6 6" />
            <line x1="800" y1="0" x2="0" y2="450" strokeDasharray="6 6" />
          </g>
        )}

        {stylePreset === "vintage" && (
          <g fill="rgba(255,255,255,0.15)">
            <rect x="30" y="8" width="12" height="8" rx="2" />
            <rect x="130" y="8" width="12" height="8" rx="2" />
            <rect x="230" y="8" width="12" height="8" rx="2" />
            <rect x="330" y="8" width="12" height="8" rx="2" />
            <rect x="430" y="8" width="12" height="8" rx="2" />
            <rect x="530" y="8" width="12" height="8" rx="2" />
            <rect x="630" y="8" width="12" height="8" rx="2" />
            <rect x="730" y="8" width="12" height="8" rx="2" />
          </g>
        )}

        {/* Crisp Camera Framing Guide */}
        <rect x="20" y="20" width="760" height="410" fill="none" stroke={accentStroke} strokeOpacity="0.3" strokeWidth="1" />
        <line x1="266" y1="20" x2="266" y2="430" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
        <line x1="533" y1="20" x2="533" y2="430" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
        <line x1="20" y1="150" x2="780" y2="150" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
        <line x1="20" y1="300" x2="780" y2="300" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

        {/* Center Crosshair */}
        <path d="M 390 225 L 410 225 M 400 215 L 400 235" stroke={accentStroke} strokeWidth="1.5" />

        <text
          x="40"
          y="60"
          fill="#ffffff"
          fontSize="20"
          fontFamily="Bebas Neue, sans-serif"
          letterSpacing="1"
        >
          SCENE {String(scene.scene_number).padStart(2, "0")} · {(scene.slugline.split("-")[0] || scene.slugline).trim().toUpperCase()}
        </text>
        <text
          x="40"
          y="88"
          fill={accentStroke}
          fontSize="12"
          fontFamily="Inter, sans-serif"
          fontWeight="600"
        >
          {scene.cinematic?.camera || "Medium Shot"} · {scene.cinematic?.lighting || "Natural Ambient"}
        </text>

        {scene.action_text && (
          <text
            x="40"
            y="390"
            fill="rgba(255,255,255,0.6)"
            fontSize="12"
            fontFamily="Inter, sans-serif"
          >
            {(scene.action_text.slice(0, 80) + "...").toUpperCase()}
          </text>
        )}
      </svg>

      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(4px)",
          padding: "3px 8px",
          borderRadius: 4,
          fontSize: 10,
          color: isGenerating ? "var(--accent-amber)" : accentStroke,
          fontFamily: "var(--font-mono)",
          border: "1px solid var(--border-soft)",
          fontWeight: 600,
        }}
      >
        {isGenerating ? "RENDERING..." : presetLabel}
      </div>
    </div>
  );
}

export default function ImageStub({ kind }) {
  const { project, script, refreshScript } = useOutletContext();
  const [subTab, setSubTab] = useState("grid"); // "grid" | "deck" | "video"
  const [aspectRatio, setAspectRatio] = useState("169");
  const [stylePreset, setStylePreset] = useState("sketch");
  const [generatingId, setGeneratingId] = useState(null);
  const [generatedFrames, setGeneratedFrames] = useState({});
  const [customPrompts, setCustomPrompts] = useState({});
  const [expandedPrompts, setExpandedPrompts] = useState({});
  const [renderError, setRenderError] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (previewIndex === null) return;
      if (e.key === "Escape") setPreviewIndex(null);
      if (e.key === "ArrowLeft") setPreviewIndex((prev) => Math.max(0, prev - 1));
      if (e.key === "ArrowRight") setPreviewIndex((prev) => Math.min(script.scenes.length - 1, prev + 1));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, script]);

  if (!script || !script.scenes.length) {
    return (
      <div className={styles.wrap}>
        <p style={{ color: "var(--text-dim)" }}>
          Upload a screenplay first in the Script Viewer tab.
        </p>
      </div>
    );
  }

  function getSynthesizedPrompt(scene) {
    if (customPrompts[scene.id]) return customPrompts[scene.id];

    const presets = {
      sketch: "Production concept sketch, graphite pencil illustration, detailed line art storyboard",
      noir: "Neo-noir film still, dramatic high-contrast chiaroscuro lighting, deep shadows",
      cinematic: "Cinematic 35mm master shot film still, 8k anamorphic resolution, natural lighting",
      vintage: "Kodak 1970s vintage film stock, Technicolor color grade, film grain",
    };

    const presetText = presets[stylePreset] || presets.sketch;
    const style = project.style_prompt ? `, ${project.style_prompt}` : "";
    const camera = scene.cinematic?.camera ? `, ${scene.cinematic.camera}` : "";
    const lighting = scene.cinematic?.lighting ? `, ${scene.cinematic.lighting} lighting` : "";
    const palette = (scene.cinematic?.palette || []).join(" & ");
    const paletteStr = palette ? `, color palette ${palette}` : "";
    const action = scene.action_text ? scene.action_text.slice(0, 140) : scene.slugline;
    return `${presetText} of ${action}${style}${camera}${lighting}${paletteStr}, 8k highly detailed.`;
  }

  async function handleGenerateFrame(scene) {
    setGeneratingId(scene.id);
    setRenderError(null);
    const prompt = getSynthesizedPrompt(scene);

    try {
      const res = await api.generateSceneFrame(project.id, scene.id, {
        prompt,
        aspect_ratio: aspectRatio,
        style_preset: stylePreset,
      });

      setGeneratedFrames((prev) => ({
        ...prev,
        [scene.id]: res.image_url,
      }));

      if (refreshScript) refreshScript(script.id);
    } catch (err) {
      setRenderError(`Scene ${scene.scene_number} render failed: ${err.message}`);
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleBatchRender() {
    for (const scene of script.scenes) {
      await handleGenerateFrame(scene);
    }
  }

  const viewportClass =
    aspectRatio === "239" ? styles.viewport239 : aspectRatio === "43" ? styles.viewport43 : styles.viewport169;

  return (
    <div className={styles.wrap}>
      {/* Error alert banner if render fails */}
      {renderError && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#ef4444",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13.5px",
          }}
        >
          {renderError}
        </div>
      )}

      {/* Storyboard View Mode Tabs */}
      {kind === "storyboard" && (
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            background: "var(--surface-2)",
            padding: 4,
            borderRadius: 8,
            border: "1px solid var(--border-soft)",
            width: "fit-content",
          }}
        >
          <button
            onClick={() => setSubTab("grid")}
            style={{
              background: subTab === "grid" ? "var(--surface-1)" : "transparent",
              color: subTab === "grid" ? "var(--accent-gold)" : "var(--text-dim)",
              border: "1px solid " + (subTab === "grid" ? "rgba(226, 194, 117, 0.3)" : "transparent"),
              padding: "6px 14px",
              borderRadius: 6,
              fontWeight: subTab === "grid" ? 600 : 500,
              fontSize: 12.5,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Storyboard Grid
          </button>
          <button
            onClick={() => setSubTab("deck")}
            style={{
              background: subTab === "deck" ? "var(--surface-1)" : "transparent",
              color: subTab === "deck" ? "var(--accent-gold)" : "var(--text-dim)",
              border: "1px solid " + (subTab === "deck" ? "rgba(226, 194, 117, 0.3)" : "transparent"),
              padding: "6px 14px",
              borderRadius: 6,
              fontWeight: subTab === "deck" ? 600 : 500,
              fontSize: 12.5,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Slide Pitch Deck
          </button>
          <button
            onClick={() => setSubTab("video")}
            style={{
              background: subTab === "video" ? "var(--surface-1)" : "transparent",
              color: subTab === "video" ? "var(--accent-gold)" : "var(--text-dim)",
              border: "1px solid " + (subTab === "video" ? "rgba(226, 194, 117, 0.3)" : "transparent"),
              padding: "6px 14px",
              borderRadius: 6,
              fontWeight: subTab === "video" ? 600 : 500,
              fontSize: 12.5,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Storyboard Video Reel (Animatic)
          </button>
        </div>
      )}

      {/* Render selected view mode */}
      {kind === "storyboard" && subTab === "deck" && (
        <PitchDeckViewer project={project} script={script} onRefresh={refreshScript} />
      )}

      {kind === "storyboard" && subTab === "video" && (
        <AnimaticPlayer project={project} script={script} onRefresh={refreshScript} />
      )}

      {/* Control Toolbar (Only for Grid mode or moodboard) */}
      {(kind !== "storyboard" || subTab === "grid") && (
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.label}>Aspect Ratio:</label>
            <select className={styles.select} value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
              <option value="169">16:9 Widescreen (1024x576)</option>
              <option value="239">2.39:1 Anamorphic (1216x512)</option>
              <option value="43">4:3 Academy (896x672)</option>
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>Style Filter Preset:</label>
            <select className={styles.select} value={stylePreset} onChange={(e) => setStylePreset(e.target.value)}>
              <option value="sketch">Production Concept Sketch (Default)</option>
              <option value="noir">Neo Noir High-Contrast</option>
              <option value="cinematic">Cinematic 35mm</option>
              <option value="vintage">Kodak Vintage Color</option>
            </select>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            {kind === "storyboard" && (
              <Button
                primary
                onClick={handleBatchRender}
                disabled={generatingId !== null}
                style={{ fontSize: 12 }}
              >
                Render All Frames
              </Button>
            )}
            <Button onClick={() => window.print()} style={{ fontSize: 12 }}>
              Export Sheet
            </Button>
          </div>
        </div>
      )}

      {kind === "storyboard" && subTab === "grid" ? (
        <div className={styles.grid}>
          {script.scenes.map((scene, idx) => {
            const prompt = getSynthesizedPrompt(scene);
            const isGenerating = generatingId === scene.id;
            const currentFrameUrl = generatedFrames[scene.id] || scene.generated_image_url;

            return (
              <div key={scene.id} className={styles.frameCard}>
                <div className={styles.header}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                    <span className={styles.shotBadge}>SHOT {String(scene.scene_number).padStart(2, "0")}</span>
                    <span className={styles.slugline}>{(scene.slugline.split("-")[0] || scene.slugline).trim()}</span>
                  </div>
                  {scene.cinematic?.camera && (
                    <span
                      className={styles.specTag}
                      style={{
                        marginLeft: 8,
                        flexShrink: 0,
                        maxWidth: 130,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={scene.cinematic.camera}
                    >
                      {scene.cinematic.camera.split(",")[0].trim()}
                    </span>
                  )}
                </div>

                <div
                  className={`${styles.viewport} ${viewportClass}`}
                  onClick={() => setPreviewIndex(idx)}
                  style={{ cursor: "pointer" }}
                  title="Click to magnify in preview mode"
                >
                  <SceneFrameArtwork
                    scene={scene}
                    generatedFrameUrl={currentFrameUrl}
                    isGenerating={isGenerating}
                    stylePreset={stylePreset}
                    aspectRatio={aspectRatio}
                  />
                </div>

                <div className={styles.frameBody}>
                  {expandedPrompts[scene.id] && (
                    <div className={styles.promptBox} style={{ marginBottom: 8 }}>
                      <div className={styles.promptLabel}>AI Prompt Synthesis</div>
                      <textarea
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          color: "inherit",
                          fontSize: "12px",
                          fontFamily: "inherit",
                          resize: "vertical",
                          minHeight: "44px",
                          outline: "none",
                        }}
                        value={prompt}
                        onChange={(e) =>
                          setCustomPrompts((prev) => ({
                            ...prev,
                            [scene.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}

                  <div className={styles.actions}>
                    <Button
                      primary
                      disabled={isGenerating}
                      onClick={() => handleGenerateFrame(scene)}
                      style={{ fontSize: 12, padding: "5px 12px" }}
                    >
                      {isGenerating ? "Rendering..." : currentFrameUrl ? "Re-render Frame" : "Render Frame"}
                    </Button>

                    <Button
                      ghost
                      onClick={() =>
                        setExpandedPrompts((prev) => ({
                          ...prev,
                          [scene.id]: !prev[scene.id],
                        }))
                      }
                      style={{ fontSize: 12, padding: "5px 10px" }}
                    >
                      {expandedPrompts[scene.id] ? "Hide Prompt" : "Edit Prompt"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.grid}>
          <div className={styles.frameCard} style={{ gridColumn: "1 / -1", padding: 24 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, marginBottom: 8 }}>
              Project Mood Board — {project.title}
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 20px" }}>
              Visual style directions derived from your project style prompt (
              <em style={{ color: "var(--text)" }}>{project.style_prompt || "Default concept sketch"}</em>) and scene color palettes.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {script.scenes.map((s) => {
                const rawPalette = s.cinematic?.palette || ["#0a0a0a", "#141414", "#e2c275"];
                return (
                  <div
                    key={s.id}
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-soft)",
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                      SHOT {String(s.scene_number).padStart(2, "0")}: {(s.slugline.split("-")[0] || s.slugline).trim()}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
                      Lighting: {s.cinematic?.lighting || "Natural Ambient"}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {rawPalette.map((colorName, i) => {
                        const hex = parseColor(colorName);
                        return (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              background: "var(--surface-1)",
                              border: "1px solid var(--border-soft)",
                              borderRadius: 4,
                              padding: "3px 8px",
                            }}
                          >
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 3,
                                background: hex,
                                display: "inline-block",
                                border: "1px solid rgba(255,255,255,0.2)",
                              }}
                            />
                            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text)" }}>
                              {hex}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Magnify Preview Modal */}
      {previewIndex !== null && script.scenes[previewIndex] && (() => {
        const previewScene = script.scenes[previewIndex];
        const previewUrl = generatedFrames[previewScene.id] || previewScene.generated_image_url;
        const prompt = getSynthesizedPrompt(previewScene);
        const hasPrev = previewIndex > 0;
        const hasNext = previewIndex < script.scenes.length - 1;

        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0, 0, 0, 0.95)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              padding: "20px 32px",
            }}
            onClick={() => setPreviewIndex(null)}
          >
            {/* Top Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--accent-gold)",
                    background: "rgba(226, 194, 117, 0.15)",
                    border: "1px solid rgba(226, 194, 117, 0.3)",
                    padding: "3px 8px",
                    borderRadius: 4,
                  }}
                >
                  SHOT {String(previewScene.scene_number).padStart(2, "0")} / {String(script.scenes.length).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                  {(previewScene.slugline.split("-")[0] || previewScene.slugline).trim()}
                </span>
                {previewScene.cinematic?.camera && (
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-dim)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-soft)",
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {previewScene.cinematic.camera} · {previewScene.cinematic.lens_suggestion || "50mm"}
                  </span>
                )}
              </div>

              <button
                onClick={() => setPreviewIndex(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid var(--border-soft)",
                  color: "#ffffff",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            {/* Stage View Area */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
                minHeight: 0,
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                disabled={!hasPrev}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid var(--border-soft)",
                  color: "#ffffff",
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: hasPrev ? "pointer" : "default",
                  opacity: hasPrev ? 1 : 0.2,
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                ‹
              </button>

              <div
                style={{
                  flex: 1,
                  height: "100%",
                  maxHeight: "76vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#000000",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid rgba(226, 194, 117, 0.3)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                  position: "relative",
                }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl.startsWith("http") ? previewUrl : `${api.base}${previewUrl}`}
                    alt={`Preview frame ${previewScene.scene_number}`}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <SceneFrameArtwork
                    scene={previewScene}
                    generatedFrameUrl={null}
                    isGenerating={false}
                    stylePreset={stylePreset}
                    aspectRatio={aspectRatio}
                  />
                )}
              </div>

              <button
                onClick={() => setPreviewIndex((prev) => Math.min(script.scenes.length - 1, prev + 1))}
                disabled={!hasNext}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid var(--border-soft)",
                  color: "#ffffff",
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: hasNext ? "pointer" : "default",
                  opacity: hasNext ? 1 : 0.2,
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                ›
              </button>
            </div>

            {/* Bottom Prompt Metadata Panel */}
            <div
              style={{
                marginTop: 16,
                background: "var(--surface-2)",
                border: "1px solid var(--border-soft)",
                borderRadius: 8,
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--accent-gold)",
                    letterSpacing: "0.05em",
                    marginBottom: 4,
                  }}
                >
                  Prompt Synthesis ({stylePreset.toUpperCase()})
                </div>
                <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {prompt}
                </div>
              </div>

              <Button
                primary
                onClick={() => handleGenerateFrame(previewScene)}
                disabled={generatingId === previewScene.id}
                style={{ fontSize: 12, flexShrink: 0 }}
              >
                {generatingId === previewScene.id ? "Rendering..." : previewUrl ? "Re-render Frame" : "Render Frame"}
              </Button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
