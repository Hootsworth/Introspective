import { useOutletContext } from "react-router-dom";
import { EmptyState } from "../components/ui";
import styles from "./CharacterExplorer.module.css";

export default function CharacterExplorer() {
  const { characters } = useOutletContext();

  if (!characters.length) {
    return (
      <div className={styles.wrap}>
        <EmptyState
          title="No characters extracted yet"
          body="Upload a screenplay in the Script Viewer tab to automatically extract character profiles, dialogue lines, and scene occurrences."
        />
      </div>
    );
  }

  const maxDialogue = Math.max(...characters.map((c) => c.dialogue_count), 1);

  return (
    <div className={styles.wrap}>
      <div className={styles.list}>
        {characters.map((c) => {
          const avatarUrl = `https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(c.name)}&backgroundColor=090d16,1e293b,0284c7`;

          return (
            <div key={c.id} className={styles.card}>
              <div className={styles.avatarWrap}>
                <img src={avatarUrl} alt={c.name} className={styles.avatarImg} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{c.name}</span>
                  {c.aliases.length > 0 && <span className={styles.aliasBadge}>aka {c.aliases.join(", ")}</span>}
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${(c.dialogue_count / maxDialogue) * 100}%` }} />
                </div>
              </div>
              <div className={styles.stats}>
                <div>
                  <div className={styles.statNum}>{c.dialogue_count}</div>
                  <div className={styles.statLabel}>Lines</div>
                </div>
                <div>
                  <div className={styles.statNum}>{c.scene_count}</div>
                  <div className={styles.statLabel}>Scenes</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
