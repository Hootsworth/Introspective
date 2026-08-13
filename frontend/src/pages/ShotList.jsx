import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { EmptyState } from "../components/ui";
import styles from "./ShotList.module.css";

function estimateDuration(scene) {
  const dialogueWords = (scene.dialogue || []).reduce((sum, d) => sum + d.line.split(/\s+/).length, 0);
  const actionWords = (scene.action_text || "").split(/\s+/).filter(Boolean).length;
  const seconds = Math.max(3, Math.round((dialogueWords / 2.3) + (actionWords / 6)));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function derivePurpose(scene) {
  const emotion = (scene.dominant_emotion || "").toLowerCase();
  const theme = scene.themes?.[0];
  if (!emotion) return "Establish scene geography";
  return theme ? `Convey ${emotion} · touches on ${theme}` : `Convey ${emotion}`;
}

export default function ShotList() {
  const { script } = useOutletContext();

  const rows = useMemo(() => {
    if (!script) return [];
    return script.scenes
      .filter((s) => s.analyzed)
      .map((s) => ({
        shot: s.scene_number,
        lens: s.cinematic.lens_suggestion || "—",
        movement: s.cinematic.movement || "Static",
        description: `${s.slugline} — ${s.cinematic.camera || "Medium shot"}`,
        duration: estimateDuration(s),
        purpose: derivePurpose(s),
      }));
  }, [script]);

  if (!script || !script.scenes.length) {
    return (
      <div className={styles.wrap}>
        <p style={{ color: "var(--text-dim)" }}>Upload a screenplay first.</p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className={styles.wrap}>
        <EmptyState
          title="No shots yet"
          body="The shot list is derived automatically from scene analysis — camera, lens, and movement per scene. Run Analyze All Scenes in Script Viewer or Scene Explorer first."
        />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.wrapCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Shot</th>
              <th>Lens</th>
              <th>Movement</th>
              <th>Description</th>
              <th>Duration</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.shot}>
                <td className={styles.shotNum}>{String(r.shot).padStart(2, "0")}</td>
                <td>{r.lens}</td>
                <td>{r.movement}</td>
                <td className={styles.desc}>{r.description}</td>
                <td className={styles.duration}>{r.duration}</td>
                <td>{r.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
