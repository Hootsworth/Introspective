import { NavLink, useParams } from "react-router-dom";
import styles from "./Sidebar.module.css";

const ICONS = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z",
  script: "M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM8 12h8v1.5H8V12Zm0 4h8v1.5H8V16Zm0-8h4v1.5H8V8Z",
  scenes: "M3 5h18v3H3V5Zm0 5.5h18v3H3v-3ZM3 16h18v3H3v-3Z",
  characters: "M12 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 12c5 0 9 2.5 9 6v2H3v-2c0-3.5 4-6 9-6Z",
  graph: "M5 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm14 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM5 15a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm2.2-8.7 9.6 6.9M7.2 17.3l9.6-6.9",
  storyboard: "M3 5h7v6H3V5Zm9 0h9v6h-9V5ZM3 13h9v6H3v-6Zm11 0h7v6h-7v-6Z",
  moodboard: "M4 4h7v7H4V4Zm9 0h7v4h-7V4Zm0 6h7v10h-7V10ZM4 13h7v7H4v-7Z",
  shotlist: "M4 5h16v2H4V5Zm0 6h16v2H4v-2Zm0 6h10v2H4v-2Z",
  notes: "M6 2h9l5 5v15H6V2Zm2 9h8v1.5H8V11Zm0 4h8v1.5H8V15Zm0-8h5v1.5H8V7Z",
  exports: "M12 3v11m0 0 4-4m-4 4-4-4M5 19h14v2H5v-2Z",
  settings: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm8.4 4a7.9 7.9 0 0 0-.15-1.5l2.1-1.6-2-3.4-2.5 1a8 8 0 0 0-2.6-1.5L14.8 2H9.2l-.45 2.5a8 8 0 0 0-2.6 1.5l-2.5-1-2 3.4 2.1 1.6A7.9 7.9 0 0 0 3.6 12c0 .5.05 1 .15 1.5l-2.1 1.6 2 3.4 2.5-1a8 8 0 0 0 2.6 1.5l.45 2.5h5.6l.45-2.5a8 8 0 0 0 2.6-1.5l2.5 1 2-3.4-2.1-1.6c.1-.5.15-1 .15-1.5Z",
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function Sidebar({ projects }) {
  const { projectId } = useParams();
  const activeProject = projects?.find((p) => p.id === projectId);

  const projectNav = [
    { to: "script", icon: "script", label: "Script Viewer" },
    { to: "scenes", icon: "scenes", label: "Scene Explorer" },
    { to: "characters", icon: "characters", label: "Character Explorer" },
    { to: "graph", icon: "graph", label: "Relationship Graph" },
    { to: "storyboard", icon: "storyboard", label: "Storyboard" },
    { to: "moodboard", icon: "moodboard", label: "Mood Board" },
    { to: "shotlist", icon: "shotlist", label: "Shot List" },
    { to: "notes", icon: "notes", label: "Director Notes" },
    { to: "exports", icon: "exports", label: "Exports" },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.slate} aria-hidden="true" />
        <span className={styles.brandText}>Introspective</span>
      </div>

      <nav className={styles.section}>
        <div className={styles.sectionLabel}>Library</div>
        <NavLink to="/" end className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}>
          <Icon name="dashboard" /> Dashboard
        </NavLink>
      </nav>

      {activeProject && (
        <nav className={styles.section}>
          <div className={styles.sectionLabel}>{activeProject.title}</div>
          {projectNav.map((item) => (
            <NavLink
              key={item.to}
              to={`/projects/${projectId}/${item.to}`}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
            >
              <Icon name={item.icon} /> {item.label}
            </NavLink>
          ))}
        </nav>
      )}

      <div className={styles.spacer} />

      <nav className={styles.section}>
        <NavLink to="/settings" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}>
          <Icon name="settings" /> Settings
        </NavLink>
      </nav>
    </aside>
  );
}
