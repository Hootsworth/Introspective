import { useEffect, useState } from "react";
import styles from "./LoadingState.module.css";

/* ─────────────────────────────────────────────────────────
 * LOADING STATE — pixel-grid loader for long-running work
 *
 * Variants:
 *   Drive  — square cells, chevron wavefront driving right;
 *            the 650ms cycle is shorter than the sweep, so
 *            two fronts are always in flight
 *   Dots   — same wavefront, circular cells
 *   Orbit  — a comet lapping the grid perimeter
 *
 * Paired with a shimmering label and a live elapsed timer
 * in mono tabular figures. Reduced motion freezes the grid
 * to its dim state; the timer still ticks.
 * ───────────────────────────────────────────────────────── */

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

const PATTERNS = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
};

function useElapsed(enabled = true) {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, [enabled]);

  if (!enabled) return null;
  const total = ds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export default function LoadingState({
  label = "Loading workspace",
  sublabel,
  variant = "Drive",
  showElapsed = true,
  compact = false,
  overlay = false,
  glass = false,
  size = "normal",
  style = {},
  className = "",
}) {
  const elapsed = useElapsed(showElapsed);
  const pattern = PATTERNS[variant] || PATTERNS.Drive;
  const { delays, dur, round } = pattern;

  const rootClasses = [
    styles.root,
    compact ? styles.compact : "",
    overlay ? styles.overlay : "",
    glass ? styles.glass : "",
    styles[size] || "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClasses} style={style} role="status" aria-live="polite">
      <div className={styles.container}>
        <span aria-hidden="true" className={styles.pixelGrid}>
          {delays.map((d, i) => (
            <span
              key={i}
              className={`${styles.pixel} ${round ? styles.pixelRound : styles.pixelSquare}`}
              style={{
                opacity: d === null ? 0.08 : 0.18,
                animation:
                  d === null
                    ? "none"
                    : `${styles.pixelOn} ${dur}ms ease-in-out ${d}ms infinite`,
              }}
            />
          ))}
        </span>

        <div className={styles.textWrapper}>
          <span className={styles.shimmerLabel}>{label}</span>
          {sublabel && <span className={styles.subLabel}>{sublabel}</span>}
        </div>

        {showElapsed && elapsed && (
          <span className={styles.elapsedBadge}>{elapsed}</span>
        )}
      </div>
    </div>
  );
}
