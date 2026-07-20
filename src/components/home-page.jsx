import { ArrowRight, BrainCircuit, PenLine, ShieldCheck } from 'lucide-react';

/** A short introduction and clear entry point for the learning workspace. */
export function HomePage({ onGetStarted }) {
  return (
    <section className="home-page">
      <div className="home-hero">
        <span className="eyebrow">THINK WITH AI, NOT THROUGH IT</span>
        <h1>
          Keep your thinking
          <br />
          <em>in the driver’s seat.</em>
        </h1>
        <p>
          Think Outside The Bots helps you work through a problem before asking AI for help. Pick a
          learning workflow, write your own first attempt, and get feedback that strengthens your
          understanding instead of replacing it.
        </p>
        <button type="button" className="primary home-cta" onClick={onGetStarted}>
          Start a learning session <ArrowRight size={17} />
        </button>
      </div>

      <div className="home-steps" aria-label="How it works">
        <article>
          <PenLine size={22} />
          <h2>Start with your work</h2>
          <p>State the problem, choose a path, and make your own contribution first.</p>
        </article>
        <article>
          <BrainCircuit size={22} />
          <h2>Use purposeful friction</h2>
          <p>Feynman, Socratic, long-draft, and custom workflows keep you actively engaged.</p>
        </article>
        <article>
          <ShieldCheck size={22} />
          <h2>Stay in control</h2>
          <p>Your API key stays in this browser session, and the model only receives work needed for feedback.</p>
        </article>
      </div>
    </section>
  );
}
