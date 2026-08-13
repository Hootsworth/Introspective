import { useOutletContext } from "react-router-dom";
import { EmptyState } from "../components/ui";
import uiStyles from "../components/ui.module.css";
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
        {characters.map((c) => (
          <div key={c.id} className={`${uiStyles.card} ${styles.row}`}>
            <div className={styles.avatar}>{c.name.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.name}>{c.name}</div>
              {c.aliases.length > 0 && <div className={styles.aliases}>aka {c.aliases.join(", ")}</div>}
              <div className={styles.bar} style={{ width: `${(c.dialogue_count / maxDialogue) * 100}%` }} />
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
        ))}
      </div>
    </div>
  );
}
