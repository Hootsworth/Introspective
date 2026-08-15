import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import styles from "./ProjectSearch.module.css";

export default function ProjectSearch({ projectId }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.getElementById("project-search")?.focus(); }
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") { event.preventDefault(); document.getElementById("project-search")?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => {
    if (!query.trim()) { setResults([]); return undefined; }
    const timer = setTimeout(() => api.searchProject(projectId, query).then(setResults).catch(() => setResults([])), 220);
    return () => clearTimeout(timer);
  }, [projectId, query]);
  return <div className={styles.search}>
    <span className={styles.icon}>⌕</span>
    <input id="project-search" aria-label="Search project" placeholder="Search project…" value={query} onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setQuery(""); } }} />
    {open && query.trim() && <div className={styles.results}>{results.length ? results.map((result) => <button key={`${result.kind}-${result.id}`} onClick={() => { navigate(result.url); setOpen(false); }}><span className={styles.kind}>{result.kind}</span><span><strong>{result.title}</strong><small>{result.detail}</small></span></button>) : <div className={styles.empty}>No project matches</div>}</div>}
  </div>;
}
