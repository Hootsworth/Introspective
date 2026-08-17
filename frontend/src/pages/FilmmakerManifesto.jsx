import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui";
import styles from "./FilmmakerManifesto.module.css";

const promises = [
  {
    number: "01",
    title: "Your taste comes first.",
    body: "A suggestion is only useful if it helps you see your own idea more clearly. Keep it, change it, or throw it away. The final call is always yours.",
  },
  {
    number: "02",
    title: "The busywork should stay busywork.",
    body: "Sorting scenes, checking continuity, building a shot list, and preparing a deck matter. They just should not take the best hours of your day.",
  },
  {
    number: "03",
    title: "Your pages belong to you.",
    body: "Your half-finished draft, odd little detail, and story you are not ready to share are yours. Introspective is designed to keep your work close and your choices private.",
  },
];

export default function FilmmakerManifesto() {
  const navigate = useNavigate();

  return (
    <main className={styles.wrap}>
      <nav className={styles.navBar} aria-label="Manifesto navigation">
        <button className={styles.backBtn} onClick={() => navigate("/")}>
          <span aria-hidden="true">←</span> Back to workspace
        </button>
        <span className={styles.pageMark}>INTROSPECTIVE / A NOTE TO FILMMAKERS</span>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroMeta}><span className={styles.eyebrow}>A NOTE FROM THE DESK</span><span className={styles.issue}>NO. 01 · 2026</span></div>
        <h1 className={styles.title}>Making a film is already hard enough.</h1>
        <p className={styles.subtitle}>Introspective is a small attempt to make the work around the work feel a little lighter.</p>
      </header>

      <section className={styles.letterCard} aria-labelledby="letter-heading">
        <div className={styles.letterRail}>
          <span>WHY IT EXISTS</span>
          <span className={styles.railLine} />
        </div>
        <div className={styles.letterContent}>
          <h2 id="letter-heading" className={styles.letterHeading}>A personal note</h2>
          <div className={styles.letterBody}>
            <p>There is a particular kind of tired that comes from making a film. It is not just the long days. It is the tabs left open, the versions named <em>final_final_2</em>, the scene that is still living in your head because there has not been time to explain it to anyone else.</p>

            <p>We made Introspective for that space between having a feeling and being ready to show it. A place to put the screenplay, pull the pieces into view, and start making decisions without having to hold the whole film in your head at once.</p>

            <p>It can help with the practical things: finding scenes, gathering characters, shaping a shot list, making notes, and seeing where the story has energy. Those things are important. They are also not the reason you started making films.</p>

            <blockquote className={styles.pullQuote}>
              <p>Use the tool to get closer to the part that only you can make.</p>
            </blockquote>

            <p>If a suggestion gives you a better idea, keep going. If it feels wrong, ignore it. If the strange version is the honest version, choose the strange version. The point is not to make every decision faster. It is to leave you with more attention for the decisions that matter.</p>

            <p>Thanks for trusting us with a small corner of your process. We hope it gives you a little room back.</p>
          </div>

          <div className={styles.signatureArea}>
            <div>
              <div className={styles.signatureSign}>Keep making the thing.</div>
              <div className={styles.signatureRole}>— The people building Introspective</div>
            </div>
            <Button primary onClick={() => navigate("/")}>Return to your projects <span aria-hidden="true">→</span></Button>
          </div>
        </div>
      </section>

      <section className={styles.promisesSection} aria-labelledby="promises-heading">
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>WHAT WE TRY TO REMEMBER</span>
          <h2 id="promises-heading" className={styles.sectionHeading}>A few promises to keep the tool in its place.</h2>
        </div>
        <div className={styles.promisesGrid}>
          {promises.map((promise) => (
            <article key={promise.number} className={styles.promiseCard}>
              <span className={styles.promiseNumber}>{promise.number}</span>
              <h3>{promise.title}</h3>
              <p>{promise.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.footerNote}>
        <span>Make room for the work.</span>
        <button onClick={() => navigate("/settings")}>See privacy & AI settings →</button>
      </footer>
    </main>
  );
}
