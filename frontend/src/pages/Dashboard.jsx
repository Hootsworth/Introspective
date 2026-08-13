import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import Modal from "../components/Modal";
import TopBar from "../components/TopBar";
import { Button, EmptyState } from "../components/ui";
import uiStyles from "../components/ui.module.css";
import styles from "./Dashboard.module.css";

const MODES = [
  { id: "local", label: "Local Only" },
  { id: "hybrid", label: "Hybrid" },
  { id: "cloud", label: "Cloud Only" },
];

export default function Dashboard({ projects, refreshProjects, theme, setTheme, loadError }) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [mode, setMode] = useState("hybrid");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function openCreateModal() {
    setTitle("");
    setStylePrompt("");
    setMode("hybrid");
    setError(null);
    setCreating(true);
  }

  function closeCreateModal() {
    setCreating(false);
    setError(null);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const project = await api.createProject({
        title: title.trim(),
        style_prompt: stylePrompt.trim(),
        ai_mode: mode,
      });
      await refreshProjects();
      closeCreateModal();
      navigate(`/projects/${project.id}/script`);
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar
        title="Projects"
        subtitle="Manage screenplays, scenes, characters, and pre-production assets"
        theme={theme}
        setTheme={setTheme}
        right={
          <Button primary onClick={openCreateModal}>
            + New Project
          </Button>
        }
      />

      <div className={styles.wrap}>
        {loadError && (
          <div className={styles.errorBanner}>
            <span>{loadError}</span>
            <Button ghost style={{ marginLeft: "auto", fontSize: 12 }} onClick={() => refreshProjects()}>
              Retry
            </Button>
          </div>
        )}

        {projects.length === 0 ? (
          <div className={styles.emptyContainer}>
            <EmptyState
              title="No projects yet"
              body="A project holds one or more screenplays, their scenes, characters, and every asset generated from them. Start by creating one — you'll upload a screenplay on the next screen."
              action={
                <Button primary onClick={openCreateModal}>
                  + New Project
                </Button>
              }
            />
          </div>
        ) : (
          <div className={styles.grid}>
            {projects.map((p) => (
              <div
                key={p.id}
                className={`${uiStyles.card} ${styles.projectCard}`}
                onClick={() => navigate(`/projects/${p.id}/script`)}
              >
                <div className={styles.projectTitle}>{p.title}</div>
                {p.style_prompt && <div className={styles.styleTag}>{p.style_prompt}</div>}
                <div className={styles.projectMeta}>
                  <span>
                    {p.script_count} script{p.script_count === 1 ? "" : "s"}
                  </span>
                  <span>
                    {p.character_count} character{p.character_count === 1 ? "" : "s"}
                  </span>
                  <span style={{ marginLeft: "auto", textTransform: "capitalize" }}>{p.ai_mode}</span>
                </div>
              </div>
            ))}

            <button className={styles.newProjectCard} onClick={openCreateModal}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-dim)" }}>
                + New Project
              </span>
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={creating} onClose={closeCreateModal} title="Create New Project">
        <form onSubmit={handleCreate} className={styles.modalForm}>
          {error && <div className={styles.modalError}>{error}</div>}

          <div className={styles.formRow}>
            <label className={styles.label}>Title</label>
            <input
              className={styles.input}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blue Hour"
              required
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Visual style (optional)</label>
            <input
              className={styles.input}
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="Neo noir, vintage Kodak, high contrast..."
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>AI mode</label>
            <div className={styles.modeRow}>
              {MODES.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={`${styles.modeBtn} ${mode === m.id ? styles.modeBtnActive : ""}`}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.modalActions}>
            <Button type="button" ghost onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button type="submit" primary disabled={busy || !title.trim()}>
              {busy ? "Creating…" : "Create Project"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
