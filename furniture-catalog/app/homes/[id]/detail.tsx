'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { useAuthToken } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { AuthGate, SiteNav } from '../../studio/chrome';
import { ARRANGEMENT_COST, STYLES } from '../../studio/content';
import { readableError } from '../../studio/errors';

export function HomeDetail({ homeId }: { homeId: string }) {
  return (
    <AuthGate>
      <HomeBody homeId={homeId as Id<'homes'>} />
    </AuthGate>
  );
}

function HomeBody({ homeId }: { homeId: Id<'homes'> }) {
  const home = useQuery(api.homes.get, { homeId });
  const me = useQuery(api.account.me);
  const saveFile = useMutation(api.homes.saveFile);
  const uploadUrl = useMutation(api.homes.generateUploadUrl);
  const update = useMutation(api.homes.update);
  const remove = useMutation(api.homes.remove);
  const removeFile = useMutation(api.homes.removeFile);
  const token = useAuthToken();
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const [style, setStyle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function upload(kind: 'floor_plan' | 'photo', file: File) {
    setError('');
    setPending(kind);
    try {
      const url = await uploadUrl();
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      if (!response.ok) throw new Error('The upload did not finish.');
      const { storageId } = await response.json() as { storageId: Id<'_storage'> };
      await saveFile({ homeId, storageId, kind, fileName: file.name, contentType: file.type || 'application/octet-stream' });
    } catch (err) {
      setError(readableError(err, 'Could not save that file.'));
    } finally {
      setPending('');
    }
  }

  async function arrangeList() {
    if (!token || !home) return;
    setPending('arrange');
    setError('');
    try {
      const response = await fetch('/api/studio/arrange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recordId: home.id, style: style || home.style, prompt: home.notes }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'The arrangement did not start.');
    } catch (err) {
      setError(readableError(err, 'The arrangement did not start.'));
    } finally {
      setPending('');
    }
  }

  if (home === undefined) return <div className="hb"><SiteNav /><p className="hb-wait">Loading this home…</p></div>;
  if (home === null) return <div className="hb"><SiteNav /><main className="hb-narrow"><h1>That home is not on this account.</h1><Link href="/homes">Back to your homes</Link></main></div>;

  const chosen = style || home.style;
  return (
    <div className="hb">
      <SiteNav />
      <main className="hb-page">
        <p className="hb-kicker"><Link href="/homes">Homes</Link> / {home.place || 'Unplaced'}</p>
        <h1>{home.name}</h1>
        <div className="hb-grid-2" style={{ marginTop: 24 }}>
          <section>
            <h2>Floor plans and photos</h2>
            <p>PNG, JPG, WebP, or a PDF floor plan. Photos are the same formats, without PDF.</p>
            <div className="hb-row">
              <label className="hb-button ghost">
                {pending === 'floor_plan' ? 'Uploading…' : 'Upload floor plan'}
                <input hidden type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload('floor_plan', file); event.target.value = ''; }} />
              </label>
              <label className="hb-button ghost">
                {pending === 'photo' ? 'Uploading…' : 'Upload photo'}
                <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload('photo', file); event.target.value = ''; }} />
              </label>
            </div>
            <div className="hb-files" style={{ marginTop: 16 }}>
              {home.files.length === 0 && <p>Nothing uploaded yet.</p>}
              {home.files.map((file) => (
                <figure key={file.id} className="hb-panel" style={{ margin: 0 }}>
                  {file.contentType === 'application/pdf' ? <iframe title={file.fileName} src={file.url ?? undefined} /> : file.url && <img src={file.url} alt={file.fileName} />}
                  <figcaption>
                    <strong>{file.kind === 'floor_plan' ? 'Floor plan' : 'Photo'}</strong>
                    <small className="hb-meta">{file.fileName}</small>
                    <button type="button" className="hb-text-link" onClick={() => void removeFile({ fileId: file.id })}>Remove</button>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
          <aside className="hb-panel">
            <h2>Arrange</h2>
            <p>Pick a style. The furniture is placed in the room, then you walk through it.</p>
            <label className="hb-field">Style
              <select value={chosen} onChange={(event) => { setStyle(event.target.value); void update({ homeId, style: event.target.value }); }}>
                {STYLES.map((item) => <option key={item.name}>{item.name}</option>)}
              </select>
            </label>
            {home.sampleId ? (
              <>
                <Link className="hb-button" href={`/furnish?home=${home.sampleId}&record=${home.id}`}>Arrange this apartment</Link>
                <Link className="hb-text-link" href={`/decorate?home=${home.sampleId}`}>Walk the current interior</Link>
              </>
            ) : (
              <button className="hb-button" type="button" disabled={pending === 'arrange' || (me?.credits ?? 0) < ARRANGEMENT_COST} onClick={() => void arrangeList()}>
                {pending === 'arrange' ? 'Arranging…' : 'Arrange this room'}
              </button>
            )}
            {!home.sampleId && <p>Uploaded plans get a buyable furniture list. Walkable samples can place pieces inside the walls.</p>}
            {error && <p className="hb-error" role="alert">{error}</p>}
            <h3 style={{ marginTop: 18 }}>Arrangements</h3>
            {home.arrangements.length === 0 && <p>None yet.</p>}
            {home.arrangements.map((row) => (
              <article key={row.id} style={{ marginTop: 10 }}>
                <strong>{row.style}</strong> · <span className="hb-meta">{row.status} · {row.creditsCharged} credits</span>
                {row.summary && <p>{row.summary}</p>}
                {row.pieces.length > 0 && (
                  <ul>{row.pieces.map((piece) => <li key={piece.id}>{piece.quantity} × {piece.id} — {piece.reason}</li>)}</ul>
                )}
              </article>
            ))}
          </aside>
        </div>
        <div style={{ marginTop: 28 }}>
          {!confirmDelete ? (
            <button type="button" className="hb-text-link" onClick={() => setConfirmDelete(true)}>Delete this home</button>
          ) : (
            <div className="hb-row">
              <span>Delete {home.name} and its files?</span>
              <button type="button" className="hb-button" onClick={() => void remove({ homeId }).then(() => { window.location.href = '/homes'; })}>Delete</button>
              <button type="button" onClick={() => setConfirmDelete(false)}>Keep it</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
