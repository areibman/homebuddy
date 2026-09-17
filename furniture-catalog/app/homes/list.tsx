'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AuthGate, SiteNav } from '../studio/chrome';
import { SAMPLES } from '../studio/content';
import { readableError } from '../studio/errors';

export function HomesList() {
  return (
    <AuthGate>
      <HomesBody />
    </AuthGate>
  );
}

function HomesBody() {
  const me = useQuery(api.account.me);
  const homes = useQuery(api.homes.list);
  const create = useMutation(api.homes.create);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const atLimit = Boolean(me && homes && homes.length >= me.homeLimit);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const id = await create({
        name: String(data.get('name') || ''),
        place: String(data.get('place') || ''),
        notes: String(data.get('notes') || ''),
      });
      window.location.href = `/homes/${id}`;
    } catch (err) {
      setError(readableError(err, 'Could not add that home.'));
      setPending(false);
    }
  }

  async function useSample(sampleId: string, name: string) {
    setError('');
    setPending(true);
    try {
      const id = await create({ name, sampleId, place: 'Sample floor plan' });
      window.location.href = `/homes/${id}`;
    } catch (err) {
      setError(readableError(err, 'Could not add that sample.'));
      setPending(false);
    }
  }

  return (
    <div className="hb">
      <SiteNav />
      <main className="hb-page">
        <p className="hb-kicker">Your homes</p>
        <h1>The list, not a map.</h1>
        <p className="hb-lede">Upload a floor plan and photos for each place. {me ? `${me.planLabel} includes ${me.homeLimit} ${me.homeLimit === 1 ? 'home' : 'homes'}. You are using ${me.homeCount}.` : 'Checking the plan limit…'}</p>
        {atLimit && <p className="hb-error">This plan is full. <Link href="/pricing">Upgrade</Link> to add another home, or delete one you are done with.</p>}
        <div className="hb-grid-2" style={{ marginTop: 24 }}>
          <section className="hb-home-list" aria-label="Homes">
            {homes?.length === 0 && <p>No homes yet. Add one, or start from a sample floor plan we can already walk through.</p>}
            {homes?.map((home) => (
              <Link className="hb-home-card" key={home.id} href={`/homes/${home.id}`}>
                <span>
                  <strong>{home.name}</strong>
                  <small>{home.place || 'No place set'} · {home.floorPlans} floor plans · {home.photos} photos{home.sampleId ? ' · walkable sample' : ''}</small>
                </span>
                <span>Open</span>
              </Link>
            ))}
          </section>
          <form className="hb-form hb-panel" onSubmit={submit}>
            <h2>Add a home</h2>
            <label>Name
              <input name="name" required minLength={2} maxLength={80} placeholder="Bush Street rental" disabled={pending || atLimit} />
            </label>
            <label>Place <span className="hb-meta">optional</span>
              <input name="place" maxLength={80} placeholder="San Francisco" disabled={pending || atLimit} />
            </label>
            <label>Notes <span className="hb-meta">optional</span>
              <textarea name="notes" maxLength={2000} placeholder="Empty listing, north light, keep the existing kitchen." disabled={pending || atLimit} />
            </label>
            {error && <p className="hb-error" role="alert">{error}</p>}
            <button className="hb-button" type="submit" disabled={pending || atLimit}>{pending ? 'Adding…' : 'Add home'}</button>
          </form>
        </div>
        <section style={{ marginTop: 28 }}>
          <h2>Or start from a sample</h2>
          <p>These count toward your home limit. They already have a walkable interior, so an arrangement can be placed in 3D.</p>
          <div className="hb-row">
            {SAMPLES.map((sample) => (
              <button key={sample.id} className="hb-button ghost" type="button" disabled={pending || atLimit} onClick={() => void useSample(sample.id, sample.name)}>
                {sample.name}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
