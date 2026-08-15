import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Button, EmptyState } from "../components/ui";
import styles from "./ShotList.module.css";

function estimateDurationSec(scene) {
  const dialogueWords = (scene.dialogue || []).reduce(
    (sum, d) => sum + (d?.line ? d.line.split(/\s+/).filter(Boolean).length : 0),
    0
  );
  const actionWords = (scene.action_text || "").split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round((dialogueWords / 2.3) + (actionWords / 6)));
}

function formatSec(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function derivePurpose(scene) {
  const emotion = (scene.dominant_emotion || "").toLowerCase();
  const theme = scene.themes?.[0];
  if (!emotion) return "Establish scene geography and character presence";
  return theme ? `Convey ${emotion} tone · touches on ${theme}` : `Convey ${emotion} emotional beat`;
}

export default function ShotList() {
  const { script } = useOutletContext();
  const [search, setSearch] = useState("");

  const analyzedScenes = useMemo(() => {
    if (!script) return [];
    return script.scenes.filter((s) => s.analyzed);
  }, [script]);

  const totalRuntimeSec = useMemo(() => {
    return analyzedScenes.reduce((sum, s) => sum + estimateDurationSec(s), 0);
  }, [analyzedScenes]);

  const rows = useMemo(() => {
    return analyzedScenes.map((s) => {
      const sec = estimateDurationSec(s);
      return {
        id: s.id,
        shot: s.scene_number,
        slugline: (s.slugline.split("-")[0] || s.slugline).trim(),
        fullSlugline: s.slugline,
        camera: s.cinematic?.camera || "Medium Shot",
        lens: s.cinematic?.lens_suggestion || "50mm Prime",
        movement: s.cinematic?.movement || "Static",
        lighting: s.cinematic?.lighting || "Natural Ambient",
        durationSec: sec,
        durationStr: formatSec(sec),
        purpose: derivePurpose(s),
        emotion: s.dominant_emotion || "Neutral",
      };
    });
  }, [analyzedScenes]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.fullSlugline.toLowerCase().includes(q) ||
        r.camera.toLowerCase().includes(q) ||
        r.lens.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (!script || !script.scenes.length) {
    return (
      <div className={styles.wrap}>
        <p style={{ color: "var(--text-dim)" }}>Upload a screenplay first to generate the derived shot list.</p>
      </div>
    );
  }

  if (!analyzedScenes.length) {
    return (
      <div className={styles.wrap}>
        <EmptyState
          title="No analyzed shots yet"
          body="The shot list is derived automatically from AI scene analysis — camera specs, lens choices, and movement per scene. Click 'Analyze All Scenes' in Script Viewer or Scene Explorer to build your shot list."
        />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* Metric Cards Summary Header */}
      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Shots</span>
          <span className={styles.metricValue}>{rows.length}</span>
          <span className={styles.metricSub}>Derived camera setups</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Est. Screenplay Runtime</span>
          <span className={styles.metricValue}>{formatSec(totalRuntimeSec)}</span>
          <span className={styles.metricSub}>Computed from pacing algorithm</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Primary Lens Setup</span>
          <span className={styles.metricValue}>35mm / 50mm</span>
          <span className={styles.metricSub}>Anamorphic & Prime lens spec</span>
        </div>
      </div>

      <div className={styles.timelineCard}>
        <div className={styles.timelineHeader}><span className={styles.metricLabel}>Scene Timeline</span><span className={styles.timelineHint}>Relative runtime by shot</span></div>
        <div className={styles.timelineTrack}>{rows.map((row) => <button key={row.id} className={styles.timelineSegment} style={{ flex: row.durationSec }} title={`Shot ${row.shot}: ${row.durationStr}`} onClick={() => setSearch(row.slugline)}><span>{String(row.shot).padStart(2, "0")}</span></button>)}</div>
      </div>

      {/* Controls & Search Toolbar */}
      <div className={styles.controlsBar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Filter shots by location, camera, or lens..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: 4 }}>
          Showing {filteredRows.length} of {rows.length} shots
        </span>
        <div style={{ marginLeft: "auto" }}>
          <Button ghost onClick={() => window.print()} style={{ fontSize: 12 }}>
            Print / Export Sheet
          </Button>
        </div>
      </div>

      {/* High-End Shot List Data Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Shot #</th>
              <th>Scene Slugline</th>
              <th>Camera & Lens</th>
              <th>Movement</th>
              <th>Est. Duration</th>
              <th>Emotional Beat</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className={styles.shotNum}>SHOT {String(r.shot).padStart(2, "0")}</span>
                </td>
                <td>
                  <span className={styles.sluglineText}>{r.slugline}</span>
                </td>
                <td>
                  <span className={styles.specBadge}>{r.camera}</span>
                  <span className={styles.specBadge}>{r.lens}</span>
                </td>
                <td>
                  <span className={styles.specBadge}>{r.movement}</span>
                </td>
                <td>
                  <span className={styles.duration}>{r.durationStr}</span>
                </td>
                <td>
                  <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{r.purpose}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
