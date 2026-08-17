import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui";
import styles from "./FilmmakerManifesto.module.css";

export default function FilmmakerManifesto() {
  const navigate = useNavigate();

  return (
    <div className={styles.wrap}>
      {/* Navigation & Header */}
      <div className={styles.navBar}>
        <button className={styles.backBtn} onClick={() => navigate("/")} title="Return to Dashboard">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Workspace
        </button>

        <span className={styles.badge}>HUMAN CRAFT · CINEMA FIRST</span>
      </div>

      {/* Hero Section */}
      <div className={styles.hero}>
        <div className={styles.eyebrow}>OUR PHILOSOPHY & COMMITMENT</div>
        <h1 className={styles.title}>Cinema belongs to the human heart.</h1>
        <p className={styles.subtitle}>
          Why Introspective was built to empower, protect, and amplify filmmakers — never to replace them.
        </p>
      </div>

      {/* The Letter */}
      <div className={styles.letterCard}>
        <div className={styles.letterLead}>
          To the screenwriters, directors, cinematographers, story artists, and creators bringing worlds to life:
        </div>

        <div className={styles.letterBody}>
          <p>
            Cinema is not an arithmetic equation. It is not an algorithmic token stream, and it is not a statistical distribution of pixels. 
            Cinema is lived experience. It is the lingering silence between two people in a parked car at midnight, the specific texture of autumn light through an apartment window, the gut-wrenching ache of a farewell, and the courage to look into the human condition without flinching.
          </p>

          <p>
            No neural network has ever suffered heartbreak. No model has ever walked onto a freezing soundstage at 4:00 AM, fought for a setup with three minutes of magic hour remaining, or watched an actor deliver an unscripted glance that completely transforms a scene.
          </p>

          <div className={styles.quoteBlock}>
            "Technology is the brush, never the painter. The moment a tool attempts to dictate taste or replace the human struggle of storytelling, it ceases to be art."
            <span className={styles.quoteAuthor}>— The Introspective Principle</span>
          </div>

          <p>
            We built <strong>INTROSPECTIVE</strong> out of profound love and reverence for the filmmaking craft. 
            We saw how much time visionary storytellers lose to mechanical busywork: manual slugline formatting, copying scene data into spreadsheets, estimating screen times, searching for visual references, and struggling to communicate complex cinematic visions to producers and collaborators before having budget.
          </p>

          <p>
            <strong>Introspective is your creative drafting desk.</strong> It is built to do the tedious pre-production heavy lifting — organizing scenes, mapping character arcs, sketching visual beats, drafting shot lists, and building animatics — so that you have more mental bandwidth, energy, and freedom to do what only human artists can do: <em>make bold creative choices</em>.
          </p>
        </div>

        <div className={styles.signatureArea}>
          <div>
            <div className={styles.signatureSign}>With respect and solidarity,</div>
            <div className={styles.signatureRole}>The Creators of Introspective</div>
          </div>
          <Button primary onClick={() => navigate("/")} style={{ fontSize: 13, padding: "8px 18px" }}>
            Return to Production Desk →
          </Button>
        </div>
      </div>

      {/* Core Principles Grid */}
      <div className={styles.principlesSection}>
        <h2 className={styles.sectionHeading}>The Core Tenets of Our Design</h2>
        <p className={styles.sectionIntro}>
          Every line of code and feature in this application is guided by four foundational commitments to filmmakers:
        </p>

        <div className={styles.principlesGrid}>
          <div className={styles.principleCard}>
            <div className={styles.principleIcon}>🎬</div>
            <div className={styles.principleTitle}>1. The Director Holds Final Cut</div>
            <p className={styles.principleDesc}>
              Every AI-generated note, camera angle, lighting suggestion, and storyboard frame is merely an editable sketch. Nothing is prescriptive; your artistic judgment and taste are the only compass that matters.
            </p>
          </div>

          <div className={styles.principleCard}>
            <div className={styles.principleIcon}>🧠</div>
            <div className={styles.principleTitle}>2. Amplification, Not Replacement</div>
            <p className={styles.principleDesc}>
              We do not believe in push-button "generate a movie" gimmicks. We automate the logistical math (word counts, scene indexes, shot duration estimates) to leave human storytelling unconstrained.
            </p>
          </div>

          <div className={styles.principleCard}>
            <div className={styles.principleIcon}>🔐</div>
            <div className={styles.principleTitle}>3. Creative Sovereignty & Privacy</div>
            <p className={styles.principleDesc}>
              Your unproduced screenplays, character bibles, and raw ideas are your intellectual lifeblood. Introspective supports 100% offline local inference (Ollama) and encrypted keys so your work stays strictly yours.
            </p>
          </div>

          <div className={styles.principleCard}>
            <div className={styles.principleIcon}>⚡</div>
            <div className={styles.principleTitle}>4. Democratizing the Pre-Vis Canvas</div>
            <p className={styles.principleDesc}>
              Major studios have multi-million dollar pre-visualization departments. Introspective puts world-class cinematic planning, pitch decks, and animatics into the hands of every independent filmmaker.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA Box */}
      <div className={styles.ctaBox}>
        <h3 className={styles.ctaTitle}>Ready to bring your next vision to life?</h3>
        <p className={styles.ctaDesc}>
          Upload your screenplay to parse scenes, extract characters, explore dramatic tension, and visualize your storyboard beats.
        </p>
        <div className={styles.ctaActions}>
          <Button primary onClick={() => navigate("/")} style={{ fontSize: 13, padding: "10px 20px" }}>
            Open Projects Workspace
          </Button>
          <Button ghost onClick={() => navigate("/settings")} style={{ fontSize: 13, padding: "10px 20px" }}>
            Configure AI & Privacy Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
