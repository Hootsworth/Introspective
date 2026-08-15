import styles from "./LoadingState.module.css";

export default function LoadingState({ label = "Loading workspace", compact = false }) {
  return (
    <div className={`${styles.loading} ${compact ? styles.compact : ""}`} role="status" aria-live="polite">
      <span className={styles.mark} aria-hidden="true">
        <span className={styles.markCore} />
      </span>
      <span className={styles.copy}>
        <strong>{label}</strong>
        <span className={styles.sub}>Preparing your workspace</span>
      </span>
    </div>
  );
}
