import { useEffect, useState, useCallback } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
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
import FilmmakerManifesto from "./pages/FilmmakerManifesto";
import CommandPalette from "./components/CommandPalette";

export default function App() {
  const location = useLocation();
  const [theme, setTheme] = useTheme();
  const [projects, setProjects] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem("s2v-focus-mode") === "true");

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

  useEffect(() => {
    localStorage.setItem("s2v-focus-mode", String(focusMode));
  }, [focusMode]);

  useEffect(() => {
    function onKeyDown(event) {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      } else if (event.key === "Escape" && !commandOpen) {
        setFocusMode(false);
      } else if (event.key === "?" && !typing) {
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen]);

  const isDashboard = location.pathname === "/";
  const isManifesto = location.pathname === "/manifesto";
  const projectMatch = location.pathname.match(/\/projects\/([^/]+)/);
  const isFocusView = !isDashboard && !isManifesto && focusMode;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {!isDashboard && !isManifesto && !isFocusView && <Sidebar projects={projects} />}
      <main className="app-main" style={{ flex: 1, minWidth: 0 }}>
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
              <Route path="/manifesto" element={<FilmmakerManifesto />} />
            <Route
              path="/projects/:projectId"
              element={<ProjectLayout theme={theme} setTheme={setTheme} refreshProjects={refreshProjects} focusMode={focusMode} setFocusMode={setFocusMode} />}
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
      {isFocusView && <button className="focusExit" onClick={() => setFocusMode(false)}>Exit focus mode <span>Esc</span></button>}
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} projectId={projectMatch?.[1]} />
    </div>
  );
}
