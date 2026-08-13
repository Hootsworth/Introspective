import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { EmptyState, Button } from "../components/ui";
import styles from "./DirectorNotes.module.css";

export default function DirectorNotes() {
  const { script } = useOutletContext();
  const [search, setSearch] = useState("");

  const analyzedScenes = useMemo(() => {
    if (!script) return [];
    return script.scenes.filter((s) => s.analyzed && s.director_notes);
  }, [script]);

  const filteredScenes = useMemo(() => {
    if (!search.trim()) return analyzedScenes;
    const q = search.toLowerCase();
    return analyzedScenes.filter(
      (s) =>
        s.slugline.toLowerCase().includes(q) ||
        s.director_notes.toLowerCase().includes(q) ||
        (s.dominant_emotion || "").toLowerCase().includes(q)
    );
  }, [analyzedScenes, search]);

  if (!script || !script.scenes.length) {
    return (
      <div className={styles.wrap}>
        <p style={{ color: "var(--text-dim)" }}>Upload a screenplay first to generate director notes.</p>
      </div>
    );
  }

  if (!analyzedScenes.length) {
    return (
      <div className={styles.wrap}>
        <EmptyState
          title="No director notes yet"
          body="Director vision notes are synthesized automatically alongside cinematic analysis for each scene. Run 'Analyze All Scenes' in Script Viewer or Scene Explorer to build your director's journal."
        />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* Controls & Search Toolbar */}
      <div className={styles.controlsBar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Filter notes by keyword, location, or emotion..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Showing {filteredScenes.length} of {analyzedScenes.length} scene notes
        </span>
        <div style={{ marginLeft: "auto" }}>
          <Button ghost onClick={() => window.print()} style={{ fontSize: 12 }}>
            Export Director Journal
          </Button>
        </div>
      </div>

      {/* Director Notes Journal Cards */}
      <div className={styles.notesGrid}>
        {filteredScenes.map((s) => (
          <div key={s.id} className={styles.noteCard}>
            <div className={styles.noteHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                <span className={styles.shotBadge}>SHOT {String(s.scene_number).padStart(2, "0")}</span>
                <span className={styles.sluglineText}>{(s.slugline.split("-")[0] || s.slugline).trim()}</span>
              </div>
              {s.dominant_emotion && (
                <span className={styles.emotionBadge}>{s.dominant_emotion}</span>
              )}
            </div>

            <div className={styles.noteBody}>
              "{s.director_notes}"
            </div>

            <div className={styles.notesFooter}>
              {s.cinematic?.camera && <span className={styles.tagBadge}>Camera: {s.cinematic.camera}</span>}
              {s.cinematic?.lighting && <span className={styles.tagBadge}>Lighting: {s.cinematic.lighting}</span>}
              {s.cinematic?.lens_suggestion && <span className={styles.tagBadge}>Lens: {s.cinematic.lens_suggestion}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
