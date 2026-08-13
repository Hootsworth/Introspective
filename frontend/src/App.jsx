import { useEffect, useState, useCallback } from "react";
import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { useTheme } from "./hooks/useTheme";
import { api } from "./api/client";

import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import ProjectLayout from "./pages/ProjectLayout";
import ScriptViewer from "./pages/ScriptViewer";
import SceneExplorer from "./pages/SceneExplorer";
import CharacterExplorer from "./pages/CharacterExplorer";
import RelationshipGraph from "./pages/RelationshipGraph";
import ShotList from "./pages/ShotList";
import DirectorNotes from "./pages/DirectorNotes";
import Exports from "./pages/Exports";
import ImageStub from "./pages/ImageStub";

export default function App() {
  const [theme, setTheme] = useTheme();
  const [projects, setProjects] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const refreshProjects = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await api.listProjects();
      setProjects(data);
      return data;
    } catch (err) {
      setLoadError(err.message || "Failed to connect to backend server");
    }
  }, []);

  useEffect(() => {
    refreshProjects().finally(() => setLoaded(true));
  }, [refreshProjects]);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar projects={projects} />
      <main style={{ flex: 1, minWidth: 0 }}>
        {loaded && (
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  projects={projects}
                  refreshProjects={refreshProjects}
                  theme={theme}
                  setTheme={setTheme}
                  loadError={loadError}
                />
              }
            />
            <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} />} />
            <Route
              path="/projects/:projectId"
              element={<ProjectLayout theme={theme} setTheme={setTheme} refreshProjects={refreshProjects} />}
            >
              <Route path="script" element={<ScriptViewer />} />
              <Route path="scenes" element={<SceneExplorer />} />
              <Route path="characters" element={<CharacterExplorer />} />
              <Route path="graph" element={<RelationshipGraph />} />
              <Route path="storyboard" element={<ImageStub kind="storyboard" />} />
              <Route path="moodboard" element={<ImageStub kind="moodboard" />} />
              <Route path="shotlist" element={<ShotList />} />
              <Route path="notes" element={<DirectorNotes />} />
              <Route path="exports" element={<Exports />} />
            </Route>
          </Routes>
        )}
      </main>
    </div>
  );
}
