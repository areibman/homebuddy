'use client';

import Link from 'next/link';
import { SiteFooter, SiteNav } from './chrome';
import { PlanCards } from './plan-cards';
import { FAQS, STYLES } from './content';
import { HeroDemo } from './hero-demo';
import { CatalogRail, PhotoToModel } from './showroom';

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
              Arrange catalog furniture on your floor plan. Or snap a photo of a piece you already own and drop the model in the room.
            </p>
            <div className="hb-hero-actions">
              <Link className="hb-button" href="/sign-in">Upload a floor plan</Link>
              <a className="hb-text-link" href="#features">See the furniture</a>
            </div>
            <ul className="hb-facts">
              <li><strong>Walk it</strong><span>before you buy the sofa</span></li>
              <li><strong>Real pieces</strong><span>from furniture catalogs</span></li>
              <li><strong>Your plan</strong><span>not a map of other homes</span></li>
            </ul>
          </div>
          <HeroDemo />
        </section>

        <CatalogRail />
        <PhotoToModel />

        <section className="hb-styles">
          <div className="hb-section-head">
            <p className="hb-kicker">Styles</p>
            <h2>Pick one. Don’t write a prompt unless you want to.</h2>
          </div>
          <ul>
            {STYLES.map((style) => (
              <li key={style.name}>{style.name}</li>
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

