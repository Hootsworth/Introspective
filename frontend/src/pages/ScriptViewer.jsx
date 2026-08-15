import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Button } from "../components/ui";
import { useToast } from "../components/ToastProvider";
import LoadingState from "../components/LoadingState";
import styles from "./ScriptViewer.module.css";

function IconUploadPlus() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
}

function EditableText({ value, onSave, className, multiline = false }) {
  return <div className={className} contentEditable suppressContentEditableWarning role="textbox" aria-label="Editable screenplay text" spellCheck={multiline} onBlur={(event) => onSave(event.currentTarget.textContent || "")}>{value}</div>;
}

const NOTE_COLORS = ["yellow", "blue", "pink", "green"];

export default function ScriptViewer() {
  const { project, scripts, script, activeScriptId, setActiveScriptId, refreshScripts, refreshScript, refreshCharacters } = useOutletContext();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(null);
  const [page, setPage] = useState(1);
  const [notesOpen, setNotesOpen] = useState(true);
  const [notes, setNotes] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savedAt, setSavedAt] = useState(null);
  const { notify } = useToast();
  const storageKey = script ? `s2v-notes-${project.id}-${script.id}` : null;
  const draftKey = script ? `s2v-draft-${project.id}-${script.id}` : null;

  useEffect(() => {
    setPage(1);
    if (!storageKey) return;
    try {
      setNotes(JSON.parse(localStorage.getItem(storageKey) || "[]"));
      setDrafts(JSON.parse(localStorage.getItem(draftKey) || "{}"));
    } catch { setNotes([]); setDrafts({}); }
  }, [storageKey, draftKey]);

  const pages = useMemo(() => {
    if (!script?.scenes) return [];
    const chunks = [];
    for (let index = 0; index < script.scenes.length; index += 2) chunks.push(script.scenes.slice(index, index + 2));
    return chunks;
  }, [script]);

  function saveNotes(nextNotes) { setNotes(nextNotes); if (storageKey) localStorage.setItem(storageKey, JSON.stringify(nextNotes)); }
  function addNote() { saveNotes([{ id: crypto.randomUUID(), text: "", color: NOTE_COLORS[notes.length % NOTE_COLORS.length] }, ...notes]); }
  function updateNote(id, patch) { saveNotes(notes.map((note) => note.id === id ? { ...note, ...patch } : note)); }
  function removeNote(id) {
    const removed = notes.find((note) => note.id === id);
    saveNotes(notes.filter((note) => note.id !== id));
    notify("Note removed", { action: { label: "Undo", onClick: () => saveNotes([removed, ...notes.filter((note) => note.id !== id)]) } });
  }
  function saveDraft(key, value) { const next = { ...drafts, [key]: value }; setDrafts(next); if (draftKey) localStorage.setItem(draftKey, JSON.stringify(next)); setSavedAt(new Date()); }
  function valueFor(key, fallback) { return Object.prototype.hasOwnProperty.call(drafts, key) ? drafts[key] : fallback; }

  async function handleUpload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setAnalysisError(null); setAnalysisSuccess(null);
    try { const uploaded = await api.uploadScript(project.id, file); await refreshScripts(); setActiveScriptId(uploaded.id); await refreshCharacters(); notify("Screenplay uploaded", { tone: "success" }); }
    catch (err) { setAnalysisError(err.message || "Failed to upload screenplay"); notify(err.message || "Upload failed", { tone: "error", duration: 0 }); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function handleAnalyzeAll(force = false) {
    if (!script) return;
    setAnalyzing(true); setAnalysisError(null); setAnalysisSuccess(null); setProgress({ done: 0, total: script.scenes.length });
    const errors = []; let cachedCount = 0; let newCount = 0;
    try {
      let done = 0;
      await api.analyzeAllScenes(script.id, { mode_override: project.ai_mode, force }, (data) => {
        done += 1;
        if (data.status === "error" && data.error) errors.push(`Scene ${data.scene_number}: ${data.error}`);
        else if (data.status === "cached") cachedCount += 1;
        else if (data.status === "done") newCount += 1;
        setProgress({ done, total: script.scenes.length });
      });
      await refreshScript(script.id);
      if (errors.length) setAnalysisError(errors.join("\n"));
      else if (newCount) { setAnalysisSuccess(`Successfully analyzed ${newCount} scene(s).`); notify(`${newCount} scene${newCount === 1 ? "" : "s"} analyzed`, { tone: "success" }); }
      else if (cachedCount) setAnalysisSuccess(`All ${cachedCount} scenes are already analyzed.`);
    } catch (err) { setAnalysisError(err.message || "Failed to analyze scenes"); notify(err.message || "Analysis failed", { tone: "error", duration: 0 }); }
    finally { setAnalyzing(false); }
  }

  if (!scripts.length) return <div className={styles.wrap}><div className={styles.uploadContainer}><div className={styles.uploadCard}><div className={styles.uploadTitle}>Upload Screenplay</div><p className={styles.uploadBody}>Upload a plain-text (.txt or .fountain) screenplay. Introspective automatically parses sluglines, dialogue, and characters locally.</p><input ref={fileRef} type="file" accept=".txt,.fountain" onChange={handleUpload} style={{ display: "none" }} /><Button primary onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "Parsing Screenplay…" : "Choose File"}</Button></div></div></div>;
  if (!script) return <LoadingState label="Preparing screenplay" />;

  const currentScenes = pages[page - 1] || [];
  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        {scripts.length > 1 && <select className={styles.select} value={activeScriptId} onChange={(e) => setActiveScriptId(e.target.value)}>{scripts.map((s) => <option key={s.id} value={s.id}>{s.filename} ({s.scene_count} scenes)</option>)}</select>}
        <button className={styles.iconBtn} onClick={() => fileRef.current?.click()} disabled={uploading}><IconUploadPlus /><span>Upload Script</span></button>
        <input ref={fileRef} type="file" accept=".txt,.fountain" onChange={handleUpload} style={{ display: "none" }} />
        <div className={styles.toolbarSpacer} />
        <button className={`${styles.toolBtn} ${notesOpen ? styles.toolBtnActive : ""}`} onClick={() => setNotesOpen((open) => !open)}>Notes <span className={styles.count}>{notes.length}</span></button>
        <Button ghost onClick={() => handleAnalyzeAll(true)} disabled={analyzing || !script?.scenes.length}>Force Re-analyze</Button>
        <Button primary onClick={() => handleAnalyzeAll(false)} disabled={analyzing || !script?.scenes.length}>{analyzing ? `Analyzing ${progress.done}/${progress.total}…` : "Analyze All Scenes"}</Button>
      </div>
      {analysisSuccess && <div className={styles.successBanner}><span>{analysisSuccess}</span><Button primary onClick={() => navigate(`/projects/${project.id}/scenes`)}>Open Scene Explorer</Button></div>}
      {analysisError && <div className={styles.errorBanner}>{analysisError}</div>}
      {analyzing && <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${(progress.done / (progress.total || 1)) * 100}%` }} /></div>}
      <div className={styles.workspace}>
        <section className={styles.readerColumn}>
          <div className={styles.readerHeader}><div><div className={styles.readerKicker}>SCREENPLAY / EDITORIAL VIEW</div><div className={styles.readerTitle}>{script.parsed_title}</div></div><div className={styles.pageCount}>PAGE <strong>{String(page).padStart(2, "0")}</strong> / {String(pages.length).padStart(2, "0")}</div></div>
          <div className={styles.pageNav}><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>← Previous</button><div className={styles.pageDots}>{pages.map((_, index) => <button key={index} aria-label={`Go to page ${index + 1}`} className={index + 1 === page ? styles.pageDotActive : styles.pageDot} onClick={() => setPage(index + 1)} />)}</div><button onClick={() => setPage((current) => Math.min(pages.length, current + 1))} disabled={page === pages.length}>Next →</button></div>
          <article className={styles.page}>
            <div className={styles.paperMeta}><span>{script.filename}</span><span>INTROSPECTIVE EDITOR</span></div><div className={styles.scriptTitleHeader}>{script.parsed_title.toUpperCase()}</div><div className={styles.scriptDivider} />
            {currentScenes.map((scene) => <div key={scene.id} className={styles.sceneBlock}><div className={styles.sluglineRow}><div className={styles.sluglineMain}><span className={styles.sceneNum}>SHOT {String(scene.scene_number).padStart(2, "0")}</span><span className={styles.sluglineText}>{scene.slugline}</span></div>{scene.analyzed && <div className={styles.sceneTags}>{scene.dominant_emotion && <span className={styles.emotionBadge}>{scene.dominant_emotion}</span>}{scene.cinematic?.camera && <span className={styles.specTag}>{scene.cinematic.camera}</span>}</div>}</div>{scene.action_text && <EditableText multiline className={styles.actionText} value={valueFor(`${scene.id}:action`, scene.action_text)} onSave={(value) => saveDraft(`${scene.id}:action`, value)} />}{scene.dialogue.map((dialogue, index) => <div className={styles.dialogueBlock} key={index}><div className={styles.characterCue}>{dialogue.character}</div>{dialogue.parenthetical && <div className={styles.parenthetical}>({dialogue.parenthetical})</div>}<EditableText className={styles.dialogueLine} value={valueFor(`${scene.id}:dialogue:${index}`, dialogue.line)} onSave={(value) => saveDraft(`${scene.id}:dialogue:${index}`, value)} /></div>)}</div>)}
            <div className={styles.paperFooter}><span>Editable draft · {savedAt ? `saved ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "saved on this device"}</span><span>{page} / {pages.length}</span></div>
          </article>
        </section>
        {notesOpen && <aside className={styles.notesRail}><div className={styles.notesHeader}><div><div className={styles.readerKicker}>ANNOTATIONS</div><h2>Working notes</h2></div><button className={styles.addNoteBtn} onClick={addNote}>＋ Add note</button></div><p className={styles.notesHint}>Capture ideas, questions, and page-specific reminders while you read.</p><div className={styles.notesList}>{notes.length === 0 && <div className={styles.notesEmpty}>No notes yet.<br />Add a sticky note to begin.</div>}{notes.map((note) => <div key={note.id} className={`${styles.stickyNote} ${styles[`note${note.color[0].toUpperCase()}${note.color.slice(1)}`]}`}><div className={styles.stickyTop}><span className={styles.pin} /><select aria-label="Note color" value={note.color} onChange={(e) => updateNote(note.id, { color: e.target.value })}>{NOTE_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}</select><button onClick={() => removeNote(note.id)} aria-label="Delete note">×</button></div><textarea autoFocus={!note.text} placeholder="Write a thought…" value={note.text} onChange={(e) => updateNote(note.id, { text: e.target.value })} /></div>)}</div></aside>}
      </div>
    </div>
  );
}
