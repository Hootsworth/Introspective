import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { Button, Pill } from "./ui";

function IconDeck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
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

function IconCamera() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconLens() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconFilm() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export default function PitchDeckViewer({ project, script, onRefresh }) {
  const [deckData, setDeckData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    if (project?.id) {
      setLoading(true);
      api
        .getPitchDeck(project.id)
        .then((data) => setDeckData(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [project?.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await api.generatePitchDeck(project.id);
      setDeckData(data);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to generate pitch deck:", err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>
        Loading Pitch Deck Presentation...
      </div>
    );
  }

  const slides = deckData?.slides || [];
  const currentSlide = slides[currentSlideIndex] || null;

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
      {/* Top Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ color: "var(--accent-cyan)", display: "flex" }}>
            <IconDeck />
          </div>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>
              Slide Pitch Deck — {project.title}
            </h2>
            <p style={{ margin: "2px 0 0", color: "var(--text-dim)", fontSize: 13 }}>
              Cinematic presentation explaining the screenplay, key scenes, storyboard frames, and visual style.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {deckData?.html_url && (
            <Button
              ghost
              onClick={() => window.open(`${api.base}${deckData.html_url}`, "_blank")}
              style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
            >
              <IconExternal /> Open Presentation
            </Button>
          )}
          <Button primary onClick={handleGenerate} disabled={generating} style={{ fontSize: 13 }}>
            {generating ? "Compiling Deck..." : "Re-compile Deck"}
          </Button>
        </div>
      </div>

      {/* Main Slide Card Stage */}
      {currentSlide ? (
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-soft)",
            borderRadius: 10,
            padding: 32,
            minHeight: 460,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Slide Content by Type */}
          {currentSlide.type === "title" && (
            <div style={{ textAlign: "center", margin: "auto 0" }}>
              <Pill tone="amber" style={{ marginBottom: 16 }}>
                CINEMATIC PRE-PRODUCTION DECK
              </Pill>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 52,
                  letterSpacing: 2,
                  color: "var(--accent-cyan)",
                  marginBottom: 12,
                }}
              >
                {currentSlide.title}
              </h1>
              <div style={{ fontSize: 20, color: "var(--text-dim)", marginBottom: 24 }}>
                {currentSlide.subtitle}
              </div>
              <div style={{ fontSize: 14, color: "var(--text)" }}>
                <strong>Visual Style:</strong> <em>{currentSlide.style_prompt}</em>
              </div>

              {/* Color Swatches */}
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
                {(currentSlide.color_palette || []).map((c, i) => (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: c,
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          {currentSlide.type === "vision" && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--accent-cyan)", marginBottom: 16 }}>
                {currentSlide.title}
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-dim)", marginBottom: 24 }}>
                {currentSlide.summary}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div style={{ background: "var(--surface-2)", padding: 16, borderRadius: 8, border: "1px solid var(--border-soft)" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "var(--accent-amber)" }}>Visual Color Palette</h4>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(currentSlide.palette || []).map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          background: c,
                          border: "1px solid rgba(255,255,255,0.15)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ background: "var(--surface-2)", padding: 16, borderRadius: 8, border: "1px solid var(--border-soft)" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "var(--accent-cyan)" }}>Lighting & Camera Motifs</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-dim)" }}>
                    {(currentSlide.key_motifs || ["Naturalistic High-Contrast", "Atmospheric Haze"]).map((m, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {currentSlide.type === "scene" && (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, margin: 0, letterSpacing: 1 }}>
                  SCENE {String(currentSlide.scene_number).padStart(2, "0")} · {currentSlide.slugline}
                </h2>
                <Pill tone="amber">{currentSlide.emotion || "Dramatic"} (Tension {currentSlide.tension || 5}/10)</Pill>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, flex: 1 }}>
                <div>
                  {currentSlide.image_url ? (
                    <img
                      src={currentSlide.image_url.startsWith("http") ? currentSlide.image_url : `${api.base}${currentSlide.image_url}`}
                      alt={`Scene ${currentSlide.scene_number}`}
                      style={{
                        width: "100%",
                        height: 280,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid var(--border-soft)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 280,
                        background: "var(--surface-2)",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-dim)",
                        border: "1px solid var(--border-soft)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                      }}
                    >
                      [ SCENE {currentSlide.scene_number} STORYBOARD SLATE ]
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-dim)",
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <IconCamera /> {currentSlide.camera}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <IconLens /> {currentSlide.lens}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <IconFilm /> {currentSlide.movement}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <IconSun /> {currentSlide.lighting}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--accent-cyan)", marginBottom: 8 }}>
                      Action Narrative
                    </h4>
                    <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-dim)", margin: 0 }}>
                      {currentSlide.action_text || "No action text registered."}
                    </p>
                  </div>

                  {currentSlide.director_notes && (
                    <div
                      style={{
                        background: "rgba(245, 158, 11, 0.08)",
                        borderLeft: "3px solid var(--accent-amber)",
                        padding: "10px 14px",
                        borderRadius: 4,
                        fontSize: 12.5,
                        fontStyle: "italic",
                        marginTop: 12,
                      }}
                    >
                      <strong>Director's Note:</strong> {currentSlide.director_notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentSlide.type === "characters" && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--accent-cyan)", marginBottom: 16 }}>
                {currentSlide.title}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                {(currentSlide.characters || []).map((c, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-soft)",
                      padding: 16,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--accent-cyan)", marginBottom: 8 }}>
                      {c.lines} Dialogue Lines · {c.scenes_count} Scenes
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{c.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentSlide.type === "closing" && (
            <div style={{ textAlign: "center", margin: "auto 0" }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 44, color: "var(--accent-cyan)", marginBottom: 16 }}>
                {currentSlide.title}
              </h1>
              <p style={{ fontSize: 16, color: "var(--text-dim)", marginBottom: 24 }}>{currentSlide.summary}</p>
              <Pill tone="emerald">PACKAGE COMPLETE & EXPORT READY</Pill>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>
          No slides available. Click "Re-compile Deck" to build presentation.
        </div>
      )}

      {/* Slide Navigation Controls & Thumbnails */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Button
          onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentSlideIndex === 0}
          style={{ fontSize: 13 }}
        >
          Previous Slide
        </Button>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "4px 10px" }}>
          {slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              style={{
                width: 32,
                height: 24,
                borderRadius: 4,
                border: "1px solid",
                borderColor: idx === currentSlideIndex ? "rgba(245, 158, 11, 0.4)" : "var(--border-soft)",
                background: idx === currentSlideIndex ? "rgba(245, 158, 11, 0.15)" : "var(--surface-1)",
                color: idx === currentSlideIndex ? "var(--accent-cyan)" : "var(--text-dim)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <Button
          onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
          disabled={currentSlideIndex === slides.length - 1}
          style={{ fontSize: 13 }}
        >
          Next Slide
        </Button>
      </div>
    </div>
  );
}
