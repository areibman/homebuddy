'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAction } from 'convex/react';
import { useConvexAuth } from '@convex-dev/auth/react';
import { useRouter } from 'next/navigation';
import { api } from '../../convex/_generated/api';
import { CREDIT_PACKS, PLANS } from './content';
import { readableError } from './errors';

export function PlanCards({ showPacks = false }: { showPacks?: boolean }) {
  const [yearly, setYearly] = useState(true);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const { isAuthenticated } = useConvexAuth();
  const checkout = useAction(api.stripeNode.startCheckout);
  const router = useRouter();

  async function buy(id: string, pack = false) {
    setError('');
    if (!isAuthenticated) {
      router.push(`/sign-in?next=${pack ? '/account' : '/pricing'}`);
      return;
    }
    setPending(id);
    try {
      const result = await checkout({
        origin: window.location.origin,
        ...(pack ? { packId: id } : { plan: id, interval: yearly ? 'year' as const : 'month' as const }),
      });
      window.location.href = result.url;
    } catch (err) {
      setError(readableError(err, 'Checkout could not start.'));
      setPending('');
    }
  }

  return (
    <div className="hb-plans">
      <div className="hb-toggle" role="group" aria-label="Billing period">
        <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>Monthly</button>
        <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>Yearly · about 4 months free</button>
      </div>
      <div className="hb-plan-grid">
        {PLANS.map((plan) => {
          const price = plan.id === 'studio' ? 0 : yearly ? plan.priceYearly : plan.priceMonthly;
          return (
            <article key={plan.id} className={plan.id === 'atelier' ? 'popular' : ''}>
              {plan.id === 'atelier' && <span className="hb-popular">Most used</span>}
              <h3>{plan.label}</h3>
              <p className="hb-price"><strong>{price === 0 ? 'Free' : `$${price}`}</strong>{price > 0 && <span>{yearly ? ' / month, billed yearly' : ' / month'}</span>}</p>
              {yearly && plan.yearlyBilled > 0 && <p className="hb-billed">${plan.yearlyBilled} billed once a year</p>}
              <p>{plan.blurb}</p>
              <ul>{plan.points.map((point) => <li key={point}>{point}</li>)}</ul>
              {plan.id === 'studio' ? (
                <Link className="hb-button ghost" href={isAuthenticated ? '/homes' : '/sign-in'}>Start with one home</Link>
              ) : (
                <button className="hb-button" type="button" disabled={pending === plan.id} onClick={() => void buy(plan.id)}>
                  {pending === plan.id ? 'Opening Stripe…' : `Choose ${plan.label}`}
                </button>
              )}
            </article>
          );
        })}
      </div>
      {showPacks && (
        <div className="hb-packs">
          <h3>Keep arranging without changing your plan.</h3>
          <div>
            {CREDIT_PACKS.map((pack) => (
              <button key={pack.id} type="button" disabled={pending === pack.id} onClick={() => void buy(pack.id, true)}>
                {pending === pack.id ? 'Opening Stripe…' : `More arrangements · $${pack.price}`}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="hb-error" role="alert">{error}</p>}
    </div>
  );
}
