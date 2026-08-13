import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import styles from "./RelationshipGraph.module.css";

export default function RelationshipGraph() {
  const { characters, script } = useOutletContext();
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const { nodes, edges } = useMemo(() => {
    if (!characters || !characters.length) return { nodes: [], edges: [] };
    const top = [...characters].sort((a, b) => b.dialogue_count - a.dialogue_count).slice(0, 14);
    const n = top.length;
    const R = 200;
    const cx = 320, cy = 260;
    const nodes = top.map((c, i) => {
      const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
      const weight = Math.max(c.dialogue_count, 1);
      return {
        ...c,
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle),
        r: 10 + Math.min(16, Math.sqrt(weight) * 2),
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

  const activeChar = useMemo(() => {
    if (!nodes.length) return null;
    return nodes.find((n) => n.id === (selectedId || hoveredId)) || nodes[0];
  }, [nodes, selectedId, hoveredId]);

  const coStars = useMemo(() => {
    if (!activeChar || !nodes.length) return [];
    return nodes
      .filter((n) => n.id !== activeChar.id)
      .map((n) => {
        const shared = activeChar.scene_numbers.filter((s) => n.scene_numbers.includes(s));
        return { character: n, sharedCount: shared.length };
      })
      .filter((item) => item.sharedCount > 0)
      .sort((a, b) => b.sharedCount - a.sharedCount)
      .slice(0, 5);
  }, [activeChar, nodes]);

  if (!characters || !characters.length) {
    return (
      <div className={styles.wrap}>
        <p style={{ color: "var(--text-dim)" }}>No characters found — upload a screenplay first.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.layout}>
        {/* Left Panel: Interactive Network Graph */}
        <div className={styles.graphCard}>
          <div className={styles.graphSubtitle}>
            Interactive character relationship web. Edge thickness corresponds to shared scene frequency. Click or hover any character node to inspect traits and co-star dynamics.
          </div>

          <svg
            viewBox="0 0 640 520"
            style={{
              width: "100%",
              height: "auto",
              background: "var(--surface-1)",
              border: "1px solid var(--border-soft)",
              borderRadius: 8,
            }}
          >
            {edges.map((e, i) => {
              const isConnected = activeChar && (activeChar.id === e.a.id || activeChar.id === e.b.id);
              return (
                <line
                  key={i}
                  x1={e.a.x}
                  y1={e.a.y}
                  x2={e.b.x}
                  y2={e.b.y}
                  stroke={isConnected ? "var(--accent-cyan)" : "rgba(56, 189, 248, 0.25)"}
                  strokeOpacity={isConnected ? 0.9 : 0.2}
                  strokeWidth={isConnected ? Math.min(6, 1.5 + e.weight * 0.8) : 1}
                />
              );
            })}

            {nodes.map((n) => {
              const isActive = activeChar && activeChar.id === n.id;
              return (
                <g
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  onMouseEnter={() => setHoveredId(n.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r + 4}
                    fill={isActive ? "rgba(56, 189, 248, 0.2)" : "transparent"}
                    stroke={isActive ? "var(--accent-cyan)" : "transparent"}
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={isActive ? "var(--accent-cyan)" : "var(--surface-2)"}
                    stroke="var(--accent-cyan)"
                    strokeWidth="1.5"
                  />
                  <text
                    x={n.x}
                    y={n.y + n.r + 14}
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                    fontSize="11"
                    fontWeight={isActive ? "700" : "500"}
                    fill={isActive ? "#ffffff" : "var(--text-dim)"}
                  >
                    {n.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Panel: Character Inspector & Characteristics */}
        {activeChar && (
          <div className={styles.inspectorCard}>
            <div className={styles.inspectorHeader}>
              <div className={styles.avatarWrap}>
                <img
                  src={`https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(activeChar.name)}&backgroundColor=090d16,1e293b,0284c7`}
                  alt={activeChar.name}
                  className={styles.avatarImg}
                />
              </div>
              <div>
                <div className={styles.charName}>{activeChar.name}</div>
                {activeChar.aliases.length > 0 ? (
                  <div className={styles.charAlias}>aka {activeChar.aliases.join(", ")}</div>
                ) : (
                  <div className={styles.charAlias}>Key Character Profile</div>
                )}
              </div>
            </div>

            <div>
              <div className={styles.sectionTitle}>Dialogue & Presence</div>
              <div className={styles.statsGrid}>
                <div className={styles.statBox}>
                  <span className={styles.statNum}>{activeChar.dialogue_count}</span>
                  <span className={styles.statLabel}>Total Lines</span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statNum}>{activeChar.scene_count}</span>
                  <span className={styles.statLabel}>Scenes Present</span>
                </div>
              </div>
            </div>

            <div>
              <div className={styles.sectionTitle}>Primary Co-Stars</div>
              {coStars.length > 0 ? (
                coStars.map((item) => (
                  <div key={item.character.id} className={styles.coStarItem}>
                    <span className={styles.coStarName}>{item.character.name}</span>
                    <span className={styles.sharedBadge}>{item.sharedCount} shared scene{item.sharedCount === 1 ? "" : "s"}</span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 12, color: "var(--text-dim)" }}>No co-star scene overlaps detected.</p>
              )}
            </div>

            <div>
              <div className={styles.sectionTitle}>Scene Occurrences</div>
              <div className={styles.scenesRow}>
                {activeChar.scene_numbers.map((sn) => (
                  <span key={sn} className={styles.sceneBadge}>
                    SHOT {String(sn).padStart(2, "0")}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
