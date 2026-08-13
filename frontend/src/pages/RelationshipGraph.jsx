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

    // Build scene presence map for each character
    const charScenesMap = {};
    top.forEach((c) => {
      let sceneSet = new Set(c.scene_numbers || []);
      if (script && script.scenes) {
        script.scenes.forEach((scene) => {
          const charNameUpper = c.name.toUpperCase();
          const speaks = (scene.dialogue || []).some(
            (d) =>
              d.character.toUpperCase() === charNameUpper ||
              (c.aliases || []).some((a) => d.character.toUpperCase() === a.toUpperCase())
          );
          const mentioned = scene.action_text && scene.action_text.toUpperCase().includes(charNameUpper);
          if (speaks || mentioned) {
            sceneSet.add(scene.scene_number);
          }
        });
      }
      charScenesMap[c.id] = Array.from(sceneSet);
    });

    const nodes = top.map((c, i) => {
      const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
      const weight = Math.max(c.dialogue_count, 1);
      return {
        ...c,
        computedScenes: charScenesMap[c.id] || [],
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle),
        r: 12 + Math.min(18, Math.sqrt(weight) * 2.2),
      };
    });

    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const scenesA = nodes[i].computedScenes;
        const scenesB = nodes[j].computedScenes;
        const shared = scenesA.filter((s) => scenesB.includes(s));
        
        let weight = shared.length;
        // Fallback connection if characters share the script
        if (weight === 0 && (nodes[i].dialogue_count > 0 && nodes[j].dialogue_count > 0)) {
          weight = 1;
        }

        if (weight > 0) {
          edges.push({ a: nodes[i], b: nodes[j], weight });
        }
      }
    }
    return { nodes, edges };
  }, [characters, script]);

  const activeChar = useMemo(() => {
    if (!nodes.length) return null;
    return nodes.find((n) => n.id === (selectedId || hoveredId)) || nodes[0];
  }, [nodes, selectedId, hoveredId]);

  const coStars = useMemo(() => {
    if (!activeChar || !nodes.length) return [];
    return nodes
      .filter((n) => n.id !== activeChar.id)
      .map((n) => {
        const shared = activeChar.computedScenes.filter((s) => n.computedScenes.includes(s));
        return { character: n, sharedCount: Math.max(shared.length, 1) };
      })
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
            Interactive character relationship web. Edge line thickness corresponds to shared scene frequency. Hover or click nodes to inspect character dynamics.
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
                  stroke={isConnected ? "#f59e0b" : "rgba(245, 158, 11, 0.4)"}
                  strokeOpacity={isConnected ? 1 : 0.45}
                  strokeWidth={isConnected ? Math.min(7, 2 + e.weight * 1.2) : Math.min(4, 1.2 + e.weight * 0.6)}
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
                    r={n.r + 5}
                    fill={isActive ? "rgba(245, 158, 11, 0.25)" : "transparent"}
                    stroke={isActive ? "#f59e0b" : "transparent"}
                    strokeWidth="2"
                  />
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={isActive ? "#f59e0b" : "var(--surface-2)"}
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  <text
                    x={n.x}
                    y={n.y + n.r + 14}
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                    fontSize="11.5"
                    fontWeight={isActive ? "700" : "600"}
                    fill={isActive ? "#ffffff" : "var(--text)"}
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
                  src={`https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(activeChar.name)}&backgroundColor=090d16,1e293b,f59e0b`}
                  alt={activeChar.name}
                  className={styles.avatarImg}
                />
              </div>
              <div>
                <div className={styles.charName}>{activeChar.name}</div>
                {activeChar.aliases && activeChar.aliases.length > 0 ? (
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
                  <span className={styles.statNum}>{activeChar.computedScenes.length || activeChar.scene_count}</span>
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
                {(activeChar.computedScenes.length > 0 ? activeChar.computedScenes : activeChar.scene_numbers).map((sn) => (
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
