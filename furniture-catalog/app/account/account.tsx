'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { AuthGate, SiteNav } from '../studio/chrome';
import { PlanCards } from '../studio/plan-cards';
import { readableError } from '../studio/errors';

export function AccountPage() {
  return (
    <AuthGate>
      <AccountBody />
    </AuthGate>
  );
}

function AccountBody() {
  const me = useQuery(api.account.me);
  const ledger = useQuery(api.account.ledger);
  const updateName = useMutation(api.account.updateName);
  const portal = useAction(api.stripeNode.openPortal);
  const { signOut } = useAuthActions();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name') || '');
    setError('');
    setSaved('');
    try {
      await updateName({ name });
      setSaved('Name saved.');
    } catch (err) {
      setError(readableError(err, 'Could not save that name.'));
    }
  }

  async function openBilling() {
    setError('');
    try {
      const result = await portal({ origin: window.location.origin });
      window.location.href = result.url;
    } catch (err) {
      setError(readableError(err, 'Billing could not be opened.'));
    }
  }

  return (
    <div className="hb">
      <SiteNav />
      <main className="hb-page">
        <p className="hb-kicker">Account</p>
        <h1>{me?.name || 'Your studio'}</h1>
        <p className="hb-lede">{me?.email} · {me?.planLabel} · {me?.credits ?? '…'} credits · {me ? `${me.homeCount} of ${me.homeLimit} homes` : ''}</p>
        {me?.subscriptionStatus && <p className="hb-meta">Subscription {me.subscriptionStatus}{me.interval ? ` · billed ${me.interval === 'year' ? 'yearly' : 'monthly'}` : ''}</p>}
        <div className="hb-grid-2" style={{ marginTop: 24 }}>
          <form className="hb-form hb-panel" onSubmit={saveName}>
            <h2>Name</h2>
            <label>What should we call you?
              <input name="name" defaultValue={me?.name} maxLength={80} required />
            </label>
            <button className="hb-button" type="submit">Save name</button>
            {saved && <p role="status">{saved}</p>}
          </form>
          <section className="hb-panel">
            <h2>Billing</h2>
            <p>Invoices, card changes, and cancellation happen in Stripe. Homebuddy does not store the card. Password reset email is not connected yet, so keep the password you created.</p>
            <div className="hb-row">
              <button className="hb-button" type="button" onClick={() => void openBilling()} disabled={!me?.hasBilling}>Open billing</button>
              <Link className="hb-text-link" href="/pricing">Change plan</Link>
              <button type="button" className="hb-text-link" onClick={() => void signOut()}>Sign out</button>
            </div>
            {!me?.hasBilling && <p>Billing opens after the first checkout creates a Stripe customer.</p>}
          </section>
        </div>
        {error && <p className="hb-error" role="alert">{error}</p>}
        <section style={{ marginTop: 28 }}>
          <h2>Plans and credit packs</h2>
          <PlanCards showPacks />
        </section>
        <section style={{ marginTop: 28 }}>
          <h2>Credit history</h2>
          <table className="hb-ledger">
            <tbody>
              {ledger?.map((row) => (
                <tr key={row.id}>
                  <td>{row.reason}</td>
                  <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td>{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ledger?.length === 0 && <p>No credit activity yet.</p>}
        </section>
      </main>
    </div>
  );
}
