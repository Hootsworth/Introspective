import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../api/client";
import ComfyUITestSuite from "../components/ComfyUITestSuite";
import PitchDeckViewer from "../components/PitchDeckViewer";
import AnimaticPlayer from "../components/AnimaticPlayer";
import { Button, EmptyState, Pill } from "../components/ui";
import styles from "./Storyboard.module.css";

function SceneFrameArtwork({ scene, generatedFrameUrl, isGenerating, stylePreset, aspectRatio }) {
  const palette = scene.cinematic?.palette || ["#0f172a", "#1e293b", "#334155", "#0284c7"];
  const color1 = palette[0] || "#0f172a";
  const color2 = palette[1] || "#1e293b";
  const color3 = palette[2] || "#38bdf8";

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
            background: "rgba(9, 13, 22, 0.85)",
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

  // Dynamic Slate Stage with clean vector grid
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "var(--surface-1)" }}>
      <svg
        viewBox="0 0 800 450"
        style={{ width: "100%", height: "100%", display: "block" }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`bg-${scene.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color1} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#050811" />
          </linearGradient>
        </defs>

        <rect width="800" height="450" fill={`url(#bg-${scene.id})`} />

        {/* Crisp Camera Framing Guide */}
        <rect x="20" y="20" width="760" height="410" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <line x1="266" y1="20" x2="266" y2="430" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
        <line x1="533" y1="20" x2="533" y2="430" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
        <line x1="20" y1="150" x2="780" y2="150" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
        <line x1="20" y1="300" x2="780" y2="300" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />

        {/* Center Crosshair */}
        <path d="M 390 225 L 410 225 M 400 215 L 400 235" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

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
          fill={color3}
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
          background: "rgba(9, 13, 22, 0.8)",
          backdropFilter: "blur(4px)",
          padding: "3px 8px",
          borderRadius: 4,
          fontSize: 10,
          color: isGenerating ? "var(--accent-amber)" : "var(--text-dim)",
          fontFamily: "var(--font-mono)",
          border: "1px solid var(--border-soft)",
        }}
      >
        {isGenerating ? "RENDERING..." : "CONCEPT SLATE"}
      </div>
    </div>
  );
}

