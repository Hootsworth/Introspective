import { useRef, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Button } from "../components/ui";
import styles from "./ScriptViewer.module.css";

function IconUploadPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

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
          setAnalysisSuccess(`Successfully analyzed ${newCount} scene(s)! Click on Scene Explorer or Storyboard to view breakdown.`);
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
            <div className={styles.uploadTitle}>Upload Screenplay</div>
            <p className={styles.uploadBody}>
              Upload a plain-text (.txt or .fountain) screenplay. Introspective automatically parses INT./EXT. sluglines, scene numbers, dialogue, and characters locally.
            </p>
            <input ref={fileRef} type="file" accept=".txt,.fountain" onChange={handleUpload} style={{ display: "none" }} id="upload" />
            <Button primary onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "Parsing Screenplay…" : "Choose File"}
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

        <button
          className={styles.iconBtn}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Upload another script"
        >
          <IconUploadPlus />
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>Upload Script</span>
        </button>
        <input ref={fileRef} type="file" accept=".txt,.fountain" onChange={handleUpload} style={{ display: "none" }} />

        <div style={{ flex: 1 }} />

        <Button ghost onClick={() => handleAnalyzeAll(true)} disabled={analyzing || !script?.scenes.length} style={{ fontSize: 12 }}>
          Force Re-analyze
        </Button>

        <Button primary onClick={() => handleAnalyzeAll(false)} disabled={analyzing || !script?.scenes.length} style={{ fontSize: 12 }}>
          {analyzing ? `Analyzing ${progress.done}/${progress.total}…` : "Analyze All Scenes"}
        </Button>
      </div>

      {analysisSuccess && (
        <div className={styles.successBanner}>
          <span style={{ flex: 1 }}>{analysisSuccess}</span>
          <Button primary onClick={() => navigate(`/projects/${project.id}/scenes`)} style={{ fontSize: 12 }}>
            Open Scene Explorer
          </Button>
        </div>
      )}

      {analysisError && <div className={styles.errorBanner}>{analysisError}</div>}

      {analyzing && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${(progress.done / (progress.total || 1)) * 100}%` }} />
        </div>
      )}

      {script && (
        <div className={styles.page}>
          <div className={styles.scriptTitleHeader}>
            {script.parsed_title.toUpperCase()}
          </div>
          <div className={styles.scriptDivider} />

          {script.scenes.map((scene) => (
            <div key={scene.id} className={styles.sceneBlock}>
              <div className={styles.sluglineRow}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <span className={styles.sceneNum}>SHOT {String(scene.scene_number).padStart(2, "0")}</span>
                  <span className={styles.sluglineText}>{scene.slugline}</span>
                </div>

                {scene.analyzed && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {scene.dominant_emotion && (
                      <span className={styles.emotionBadge}>
                        {scene.dominant_emotion}
                      </span>
                    )}
                    {scene.cinematic?.camera && (
                      <span className={styles.specTag}>
                        {scene.cinematic.camera}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {scene.action_text && <p className={styles.actionText}>{scene.action_text}</p>}

              {scene.dialogue.map((d, i) => (
                <div className={styles.dialogueBlock} key={i}>
                  <div className={styles.characterCue}>{d.character}</div>
                  {d.parenthetical && <div className={styles.parenthetical}>({d.parenthetical})</div>}
                  <div className={styles.dialogueLine}>{d.line}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
