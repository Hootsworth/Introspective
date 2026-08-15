import styles from "./ui.module.css";

export function Button({ children, primary, ghost, type = "button", ...rest }) {
  const cls = [styles.button, primary ? styles.buttonPrimary : "", ghost ? styles.buttonGhost : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Pill({ tone = "neutral", children }) {
  const toneClass = { amber: styles.pillAmber, teal: styles.pillTeal, neutral: styles.pillNeutral }[tone];
  return <span className={`${styles.pill} ${toneClass}`}>{children}</span>;
}

export function EmptyState({ title, body, action }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateTitle}>{title}</div>
      <div className={styles.emptyStateBody}>{body}</div>
      {action}
    </div>
  );
}

export function Meter({ label, value, tone = "amber" }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = tone === "amber" ? "var(--accent-amber)" : "var(--accent-teal)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
      <span style={{ color: "var(--text-faint)", width: 52, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--border-soft)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", width: 28, textAlign: "right" }}>
        {value != null ? pct : "–"}
      </span>
    </div>
  );
}

export function SlateBadge({ children }) {
  return <span className={styles.slateBadge}>{children}</span>;
}
