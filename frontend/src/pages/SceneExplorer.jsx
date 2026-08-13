import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../api/client";
import { Button, EmptyState, Meter, Pill } from "../components/ui";
import uiStyles from "../components/ui.module.css";
import styles from "./SceneExplorer.module.css";

function EmotionPill({ scene }) {
  if (!scene.analyzed) return <Pill tone="neutral">Not analyzed</Pill>;
  return <Pill tone="amber">{scene.dominant_emotion}</Pill>;
}

export default function SceneExplorer() {
  const { script, project, refreshScript } = useOutletContext();
  const [expanded, setExpanded] = useState(null);
  const [busyId, setBusyId] = useState(null);

  if (!script || !script.scenes.length) {
    return (
      <div className={styles.wrap}>
        <EmptyState
          title="No scenes extracted yet"
          body="Upload a screenplay in the Script Viewer tab to automatically extract scenes, dialogue, and cinematic details."
        />
      </div>
    );
  }

  async function analyzeOne(sceneId) {
    setBusyId(sceneId);
    try {
      await api.analyzeScene(sceneId, { mode_override: project.ai_mode });
      await refreshScript(script.id);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {script.scenes.map((scene) => {
          const isExpanded = expanded === scene.id;
          return (
            <div
              key={scene.id}
              className={`${uiStyles.card} ${styles.card} ${isExpanded ? styles.expanded : ""}`}
              onClick={() => setExpanded(isExpanded ? null : scene.id)}
            >
              <div className={styles.cardHead}>
                <span className={styles.sceneNum}>{String(scene.scene_number).padStart(2, "0")}</span>
                <span className={styles.slugline}>{scene.slugline}</span>
              </div>
              <div className={styles.metaRow}>
                {scene.characters_present.join(", ") || "No dialogue"}
              </div>

              {scene.analyzed ? (
                <>
                  <div className={styles.tagRow}>
                    <EmotionPill scene={scene} />
                    {scene.themes.slice(0, 2).map((t) => <Pill key={t} tone="teal">{t}</Pill>)}
                  </div>
                  <div className={styles.meters}>
                    <Meter label="Tension" value={scene.tension_score} tone="amber" />
                    <Meter label="Pacing" value={scene.pacing_score} tone="teal" />
                  </div>
                </>
              ) : (
                <Button
                  primary
                  onClick={(e) => { e.stopPropagation(); analyzeOne(scene.id); }}
                  disabled={busyId === scene.id}
                >
                  {busyId === scene.id ? "Analyzing…" : "Analyze Scene"}
                </Button>
              )}

              {isExpanded && scene.analyzed && (
                <div className={styles.detailGrid} onClick={(e) => e.stopPropagation()}>
                  <div>
                    <div className={styles.detailLabel}>Lighting</div>
                    <div className={styles.detailValue}>{scene.cinematic.lighting || "—"}</div>
                    <div className={styles.detailLabel}>Camera</div>
                    <div className={styles.detailValue}>{scene.cinematic.camera || "—"}</div>
                    <div className={styles.detailLabel}>Lens</div>
                    <div className={styles.detailValue}>{scene.cinematic.lens_suggestion || "—"}</div>
                    <div className={styles.detailLabel}>Movement</div>
                    <div className={styles.detailValue}>{scene.cinematic.movement || "—"}</div>
                  </div>
                  <div>
                    <div className={styles.detailLabel}>Composition</div>
                    <div className={styles.detailValue}>{scene.cinematic.composition || "—"}</div>
                    <div className={styles.detailLabel}>Weather</div>
                    <div className={styles.detailValue}>{scene.cinematic.weather || "—"}</div>
                    <div className={styles.detailLabel}>Palette</div>
                    <div className={styles.tagRow}>
                      {(scene.cinematic.palette || []).map((c) => <Pill key={c} tone="neutral">{c}</Pill>)}
                    </div>
                    <div className={styles.detailLabel}>Film Stock Inspiration</div>
                    <div className={styles.detailValue}>{scene.cinematic.film_stock_inspiration || "—"}</div>
                  </div>
                  {scene.director_notes && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div className={styles.detailLabel}>Director Notes</div>
                      <div className={styles.notes}>{scene.director_notes}</div>
                    </div>
                  )}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Button onClick={() => analyzeOne(scene.id)} disabled={busyId === scene.id}>
                      {busyId === scene.id ? "Re-analyzing…" : "Re-analyze"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
