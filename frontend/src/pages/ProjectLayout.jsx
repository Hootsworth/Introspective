import { useCallback, useEffect, useState } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import TopBar from "../components/TopBar";

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
      />
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
