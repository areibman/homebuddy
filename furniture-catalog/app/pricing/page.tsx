import { PlanCards } from '../studio/plan-cards';
import { SiteFooter, SiteNav } from '../studio/chrome';
import { FAQS } from '../studio/content';

export const metadata = {
  title: 'Pricing | Homebuddy',
  description: 'Keep more homes, arrange the furniture, and walk the result.',
};

export default function PricingPage() {
  return (
    <div className="hb">
      <SiteNav />
      <main className="hb-page">
        <p className="hb-kicker">Pricing</p>
        <h1>Start with one home. Keep a book of them when you need to.</h1>
        <p className="hb-lede">The free plan is one apartment. Paid plans are for listings, rentals, and the rooms you are still deciding on. Yearly is the cheaper way to stay.</p>
        <PlanCards showPacks />
        <section className="hb-faq">
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
