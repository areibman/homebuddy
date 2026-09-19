'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { useAuthToken, useConvexAuth } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { CUSTOM_FURNITURE_COST } from '../studio/content';
import { deleteAssets, signedUrls, uploadAsset } from '../assets/client';

export function CustomModels() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.account.me);
  const models = useQuery(api.furniture.list);
  const token = useAuthToken();
  const save = useMutation(api.furniture.save);
  const remove = useMutation(api.furniture.remove);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [downloads, setDownloads] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!token || !models?.length) return;
    const keys = models.flatMap((model) => [model.glbKey, model.previewKey].filter((key): key is string => Boolean(key)));
    void signedUrls(token, keys).then(setDownloads).catch(() => undefined);
  }, [token, models]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const glb = data.get('glb');
    if (!(glb instanceof File) || !glb.size) {
      setError('Choose a GLB file.');
      return;
    }
    if (!glb.name.toLowerCase().endsWith('.glb')) {
      setError('The model needs to be a .glb file.');
      return;
    }
    setPending(true);
    setError('');
    try {
      if (!token) throw new Error('Sign in to upload a model.');
      const uploaded = await uploadAsset(token, glb, 'glb');
      const preview = data.get('preview');
      const previewUpload = preview instanceof File && preview.size ? await uploadAsset(token, preview, 'preview') : undefined;
      await save({
        name: String(data.get('name') || ''),
        category: String(data.get('category') || 'Your models'),
        widthCm: Number(data.get('width')),
        depthCm: Number(data.get('depth')),
        heightCm: Number(data.get('height')),
        glbKey: uploaded.key,
        previewKey: previewUpload?.key,
        glbSize: uploaded.size,
        contentType: uploaded.contentType,
      });
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that model.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="hb" style={{ padding: '28px 4vw 40px' }}>
      <div className="hb-section-head">
        <p className="hb-kicker">Your models</p>
        <h2>Bring the chair you already own.</h2>
        <p>Drop in a model and it sits beside the catalog pieces, ready to place in the apartment you just walked through.</p>
      </div>
      {isLoading ? <p>Checking your account…</p> : !isAuthenticated ? <Link className="hb-button" href="/sign-in?next=/catalog">Sign in to upload a model</Link> : (
        <div className="hb-grid-2">
          <form className="hb-form hb-panel" onSubmit={submit}>
            <label>Name<input name="name" required minLength={2} maxLength={80} placeholder="Grandma’s oak table" /></label>
            <label>Category<input name="category" defaultValue="Your models" maxLength={40} /></label>
            <div className="hb-row">
              <label>Width cm<input name="width" type="number" min={5} max={500} required /></label>
              <label>Depth cm<input name="depth" type="number" min={5} max={500} required /></label>
              <label>Height cm<input name="height" type="number" min={5} max={500} required /></label>
            </div>
            <label>GLB model<input name="glb" type="file" accept=".glb,model/gltf-binary" required /></label>
            <label>Preview image <span className="hb-meta">optional</span><input name="preview" type="file" accept="image/png,image/jpeg,image/webp" /></label>
            {error && <p className="hb-error" role="alert">{error}</p>}
            <button className="hb-button" type="submit" disabled={pending || (me?.credits ?? 0) < CUSTOM_FURNITURE_COST}>
              {pending ? 'Uploading…' : 'Add to your catalog'}
            </button>
          </form>
          <div className="hb-home-list">
            {models?.length === 0 && <p>No custom models yet.</p>}
            {models?.map((model) => (
              <article className="hb-home-card" key={model.id}>
                <span>
                  <strong>{model.name}</strong>
                  <small>{model.category} · {Math.round(model.widthM * 100)} × {Math.round(model.depthM * 100)} cm · {model.creditsCharged} credits</small>
                  {(downloads[model.glbKey || ''] || model.glbUrl) && <a href={downloads[model.glbKey || ''] || model.glbUrl || undefined}>Download GLB</a>}
                </span>
                <button type="button" onClick={() => void remove({ id: model.id }).then((result) => { if (token) void deleteAssets(token, result.keys); })}>Remove</button>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
