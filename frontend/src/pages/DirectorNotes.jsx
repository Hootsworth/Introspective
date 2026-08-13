import { useOutletContext } from "react-router-dom";
import { EmptyState, Pill } from "../components/ui";
import uiStyles from "../components/ui.module.css";
import styles from "./ScriptViewer.module.css"; // reuse .wrap

export default function DirectorNotes() {
  const { script } = useOutletContext();

  if (!script || !script.scenes.length) {
    return (
      <div className={styles.wrap}>
        <p style={{ color: "var(--text-dim)" }}>Upload a screenplay first.</p>
      </div>
    );
  }

  const analyzed = script.scenes.filter((s) => s.analyzed && s.director_notes);

  if (!analyzed.length) {
    return (
      <div className={styles.wrap}>
        <EmptyState
          title="No director notes yet"
          body="Notes are generated alongside cinematic analysis for each scene. Run Analyze All Scenes in Script Viewer or Scene Explorer to populate this page."
        />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
        {analyzed.map((s) => (
          <div key={s.id} className={uiStyles.card} style={{ padding: "18px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                color: "var(--accent-amber)", background: "var(--accent-amber-soft)",
                borderRadius: 5, padding: "2px 7px",
              }}>
                {String(s.scene_number).padStart(2, "0")}
              </span>
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>{s.slugline}</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <Pill tone="amber">{s.dominant_emotion}</Pill>
              </div>
            </div>
            <div style={{
              fontSize: 13.5, lineHeight: 1.65, color: "var(--text)",
              borderLeft: "3px solid var(--accent-amber)", background: "var(--surface-2)",
              padding: "10px 14px", borderRadius: "0 8px 8px 0",
            }}>
              {s.director_notes}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
