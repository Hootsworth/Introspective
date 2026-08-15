import { useNavigate } from "react-router-dom";
import styles from "./TopBar.module.css";

function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function TopBar({ title, subtitle, right, backTo, backLabel }) {
  const navigate = useNavigate();
  return (
    <div className={styles.bar}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {backTo && (
          <button className={styles.backBtn} onClick={() => navigate(backTo)} title="Go back">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <IconBack /> {backLabel || "Back"}
            </span>
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && (
            <span className={styles.subtitle}>{subtitle}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {right}
      </div>
    </div>
  );
}
