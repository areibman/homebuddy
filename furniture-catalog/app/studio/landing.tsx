'use client';

import Link from 'next/link';
import { SiteFooter, SiteNav } from './chrome';
import { PlanCards } from './plan-cards';
import { FAQS, STYLES } from './content';
import { HeroDemo } from './hero-demo';

export function LandingPage() {
  return (
    <div className="hb">
      <SiteNav />
      <main className="hb-main">
        <section className="hb-hero">
          <div className="hb-hero-copy">
            <p className="hb-kicker">For the room you already have</p>
            <h1>Furnish it with furniture you can actually order.</h1>
            <p className="hb-lede">
              Upload a floor plan or a photo. Homebuddy arranges real IKEA pieces on that plan,
              keeps a separate home for every place you are working on, and lets you walk the result
              when the plan is one we can already build in 3D.
            </p>
            <div className="hb-hero-actions">
              <Link className="hb-button" href="/sign-in">Upload a floor plan</Link>
              <a className="hb-text-link" href="#pricing">Compare plans</a>
            </div>
            <ul className="hb-facts">
              <li><strong>Walk it</strong><span>before you buy the sofa</span></li>
              <li><strong>Real pieces</strong><span>from the IKEA catalog</span></li>
              <li><strong>Your plan</strong><span>not a map of other homes</span></li>
            </ul>
          </div>
          <HeroDemo />
        </section>

        <section className="hb-jobs" aria-label="Who this is for">
          <article>
            <p>Listings</p>
            <h2>Stage the empty unit before the photos go up.</h2>
            <span>A buyable sofa, not a generated one.</span>
          </article>
          <article>
            <p>Moving</p>
            <h2>See if the MALM and the table actually fit the new lease.</h2>
            <span>Dimensions are on the catalog pieces.</span>
          </article>
          <article>
            <p>One room</p>
            <h2>Redo the living room without hiring someone for the first pass.</h2>
            <span>You still decide what to order.</span>
          </article>
        </section>

        <section id="features" className="hb-features">
          <div className="hb-section-head">
            <p className="hb-kicker">What you get</p>
            <h2>A studio, not a restyle filter.</h2>
          </div>
          <div className="hb-feature-grid">
            <article>
              <h3>Homes, as a list</h3>
              <p>There is no map of other people’s apartments. You upload floor plans and photos for each home. Studio includes one. Paid plans raise the limit so an agent can keep a book of listings.</p>
            </article>
            <article>
              <h3>IKEA, already in the catalog</h3>
              <p>KIVIK, MALM, EKENÄSET, and the rest of the starter collection are ready to place. Photos are the original catalog references. The models are independent recreations, not official CAD.</p>
            </article>
            <article>
              <h3>Your own furniture, in the same room</h3>
              <p>Bring a model of a piece you already own. It sits next to the IKEA catalog and can be placed in the apartment, not left in someone else’s library.</p>
            </article>
            <article>
              <h3>The room, arranged for you</h3>
              <p>Pick a style. On a walkable plan, the furniture is placed inside the real walls and you walk through it. On a plan you uploaded, you get a list of pieces you can actually order.</p>
            </article>
          </div>
        </section>

        <section className="hb-steps" aria-label="How furnishing works">
          <div className="hb-section-head">
            <p className="hb-kicker">The order matters</p>
            <h2>Upload, then pick, then arrange.</h2>
          </div>
          <ol>
            <li><strong>Add a home.</strong> Name it. Upload a floor plan, a photo, or start from a walkable sample. The plan decides how many homes you can keep.</li>
            <li><strong>Use the catalog.</strong> The IKEA pieces are already there. Add your own model if the room has a sofa IKEA does not sell.</li>
            <li><strong>Arrange it.</strong> Pick a style. The furniture is placed in the room. Then walk through it and move anything you do not like.</li>
          </ol>
        </section>

        <section className="hb-styles">
          <div className="hb-section-head">
            <p className="hb-kicker">Styles</p>
            <h2>Pick one. Don’t write a prompt unless you want to.</h2>
          </div>
          <ul>
            {STYLES.map((style) => (
              <li key={style.name}><strong>{style.name}</strong><span>{style.note}</span></li>
            ))}
          </ul>
        </section>

        <section id="pricing" className="hb-pricing">
          <div className="hb-section-head">
            <p className="hb-kicker">Plans</p>
            <h2>One home to start. More when you are furnishing more than one.</h2>
          </div>
          <PlanCards />
        </section>

        <section className="hb-faq">
          <div className="hb-section-head">
            <p className="hb-kicker">Questions</p>
            <h2>Before you put a card in.</h2>
          </div>
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

