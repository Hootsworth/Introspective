import { NavLink, useLocation, useNavigate } from "react-router-dom";
import styles from "./Sidebar.module.css";

const ICONS = {
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
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

function IconLeave() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function Sidebar({ projects }) {
  const navigate = useNavigate();
  const location = useLocation();
  const match = location.pathname.match(/\/projects\/([^\/]+)/);
  const projectId = match ? match[1] : null;
  const activeProject = projects?.find((p) => p.id === projectId);

  const preProdNav = [
    { to: "script", icon: "script", label: "Script Viewer" },
    { to: "scenes", icon: "scenes", label: "Scene Explorer" },
    { to: "shotlist", icon: "shotlist", label: "Shot List" },
    { to: "notes", icon: "notes", label: "Director Notes" },
  ];

  const visualNav = [
    { to: "storyboard", icon: "storyboard", label: "Storyboard Studio" },
    { to: "moodboard", icon: "moodboard", label: "Mood Board" },
    { to: "characters", icon: "characters", label: "Characters" },
    { to: "graph", icon: "graph", label: "Relationship Graph" },
    { to: "exports", icon: "exports", label: "Exports" },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <img src="/logo.png" className={styles.brandIcon} alt="Introspective Logo" />
        <span className={styles.brandText}>Introspective</span>
      </div>

      {activeProject && (
        <>
          <nav className={styles.section}>
            <div className={styles.sectionLabel}>PRE-PRODUCTION</div>
            {preProdNav.map((item) => (
              <NavLink
                key={item.to}
                to={`/projects/${projectId}/${item.to}`}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
              >
                <Icon name={item.icon} /> {item.label}
              </NavLink>
            ))}
          </nav>

          <nav className={styles.section}>
            <div className={styles.sectionLabel}>VISUAL STUDIO</div>
            {visualNav.map((item) => (
              <NavLink
                key={item.to}
                to={`/projects/${projectId}/${item.to}`}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
              >
                <Icon name={item.icon} /> {item.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}

      <nav className={styles.section}>
        <div className={styles.sectionLabel}>SETTINGS</div>
        <NavLink to="/settings" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}>
          <Icon name="settings" /> Settings
        </NavLink>
      </nav>

      <div className={styles.spacer} />

      <button className={styles.leaveBtn} onClick={() => navigate("/")}>
        <IconLeave /> Leave Project
      </button>
    </aside>
  );
}
