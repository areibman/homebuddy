'use client';

import { createElement, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { useConvexAuth } from '@convex-dev/auth/react';
import { seedCatalog, studioHdr, type CatalogItem } from '../catalog/items';
import prices from '../decorate/prices.json';

const PRICE = new Map(prices.map((row) => [row.id, row.amount]));
const SNAP = [
  { id: 'armchair', label: 'Armchair' },
  { id: 'floor-lamp', label: 'Lamp' },
  { id: 'glostad', label: 'Sofa' },
  { id: 'dining-table', label: 'Table' },
] as const;

function shortName(name: string) {
  return name.split(/ — |, /)[0];
}

function money(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function pieceMeta(item: CatalogItem) {
  const amount = PRICE.get(item.id);
  if (amount != null) return money(amount);
  const width = Math.round(item.dimensions_m.width * 100);
  const depth = Math.round(item.dimensions_m.depth * 100);
  return `${width} × ${depth} cm`;
}

function useUploadHref() {
  const { isAuthenticated } = useConvexAuth();
  return isAuthenticated ? '/homes' : '/sign-in?next=/homes';
}

export function CatalogRail() {
  const uploadHref = useUploadHref();
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ prev: false, next: true });

  function sync() {
    const el = track.current;
    if (!el) return;
    setEdges({
      prev: el.scrollLeft > 8,
      next: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  }

  useEffect(() => {
    sync();
    const el = track.current;
    if (!el) return;
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      el.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  function move(direction: number) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.current?.scrollBy({ left: direction * 260, behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <section id="features" className="hb-rail" aria-labelledby="catalog-title">
      <div className="hb-section-head hb-rail-head">
        <div>
          <p className="hb-kicker">Catalog</p>
          <h2 id="catalog-title">Furniture you can place today.</h2>
          <p className="hb-quiet">Browse the catalog, or photograph a piece you already own.</p>
        </div>
        <div className="hb-rail-controls">
          <button type="button" aria-label="Previous furniture" disabled={!edges.prev} onClick={() => move(-1)}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next furniture" disabled={!edges.next} onClick={() => move(1)}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={edges.next ? 'hb-rail-scroll has-more' : 'hb-rail-scroll'}>
        <ul className="hb-rail-track" ref={track}>
          {seedCatalog.map((item) => (
            <li key={item.id}>
              <Link className="hb-piece" href="/catalog">
                <span className="hb-piece-photo">
                  <img src={item.files.preview} alt="" />
                </span>
                <span className="hb-piece-copy">
                  <span>{item.category}</span>
                  <strong>{shortName(item.name)}</strong>
                  <span className="hb-piece-meta">{pieceMeta(item)}</span>
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link className="hb-piece hb-piece-own" href={uploadHref}>
              <span className="hb-piece-photo">
                <Camera size={28} aria-hidden="true" />
              </span>
              <span className="hb-piece-copy">
                <span>Your photos</span>
                <strong>Add a piece you own</strong>
                <span className="hb-piece-meta">Snap it, then place it</span>
              </span>
            </Link>
          </li>
        </ul>
      </div>
      <div className="hb-rail-actions">
        <Link className="hb-button" href="/catalog">Browse the catalog</Link>
        <Link className="hb-button ghost" href={uploadHref}>Upload your photos</Link>
      </div>
      <p className="hb-rail-note">Models are independent recreations. Photos you upload stay on your account.</p>
    </section>
  );
}

const ORBITS: Record<string, string> = {
  armchair: '19deg 80deg 84%',
  'floor-lamp': '14deg 82deg 105%',
  glostad: '22deg 72deg 118%',
  'dining-table': '-23deg 74deg 98%',
};

function SpinningModel({ item, reduce }: { item: CatalogItem; reduce: boolean }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let gone = false;
    void import('@google/model-viewer').then(() => { if (!gone) setReady(true); }).catch(() => { if (!gone) setFailed(true); });
    return () => { gone = true; };
  }, []);
  if (!ready || failed) return <img src={item.files.preview} alt="" />;
  return createElement('model-viewer', {
    key: item.id,
    src: item.files.glb,
    poster: item.files.preview,
    alt: `3D model of ${shortName(item.name)}. Drag to turn it.`,
    'camera-controls': true,
    'touch-action': 'pan-y',
    'disable-pan': true,
    'shadow-intensity': '0.55',
    'shadow-softness': '0.9',
    exposure: '1.05',
    'tone-mapping': 'neutral',
    'environment-image': studioHdr,
    'camera-orbit': item.viewer?.orbit || ORBITS[item.id] || '20deg 75deg 112%',
    'max-camera-orbit': 'auto auto 170%',
    'min-camera-orbit': 'auto auto 70%',
    'field-of-view': item.viewer?.field_of_view || '30deg',
    'interaction-prompt': 'none',
    loading: 'eager',
    reveal: 'auto',
    style: { width: '100%', height: '100%' },
    ...(reduce ? {} : { 'auto-rotate': true, 'rotation-per-second': '16deg', 'auto-rotate-delay': '700' }),
  });
}

export function PhotoToModel() {
  const uploadHref = useUploadHref();
  const examples = SNAP.flatMap((entry) => {
    const item = seedCatalog.find((piece) => piece.id === entry.id);
    return item ? [{ ...entry, item }] : [];
  });
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [reduce, setReduce] = useState(false);
  const current = examples[index] ?? examples[0];

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  if (!current) return null;
  const photo = !failed[current.id] && current.item.source.photo_url ? current.item.source.photo_url : current.item.files.preview;

  return (
    <section id="snap" className="hb-snap" aria-labelledby="snap-title">
      <div className="hb-snap-copy">
        <p className="hb-kicker">Your furniture</p>
        <h2 id="snap-title">Snap a photo. Add it to the house.</h2>
        <p className="hb-quiet">Photograph a chair, lamp, or table you already own. It becomes a model you can place in the room.</p>
        <div className="hb-chips" role="group" aria-label="Example pieces">
          {examples.map((entry, entryIndex) => (
            <button key={entry.id} type="button" aria-pressed={entryIndex === index} onClick={() => setIndex(entryIndex)}>
              {entry.label}
            </button>
          ))}
        </div>
        <div className="hb-rail-actions">
          <Link className="hb-button" href={uploadHref}>Upload your photos</Link>
          <Link className="hb-text-link" href="/catalog">Or browse the catalog</Link>
        </div>
      </div>
      <div className="hb-snap-stage">
        <div className="hb-snap-demo">
          <figure className="hb-shot">
            <div className="hb-shot-frame">
              <span className="hb-pane-tag">Photo</span>
              <img
                src={photo}
                alt={`Photo of ${shortName(current.item.name)}`}
                referrerPolicy="no-referrer"
                onError={() => setFailed((value) => (value[current.id] ? value : { ...value, [current.id]: true }))}
              />
            </div>
          </figure>
          <div className="hb-snap-join" aria-hidden="true"><span>becomes</span></div>
          <figure className="hb-turn">
            <div className="hb-turn-stage">
              <span className="hb-pane-tag">3D model</span>
              <SpinningModel key={current.item.id} item={current.item} reduce={reduce} />
              <p className="hb-turn-hint">Drag to turn</p>
            </div>
          </figure>
        </div>
        <p className="hb-rail-note">{shortName(current.item.name)}. Example from the catalog. A photo of your own piece works the same way.</p>
      </div>
    </section>
  );
}
