import { useOutletContext } from "react-router-dom";
import { api } from "../api/client";
import uiStyles from "../components/ui.module.css";
import styles from "./ScriptViewer.module.css"; // reuse .wrap

const FORMATS = [
  { id: "json", label: "JSON", desc: "Full structured data — every scene, character, and analysis field. Best for feeding into other tools." },
  { id: "markdown", label: "Markdown", desc: "Readable scene-by-scene breakdown with cinematic notes. Good for sharing with a team." },
  { id: "pdf", label: "PDF", desc: "Formatted pre-production document with a character table and per-scene notes." },
  { id: "zip", label: "ZIP Package", desc: "Everything bundled together — JSON + Markdown + PDF, plus any generated images once an image backend is connected." },
];

export default function Exports() {
  const { project } = useOutletContext();

  return (
    <div className={styles.wrap}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, maxWidth: 900 }}>
        {FORMATS.map((f) => (
          <div key={f.id} className={uiStyles.card} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19 }}>{f.label}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5, flex: 1 }}>{f.desc}</div>
            <a
              href={api.exportUrl(project.id, f.id)}
              className={`${uiStyles.button} ${uiStyles.buttonPrimary}`}
              style={{ textDecoration: "none", justifyContent: "center" }}
            >
              Download {f.label}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
