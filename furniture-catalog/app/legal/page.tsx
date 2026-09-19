import Link from 'next/link';
import { SiteNav } from '../studio/chrome';

export const metadata = {
  title: 'Terms | Homebuddy',
  description: 'Terms for Homebuddy accounts, credits, and billing.',
};

export default function LegalPage() {
  return (
    <div className="hb">
      <SiteNav />
      <main className="hb-narrow">
        <p className="hb-kicker">Terms</p>
        <h1>What you are agreeing to.</h1>
        <p>Homebuddy stores the homes, floor plans, photos, and furniture models on the account that uploaded them. They are not added to the shared catalog.</p>
        <p>An arrangement or a custom model spends credits when the request is accepted. Those credits are not refunded, because the generation cost has already been paid. Unused credits stay on the account until the rollover cap. Cancel any paid plan from Billing; Stripe handles the card, invoices, and cancellation.</p>
        <p>The included furniture uses retailer catalog references and independent 3D recreations. Homebuddy is not affiliated with those retailers. Product names, photos, and designs belong to their owners.</p>
        <p>Payments are processed by Stripe. Homebuddy does not store card numbers.</p>
        <p><Link href="/sign-in">Back to sign in</Link></p>
      </main>
    </div>
  );
}
