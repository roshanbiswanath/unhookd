import { SignInButton } from "@clerk/clerk-react";
import { ArrowRight, Check, LockKeyhole, Sparkles } from "lucide-react";

const HERO_IMAGE = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1500&q=85";
const WALK_IMAGE = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1100&q=85";

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <a className="brand" href="#top" aria-label="Unhookd home"><span className="brand-mark">u</span>Unhookd</a>
        <nav aria-label="Landing navigation">
          <a href="#approach">How it works</a>
          <a href="#privacy">Privacy</a>
        </nav>
        <SignInButton mode="modal">
          <button className="landing-sign-in" type="button">Sign in</button>
        </SignInButton>
      </header>

      <section className="landing-hero" id="top">
        <div className="landing-hero-copy">
          <p className="landing-kicker"><Sparkles size={16} aria-hidden="true" /> A steadier way to change a habit</p>
          <h1>Make room for what matters beyond the screen.</h1>
          <p className="landing-lede">Unhookd helps you notice the moments that pull you in, then gently redirects you into an action you chose.</p>
          <SignInButton mode="modal">
            <button className="landing-cta" type="button">Get unhookd <ArrowRight size={18} aria-hidden="true" /></button>
          </SignInButton>
          <p className="landing-quiet-note"><LockKeyhole size={14} aria-hidden="true" /> Your activity is private. You stay in control.</p>
        </div>
        <div className="landing-hero-media">
          <img src={HERO_IMAGE} alt="Person pausing from their phone in a sunlit room" />
          <div className="landing-media-caption">A pause can become a different choice.</div>
        </div>
      </section>

      <section className="landing-approach" id="approach" aria-labelledby="approach-title">
        <div className="landing-section-intro">
          <p className="landing-kicker">Built around your real life</p>
          <h2 id="approach-title">Support that meets the moment, without making it the center of your day.</h2>
        </div>
        <div className="landing-steps">
          <article>
            <span>01</span>
            <h3>Find the pull</h3>
            <p>Talk through a habit, or share a Digital Wellbeing snapshot. You decide which patterns are worth changing.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Choose your window</h3>
            <p>Set the times when support will help. Nudges stay neutral, so a notification never plants the urge it is meant to help with.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Move through it</h3>
            <p>When an urge appears, start a short replacement activity. Optional live guidance helps you keep going.</p>
          </article>
        </div>
      </section>

      <section className="landing-privacy" id="privacy" aria-labelledby="privacy-title">
        <div className="landing-privacy-media"><img src={WALK_IMAGE} alt="Person walking outdoors away from screens" /></div>
        <div className="landing-privacy-copy">
          <p className="landing-kicker">Designed with boundaries</p>
          <h2 id="privacy-title">Coaching, not surveillance.</h2>
          <p>Unhookd does not store your screenshots, camera video, or audio. Live activity guidance is optional, and AI observations always need your confirmation.</p>
          <ul>
            <li><Check size={17} aria-hidden="true" /> You select what to track</li>
            <li><Check size={17} aria-hidden="true" /> Nudges never name an app or urge</li>
            <li><Check size={17} aria-hidden="true" /> You can delete your data in settings</li>
          </ul>
        </div>
      </section>

      <section className="landing-closing" aria-labelledby="closing-title">
        <p className="landing-kicker">A better next step</p>
        <h2 id="closing-title">The habit does not have to decide what happens next.</h2>
        <SignInButton mode="modal">
          <button className="landing-cta" type="button">Get unhookd <ArrowRight size={18} aria-hidden="true" /></button>
        </SignInButton>
      </section>

      <footer className="landing-footer"><a className="brand" href="#top"><span className="brand-mark">u</span>Unhookd</a><span>Made for deliberate digital habits.</span></footer>
    </main>
  );
}
