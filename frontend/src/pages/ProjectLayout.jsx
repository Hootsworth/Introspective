import { useCallback, useEffect, useState } from "react";
import { Outlet, useParams, useNavigate, NavLink } from "react-router-dom";
import { api } from "../api/client";
import TopBar from "../components/TopBar";

const NAV_ITEMS = [
  { path: "script", label: "Script Viewer" },
  { path: "scenes", label: "Scene Explorer" },
  { path: "storyboard", label: "Storyboard Studio" },
  { path: "moodboard", label: "Mood Board" },
  { path: "shotlist", label: "Shot List" },
  { path: "characters", label: "Characters" },
  { path: "graph", label: "Relationship Graph" },
  { path: "notes", label: "Director Notes" },
  { path: "exports", label: "Exports" },
];

export default function ProjectLayout({ theme, setTheme, refreshProjects }) {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [activeScriptId, setActiveScriptId] = useState(null);
  const [script, setScript] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshCharacters = useCallback(async () => {
    if (!projectId) return;
    const data = await api.listCharacters(projectId);
    setCharacters(data);
  }, [projectId]);

  const refreshScript = useCallback(async (scriptId) => {
    const id = scriptId || activeScriptId;
    if (!id) return;
    const data = await api.getScript(id);
    setScript(data);
  }, [activeScriptId]);

  const refreshScripts = useCallback(async () => {
    const list = await api.listScripts(projectId);
    setScripts(list);
    if (list.length && !activeScriptId) {
      setActiveScriptId(list[list.length - 1].id);
    }
    return list;
  }, [projectId, activeScriptId]);

  const refreshProject = useCallback(async () => {
    const p = await api.getProject(projectId);
    setProject(p);
    return p;
  }, [projectId]);

  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([refreshProject(), refreshScripts(), refreshCharacters()])
      .catch((err) => setError(err.message || "Failed to load project details"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (activeScriptId) refreshScript(activeScriptId);
  }, [activeScriptId, refreshScript]);

  async function updateProjectSettings(patch) {
    const updated = await api.updateProject(projectId, {
      title: project.title,
      style_prompt: project.style_prompt,
      ai_mode: project.ai_mode,
      ...patch,
    });
    setProject((prev) => ({ ...prev, ...updated }));
    refreshProjects();
  }

  if (error) {
    return (
      <div style={{ padding: 32, maxWidth: 600 }}>
        <div style={{ color: "#ef4444", marginBottom: 16, fontSize: 14 }}>{error}</div>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "8px 16px",
            background: "var(--accent-cyan)",
            color: "#000",
            fontWeight: 600,
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (loading || !project) {
    return <div style={{ padding: 32, color: "var(--text-dim)" }}>Loading project…</div>;
  }

  return (
    <>
      <TopBar
        title={project.title}
        subtitle={project.style_prompt || "No visual style set"}
        theme={theme}
        setTheme={setTheme}
        backTo="/"
        backLabel="Projects"
      />
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "0 32px 14px",
          overflowX: "auto",
          borderBottom: "1px solid var(--border-soft)",
          marginBottom: 24,
        }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={`/projects/${projectId}/${item.path}`}
            style={({ isActive }) => ({
              padding: "6px 14px",
              fontSize: 12.5,
              fontWeight: isActive ? 600 : 500,
              borderRadius: 6,
              textDecoration: "none",
              background: isActive ? "var(--accent-cyan)" : "transparent",
              color: isActive ? "#090d16" : "var(--text-dim)",
              border: "1px solid " + (isActive ? "var(--accent-cyan)" : "transparent"),
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <Outlet
        context={{
          project, scripts, script, activeScriptId, setActiveScriptId,
          characters, refreshCharacters, refreshScript, refreshScripts,
          refreshProject, updateProjectSettings, navigate,
        }}
      />
    </>
  );
}
