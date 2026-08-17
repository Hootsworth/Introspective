import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import Modal from "../components/Modal";

import { Button, EmptyState } from "../components/ui";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useToast } from "../components/ToastProvider";
import styles from "./Dashboard.module.css";

const MODES = [
  { id: "local", label: "Local Only" },
  { id: "hybrid", label: "Hybrid" },
  { id: "cloud", label: "Cloud Only" },
];

export default function Dashboard({ projects, refreshProjects, theme, setTheme, loadError }) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);

  const [title, setTitle] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [mode, setMode] = useState("hybrid");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [recentIds, setRecentIds] = useLocalStorage("s2v-recent-projects", []);
  const [pinnedIds, setPinnedIds] = useLocalStorage("s2v-pinned-projects", []);
  const { notify } = useToast();

  function openProject(project) {
    setRecentIds([project.id, ...recentIds.filter((id) => id !== project.id)].slice(0, 6));
    navigate(`/projects/${project.id}/script`);
  }

  function togglePin(projectId, event) {
    event.stopPropagation();
    setPinnedIds(pinnedIds.includes(projectId) ? pinnedIds.filter((id) => id !== projectId) : [projectId, ...pinnedIds]);
    notify(pinnedIds.includes(projectId) ? "Project unpinned" : "Project pinned", { tone: "success" });
  }

  function openCreateModal() {
    setTitle("");
    setStylePrompt("");
    setMode("hybrid");
    setError(null);
    setCreating(true);
  }

  function openEditModal(project, e) {
    e.stopPropagation();
    setEditingProject(project);
    setTitle(project.title);
    setStylePrompt(project.style_prompt || "");
    setMode(project.ai_mode || "hybrid");
    setError(null);
  }

  function openDeleteModal(project, e) {
    e.stopPropagation();
    setDeletingProject(project);
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
      setCreating(false);
      notify("Project created", { tone: "success" });
      navigate(`/projects/${project.id}/script`);
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingProject || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateProject(editingProject.id, {
        title: title.trim(),
        style_prompt: stylePrompt.trim(),
        ai_mode: mode,
      });
      await refreshProjects();
      setEditingProject(null);
      notify("Project details saved", { tone: "success" });
    } catch (err) {
      setError(err.message || "Failed to update project");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deletingProject) return;
    setBusy(true);
    try {
      await api.deleteProject(deletingProject.id);
      await refreshProjects();
      setDeletingProject(null);
      notify("Project deleted", { tone: "success" });
    } catch (err) {
      setError(err.message || "Failed to delete project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.wrap}>
        <div className={styles.introRow}>
          <div>
            <div className={styles.eyebrow}>WORKSPACE OVERVIEW</div>
            <h2 className={styles.pageHeading}>Your production desk</h2>
            <p className={styles.pageIntro}>Keep every screenplay, scene, and visual decision in one focused workspace.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className={styles.summary}><span className={styles.summaryValue}>{projects.length}</span><span>active {projects.length === 1 ? "project" : "projects"}</span></div>
            <button
              type="button"
              className={styles.manifestoBtn}
              onClick={() => navigate("/manifesto")}
              title="Read our philosophy and commitment to filmmakers"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
              <span>For Filmmakers</span>
            </button>
            <Button primary onClick={openCreateModal}>
              + New Project
            </Button>
          </div>
        </div>
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
              title="No projects created yet"
              body="Create your first project to upload screenplays, analyze scenes, extract characters, build pitch decks, and generate storyboard animatics."
              action={
                <Button primary onClick={openCreateModal}>
                  + New Project
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className={styles.workspaceHint}><span>YOUR WORKSPACE</span><span>Pinned projects stay at the top · recently opened projects follow</span></div>
            <div className={styles.grid}>
            {[...projects].sort((a, b) => {
              const pinDelta = Number(pinnedIds.includes(b.id)) - Number(pinnedIds.includes(a.id));
              if (pinDelta) return pinDelta;
              return recentIds.indexOf(a.id) - recentIds.indexOf(b.id);
            }).map((p) => (
              <div
                key={p.id}
                className={styles.projectCard}
                onClick={() => openProject(p)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openProject(p)}
              >
                <div className={styles.projectTopline}>
                  <span className={styles.projectIndex}>{String(projects.indexOf(p) + 1).padStart(2, "0")}</span>
                  <button className={`${styles.pinBtn} ${pinnedIds.includes(p.id) ? styles.pinActive : ""}`} onClick={(e) => togglePin(p.id, e)} aria-label={pinnedIds.includes(p.id) ? `Unpin ${p.title}` : `Pin ${p.title}`} title={pinnedIds.includes(p.id) ? "Unpin project" : "Pin project"}>★</button>
                  <span className={styles.modeBadge}>{p.ai_mode}</span>
                </div>

                <div className={styles.projectContent}>
                  <div className={styles.projectTitle}>{p.title}</div>
                  {p.style_prompt && <div className={styles.styleTag}>{p.style_prompt}</div>}
                  <div className={styles.posterMeta}>
                    <span>{p.script_count} Script{p.script_count === 1 ? "" : "s"}</span>
                    <span>·</span>
                    <span>{p.character_count} Character{p.character_count === 1 ? "" : "s"}</span>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        openProject(p);
                      }}
                    >
                      Open
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => openEditModal(p, e)}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => openDeleteModal(p, e)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button className={styles.newProjectCard} onClick={openCreateModal}>
              <span className={styles.plus}>+</span>
              <span><strong>New project</strong><small>Start a screenplay workspace</small></span>
            </button>
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={creating} onClose={() => setCreating(false)} title="Create New Project">
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
            <Button type="button" ghost onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" primary disabled={busy || !title.trim()}>
              {busy ? "Creating…" : "Create Project"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title="Edit Project">
        <form onSubmit={handleUpdate} className={styles.modalForm}>
          {error && <div className={styles.modalError}>{error}</div>}

          <div className={styles.formRow}>
            <label className={styles.label}>Title</label>
            <input
              className={styles.input}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Visual style</label>
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
            <Button type="button" ghost onClick={() => setEditingProject(null)}>
              Cancel
            </Button>
            <Button type="submit" primary disabled={busy || !title.trim()}>
              {busy ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingProject} onClose={() => setDeletingProject(null)} title="Delete Project">
        <div style={{ padding: "10px 0" }}>
          <p style={{ fontSize: 14, color: "var(--text)", marginBottom: 16 }}>
            Are you sure you want to delete <strong>{deletingProject?.title}</strong>? This action cannot be undone and will delete all associated scripts, scenes, and generated assets.
          </p>
          <div className={styles.modalActions}>
            <Button type="button" ghost onClick={() => setDeletingProject(null)}>
              Cancel
            </Button>
            <Button type="button" primary onClick={handleDelete} disabled={busy} style={{ background: "#ef4444", borderColor: "#ef4444" }}>
              {busy ? "Deleting…" : "Delete Project"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
