import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import styles from "./ScriptViewer.module.css"; // reuse .wrap

export default function RelationshipGraph() {
  const { characters } = useOutletContext();
  const [hovered, setHovered] = useState(null);

  const { nodes, edges } = useMemo(() => {
    const top = [...characters].sort((a, b) => b.dialogue_count - a.dialogue_count).slice(0, 14);
    const n = top.length;
    const R = 220;
    const cx = 320, cy = 260;
    const nodes = top.map((c, i) => {
      const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
      const weight = Math.max(c.dialogue_count, 1);
      return {
        ...c,
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle),
        r: 8 + Math.min(18, Math.sqrt(weight) * 2.2),
      };
    });

    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const shared = nodes[i].scene_numbers.filter((s) => nodes[j].scene_numbers.includes(s));
        if (shared.length > 0) {
          edges.push({ a: nodes[i], b: nodes[j], weight: shared.length });
        }
      }
    }
    return { nodes, edges };
  }, [characters]);

  if (!characters.length) {
    return (
      <div className={styles.wrap}>
        <p style={{ color: "var(--text-dim)" }}>No characters yet — upload a screenplay first.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 16, maxWidth: 560 }}>
        Nodes sized by dialogue volume. Edges connect characters who share at least one scene,
        weighted by how many scenes they share — computed directly from parsed scene data, no AI needed.
      </p>
      <svg viewBox="0 0 640 520" style={{ width: "100%", maxWidth: 700, background: "var(--surface)",
        border: "1px solid var(--border-soft)", borderRadius: 16 }}>
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
            stroke="var(--accent-teal)"
            strokeOpacity={hovered && hovered !== e.a.id && hovered !== e.b.id ? 0.08 : 0.35}
            strokeWidth={Math.min(6, 1 + e.weight * 0.8)}
          />
        ))}
        {nodes.map((n) => (
          <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
            <circle cx={n.x} cy={n.y} r={n.r}
              fill={hovered === n.id ? "var(--accent-amber)" : "var(--accent-amber-soft)"}
              stroke="var(--accent-amber)" strokeWidth="1.5" />
            <text x={n.x} y={n.y + n.r + 14} textAnchor="middle"
              fontFamily="var(--font-body)" fontSize="11" fontWeight="600" fill="var(--text)">
              {n.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