export default function ImageStub({ kind }) {
  const { project, script, refreshScript } = useOutletContext();
  const [subTab, setSubTab] = useState("grid"); // "grid" | "deck" | "video"
  const [aspectRatio, setAspectRatio] = useState("169");
  const [stylePreset, setStylePreset] = useState("cinematic");
  const [generatingId, setGeneratingId] = useState(null);
  const [generatedFrames, setGeneratedFrames] = useState({});
  const [customPrompts, setCustomPrompts] = useState({});
  const [renderError, setRenderError] = useState(null);
  const [showTestSuite, setShowTestSuite] = useState(false);
  const [comfyStatus, setComfyStatus] = useState(null);


  useEffect(() => {
    api.getComfyUIStatus().then(setComfyStatus).catch(() => {});
  }, []);

  if (!script || !script.scenes || !script.scenes.length) {
    return (
      <div className={styles.wrap}>
        <EmptyState
          title={`No ${kind === "storyboard" ? "storyboards" : "mood board"} generated yet`}
          body="Upload a screenplay in Script Viewer first so Introspective can extract scene details, camera angles, and visual style prompts."
        />
      </div>
    );
  }

  function getSynthesizedPrompt(scene) {
    if (customPrompts[scene.id]) return customPrompts[scene.id];

    const style = project.style_prompt ? `${project.style_prompt}, ` : "";
    const camera = scene.cinematic?.camera ? `${scene.cinematic.camera}, ` : "";
    const lighting = scene.cinematic?.lighting ? `${scene.cinematic.lighting} lighting, ` : "";
    const palette = (scene.cinematic?.palette || []).join(" & ");
    const paletteStr = palette ? `, color palette ${palette}` : "";
    const action = scene.action_text ? scene.action_text.slice(0, 140) : scene.slugline;
    return `Cinematic 35mm film still of ${action}. ${style}${camera}${lighting}${stylePreset} style${paletteStr}, 8k highly detailed.`;
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
      {/* Top Integration & Telemetry Status Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--surface-2)",
          border: "1px solid var(--border-soft)",
          padding: "10px 16px",
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 600 }}>ComfyUI Integration Status:</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 10px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              background: comfyStatus?.reachable ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
              color: comfyStatus?.reachable ? "#10b981" : "#ef4444",
            }}
          >
            ● {comfyStatus?.reachable ? `Live (${comfyStatus.url})` : "Offline / Unreachable"}
          </span>
          {comfyStatus?.latency_ms && (
            <span style={{ color: "var(--text-dim)", fontSize: 11.5, fontFamily: "var(--font-mono)" }}>
              {comfyStatus.latency_ms}ms
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            ghost
            onClick={() => setShowTestSuite(!showTestSuite)}
            style={{ fontSize: 12, padding: "5px 12px" }}
          >
            {showTestSuite ? "Hide Integration Test Suite" : "Run Live Test Suite"}
          </Button>
          <Button
            primary
            onClick={handleBatchRender}
            disabled={generatingId !== null}
            style={{ fontSize: 12, padding: "5px 12px" }}
          >
            Render All Frames with ComfyUI
          </Button>
        </div>
      </div>

      {/* Embedded Live Test Suite Drawer */}
      {showTestSuite && (
        <ComfyUITestSuite
          comfyUrl={comfyStatus?.url || "http://127.0.0.1:8188"}
          onTestComplete={() => api.getComfyUIStatus().then(setComfyStatus)}
        />
      )}

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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{renderError}</span>
          <Button ghost style={{ fontSize: 12 }} onClick={() => setShowTestSuite(true)}>
            Open Test Suite Diagnostics
          </Button>
        </div>
      )}

      {/* Storyboard View Mode Tabs */}
      {kind === "storyboard" && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            background: "var(--surface-2)",
            padding: "4px 8px",
            borderRadius: 8,
            border: "1px solid var(--border-soft)",
            width: "fit-content",
          }}
        >
          <button
            onClick={() => setSubTab("grid")}
            style={{
              background: subTab === "grid" ? "var(--accent-cyan)" : "transparent",
              color: subTab === "grid" ? "#090d16" : "var(--text)",
              border: "none",
              padding: "6px 14px",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Storyboard Grid
          </button>
          <button
            onClick={() => setSubTab("deck")}
            style={{
              background: subTab === "deck" ? "var(--accent-cyan)" : "transparent",
              color: subTab === "deck" ? "#090d16" : "var(--text)",
              border: "none",
              padding: "6px 14px",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Slide Pitch Deck
          </button>
          <button
            onClick={() => setSubTab("video")}
            style={{
              background: subTab === "video" ? "var(--accent-cyan)" : "transparent",
              color: subTab === "video" ? "#090d16" : "var(--text)",
              border: "none",
              padding: "6px 14px",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
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
              <option value="cinematic">Cinematic 35mm</option>
              <option value="noir">Neo Noir High-Contrast</option>
              <option value="sketch">Production Concept Sketch</option>
              <option value="vintage">Kodak Vintage Color</option>
            </select>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Button onClick={() => window.print()}>Export Storyboard Sheet</Button>
          </div>
        </div>
      )}

      {kind === "storyboard" && subTab === "grid" ? (
        <div className={styles.grid}>
          {script.scenes.map((scene) => {
            const prompt = getSynthesizedPrompt(scene);
            const isGenerating = generatingId === scene.id;
            const currentFrameUrl = generatedFrames[scene.id] || scene.generated_image_url;

            return (
              <div key={scene.id} className={styles.frameCard}>
                <div className={styles.header}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={styles.shotBadge}>SHOT {String(scene.scene_number).padStart(2, "0")}</span>
                    <span className={styles.slugline}>{(scene.slugline.split("-")[0] || scene.slugline).trim()}</span>
                  </div>
                </div>

                <div className={`${styles.viewport} ${viewportClass}`}>
                  <SceneFrameArtwork
                    scene={scene}
                    generatedFrameUrl={currentFrameUrl}
                    isGenerating={isGenerating}
                    stylePreset={stylePreset}
                    aspectRatio={aspectRatio}
                  />
                </div>

                <div className={styles.frameBody}>
                  <div className={styles.tagsRow}>
                    {scene.cinematic?.camera && <span className={styles.specTag}>{scene.cinematic.camera}</span>}
                    {scene.cinematic?.lens_suggestion && (
                      <span className={styles.specTag}>{scene.cinematic.lens_suggestion}</span>
                    )}
                    {scene.cinematic?.movement && <span className={styles.specTag}>{scene.cinematic.movement}</span>}
                    {scene.dominant_emotion && <Pill tone="amber">{scene.dominant_emotion}</Pill>}
                  </div>

                  <div className={styles.promptBox}>
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

                  <div className={styles.actions}>
                    <Button
                      primary
                      disabled={isGenerating}
                      onClick={() => handleGenerateFrame(scene)}
                    >
                      {isGenerating ? "Rendering via ComfyUI…" : currentFrameUrl ? "Re-render Frame" : "Render Frame with ComfyUI"}
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
              <em style={{ color: "var(--text)" }}>{project.style_prompt || "Default cinematic"}</em>) and scene color palettes.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {script.scenes.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Scene {s.scene_number}: {s.slugline}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                    Lighting: {s.cinematic?.lighting || "Natural"}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(s.cinematic?.palette || ["#1e293b", "#334155", "#475569"]).map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: c,
                          border: "1px solid var(--border)",
                        }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
