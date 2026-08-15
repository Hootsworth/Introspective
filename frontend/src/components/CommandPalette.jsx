import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CommandPalette.module.css";

const COMMANDS = [
  ["Dashboard", "⌂", "/"],
  ["Script Viewer", "01", "script"],
  ["Scene Explorer", "02", "scenes"],
  ["Shot List", "03", "shotlist"],
  ["Director Notes", "04", "notes"],
  ["Characters", "05", "characters"],
  ["Mood Board", "06", "moodboard"],
  ["Storyboard Studio", "07", "storyboard"],
  ["Settings", "⌘", "/settings"],
];

export default function CommandPalette({ open, onClose, projectId }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const commands = useMemo(() => COMMANDS.filter(([label]) => label.toLowerCase().includes(query.toLowerCase())), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowDown") { event.preventDefault(); setSelected((index) => Math.min(index + 1, commands.length - 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); setSelected((index) => Math.max(index - 1, 0)); }
      if (event.key === "Enter" && commands[selected]) {
        const [, , path] = commands[selected];
        if (path === "/" || path === "/settings") navigate(path);
        else if (projectId) navigate(`/projects/${projectId}/${path}`);
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, commands, selected, navigate, projectId]);

  if (!open) return null;
  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.panel} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette">
        <div className={styles.searchRow}><span className={styles.searchIcon}>⌕</span><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0); }} placeholder="Jump to a workspace view…" /><kbd>ESC</kbd></div>
        <div className={styles.list}>
          {commands.length ? commands.map(([label, icon, path], index) => (
            <button key={label} className={`${styles.command} ${index === selected ? styles.selected : ""}`} onMouseEnter={() => setSelected(index)} onClick={() => { if (path === "/" || path === "/settings") navigate(path); else if (projectId) navigate(`/projects/${projectId}/${path}`); onClose(); }}>
              <span className={styles.icon}>{icon}</span><span>{label}</span><span className={styles.arrow}>↵</span>
            </button>
          )) : <div className={styles.empty}>No matching views</div>}
        </div>
        <div className={styles.footer}><span>↑↓ Navigate</span><span>↵ Open</span><span>⌘K Anytime</span></div>
      </div>
    </div>
  );
}
