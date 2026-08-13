import { useNavigate } from "react-router-dom";
import styles from "./TopBar.module.css";

export default function TopBar({ title, subtitle, theme, setTheme, right, backTo, backLabel }) {
  const navigate = useNavigate();
  return (
    <div className={styles.bar}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {backTo && (
          <button className={styles.backBtn} onClick={() => navigate(backTo)} title="Go back">
            ← {backLabel || "Back"}
          </button>
        )}
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {right}
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${theme === "light" ? styles.toggleBtnActive : ""}`}
            onClick={() => setTheme("light")}
          >
            Light
          </button>
          <button
            className={`${styles.toggleBtn} ${theme === "dark" ? styles.toggleBtnActive : ""}`}
            onClick={() => setTheme("dark")}
          >
            Dark
          </button>
        </div>
      </div>
    </div>
  );
}
