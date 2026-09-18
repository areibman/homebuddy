'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { useAuthToken } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { readableError } from '../../studio/errors';

type HomeInput = {
  id: Id<'homes'>;
  name: string;
  notes: string;
  walkable: boolean;
  sampleId: string | null;
  interiorStatus: 'ready' | 'failed' | null;
  interiorError: string;
  files: { kind: 'floor_plan' | 'photo'; assetKey: string | null }[];
};

const LABELS: Record<string, string> = {
  queued: 'Waiting for the generation worker',
  running: 'Astra is reconstructing this home',
  validating: 'Checking the generated plan',
  completed: 'Finished',
  failed: 'Generation failed',
};

const ACTIVE = new Set(['queued', 'running', 'validating']);

export function GenerateInterior({ home }: { home: HomeInput }) {
  const token = useAuthToken();
  const jobs = useQuery(api.jobs.forHome, { homeId: home.id });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const requestKey = useRef<string>('');

  useEffect(() => {
    let disposed = false;
    fetch('/api/imports', { cache: 'no-store' })
      .then((response) => response.json() as Promise<{ configured?: boolean }>)
      .then((data) => { if (!disposed) setConfigured(Boolean(data.configured)); })
      .catch(() => { if (!disposed) setConfigured(false); });
    return () => { disposed = true; };
  }, []);

  const latest = jobs?.[0];
  const active = Boolean(latest && ACTIVE.has(latest.status));
  const floorPlans = home.files.filter((file) => file.kind === 'floor_plan' && file.assetKey);
  const inputKeys = home.files.map((file) => file.assetKey).filter((key): key is string => Boolean(key));

  async function generate() {
    if (!token || submitting || active) return;
    setSubmitting(true);
    setError('');
    requestKey.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Idempotency-Key': requestKey.current },
        body: JSON.stringify({ homeId: home.id, name: home.name, notes: home.notes, inputKeys }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Generation could not start.');
      requestKey.current = '';
    } catch (err) {
      setError(readableError(err, 'Generation could not start.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (home.sampleId) {
    return (
      <section className="hb-panel">
        <h2>Walk it</h2>
        <p>This home uses a sample floor plan that is already built in 3D.</p>
        <div className="hb-row">
          <Link className="hb-button" href={`/furnish?home=${home.sampleId}&record=${home.id}`}>Arrange this apartment</Link>
          <Link className="hb-text-link" href={`/decorate?home=${home.sampleId}`}>Walk the current interior</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="hb-panel" aria-live="polite">
      <h2>3D interior</h2>
      {home.walkable ? (
        <>
          <p>Reconstructed from your floor plan. Dimensions are estimates until you correct them.</p>
          <div className="hb-row">
            <Link className="hb-button" href={`/furnish?home=${home.id}&record=${home.id}`}>Arrange this apartment</Link>
            <Link className="hb-text-link" href={`/decorate?home=${home.id}`}>Walk the current interior</Link>
          </div>
        </>
      ) : (
        <p>
          {floorPlans.length
            ? 'Astra reads the floor plan and photos, then writes a walkable 3D plan and any recognizable furniture as catalog models. This takes several minutes.'
            : 'Upload a floor plan first. Photos help with finishes and furniture, but the plan gives the walls.'}
        </p>
      )}
      {latest && (
        <p className="hb-meta">
          {LABELS[latest.status] || latest.status}
          {latest.status === 'completed' && latest.assetCount ? ` · ${latest.assetCount} model${latest.assetCount === 1 ? '' : 's'} added to your catalog` : ''}
          {latest.status === 'completed' && latest.interiorStatus === 'failed' ? ' · the floor plan could not be walked' : ''}
        </p>
      )}
      {latest?.status === 'failed' && latest.error && <p className="hb-error">{latest.error}</p>}
      {home.interiorStatus === 'failed' && home.interiorError && !active && <p className="hb-error">{home.interiorError}</p>}
      {configured === false && <p className="hb-error">Generation is not connected on this server. Start the generation worker, then reload.</p>}
      {error && <p className="hb-error" role="alert">{error}</p>}
      <div className="hb-row" style={{ marginTop: 12 }}>
        <button
          className="hb-button"
          type="button"
          disabled={!token || submitting || active || !floorPlans.length || configured === false}
          onClick={() => void generate()}
        >
          {active ? 'Generating…' : submitting ? 'Starting…' : home.walkable ? 'Rebuild the 3D interior' : 'Build the 3D interior'}
        </button>
        {active && <span className="hb-meta">You can leave this page. Progress is saved.</span>}
      </div>
    </section>
  );
}
