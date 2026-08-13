import { useRef, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Button } from "../components/ui";
import styles from "./ScriptViewer.module.css";

export default function ScriptViewer() {
  const { project, scripts, script, activeScriptId, setActiveScriptId, refreshScripts, refreshScript, refreshCharacters } =
    useOutletContext();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(null);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setAnalysisError(null);
    setAnalysisSuccess(null);
    try {
      const uploaded = await api.uploadScript(project.id, file);
      await refreshScripts();
      setActiveScriptId(uploaded.id);
      await refreshCharacters();
    } catch (err) {
      setAnalysisError(err.message || "Failed to upload screenplay");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleAnalyzeAll(force = false) {
    if (!script) return;
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisSuccess(null);
    setProgress({ done: 0, total: script.scenes.length });
    const errors = [];
    let cachedCount = 0;
    let newCount = 0;
    try {
      let done = 0;
      await api.analyzeAllScenes(script.id, { mode_override: project.ai_mode, force }, (data) => {
        done += 1;
        if (data.status === "error" && data.error) {
          errors.push(`Scene ${data.scene_number}: ${data.error}`);
        } else if (data.status === "cached") {
          cachedCount += 1;
        } else if (data.status === "done") {
          newCount += 1;
        }
        setProgress({ done, total: script.scenes.length });
      });
      await refreshScript(script.id);
      if (errors.length > 0) {
        setAnalysisError(errors.join("\n"));
      } else {
        if (newCount > 0) {
          setAnalysisSuccess(`Successfully analyzed ${newCount} scene(s)! Click on Scene Explorer or Shot List to view breakdown.`);
        } else if (cachedCount > 0) {
          setAnalysisSuccess(`All ${cachedCount} scenes are already analyzed. Click "Force Re-analyze" to re-run AI analysis.`);
        }
      }
    } catch (err) {
      setAnalysisError(err.message || "Failed to analyze scenes");
    } finally {
      setAnalyzing(false);
    }
  }

  if (!scripts.length) {
    return (
      <div className={styles.wrap}>
        <div className={styles.uploadContainer}>
          <div className={styles.uploadCard}>
            <div className={styles.uploadTitle}>Upload a screenplay</div>
            <p className={styles.uploadBody}>
              Plain-text (.txt) screenplay in standard format — INT./EXT. sluglines, ALL-CAPS character
              cues, action lines. Script2Vision parses scenes, characters, and dialogue locally; nothing
              leaves your machine at this step.
            </p>
            <input ref={fileRef} type="file" accept=".txt,.fountain" onChange={handleUpload} style={{ display: "none" }} id="upload" />
            <Button primary onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "Parsing…" : "Choose File"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        {scripts.length > 1 && (
          <select className={styles.select} value={activeScriptId} onChange={(e) => setActiveScriptId(e.target.value)}>
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>{s.filename} ({s.scene_count} scenes)</option>
            ))}
          </select>
        )}
        <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Parsing…" : "Upload Another Script"}
        </Button>
        <input ref={fileRef} type="file" accept=".txt,.fountain" onChange={handleUpload} style={{ display: "none" }} />
        <div style={{ flex: 1 }} />
        <Button onClick={() => handleAnalyzeAll(true)} disabled={analyzing || !script?.scenes.length}>
          Force Re-analyze
        </Button>
        <Button primary onClick={() => handleAnalyzeAll(false)} disabled={analyzing || !script?.scenes.length}>
          {analyzing ? `Analyzing ${progress.done}/${progress.total}…` : "Analyze All Scenes"}
        </Button>
      </div>

      {analysisSuccess && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            color: "#10b981",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ flex: 1 }}>{analysisSuccess}</span>
          <Button primary onClick={() => navigate(`/projects/${project.id}/scenes`)}>
            Open Scene Explorer
          </Button>
        </div>
      )}

      {analysisError && (
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
          {analysisError}
        </div>
      )}

      {analyzing && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${(progress.done / (progress.total || 1)) * 100}%` }} />
        </div>
      )}

      {script && (
        <div className={styles.page}>
          <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 24, fontSize: 15, letterSpacing: "0.04em" }}>
            {script.parsed_title.toUpperCase()}
          </div>
          {script.scenes.map((scene) => (
            <div key={scene.id} style={{ marginBottom: 24 }}>
              <div className={styles.slugline}>
                <span className={styles.sceneNum}>{String(scene.scene_number).padStart(2, "0")}</span>
                <span style={{ flex: 1 }}>{scene.slugline}</span>

                {scene.analyzed && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {scene.dominant_emotion && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 12,
                          background: "var(--accent-amber-soft)",
                          color: "var(--accent-amber)",
                        }}
                      >
                        {scene.dominant_emotion}
                      </span>
                    )}
                    {scene.cinematic?.camera && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {scene.cinematic.camera}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {scene.action_text && <p className={styles.action}>{scene.action_text}</p>}
              {scene.dialogue.map((d, i) => (
                <div className={styles.dialogueBlock} key={i}>
                  <div className={styles.character}>{d.character}</div>
                  {d.parenthetical && <div className={styles.parenthetical}>({d.parenthetical})</div>}
                  <div className={styles.line}>{d.line}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
