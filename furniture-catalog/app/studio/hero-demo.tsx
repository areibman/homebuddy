'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Footprints, Layers, ArrowUpRight, Expand, Shrink, MousePointerClick } from 'lucide-react';
import { seedCatalog } from '../catalog/items';
import { materializeSample } from '../decorate/resolve-home';
import { FurnitureHoverLabel, type FurnitureHover } from '../decorate/furniture-hover-label';
import prices from '../decorate/prices.json';
import '../decorate/room.css';

const DEMO_HOME = '15';
// Built once per module so the mount effect below does not see a new object on every render.
const DEMO = materializeSample(DEMO_HOME)!;
const DEMO_NEEDED = new Set([...DEMO.plan.furniture, ...(DEMO.plan.layouts ?? []).flatMap((entry) => entry.furniture)].map((piece) => piece.id));
const DEMO_ITEMS = seedCatalog.filter((item) => DEMO_NEEDED.has(item.id));
const priceLabel = (id: string) => {
  const price = prices.find((entry) => entry.id === id);
  if (price) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: price.amount % 1 === 0 ? 0 : 2 }).format(price.amount);
  const item = DEMO_ITEMS.find((entry) => entry.id === id);
  if (!item || item.source.retailer === 'Homebuddy' || item.source.retailer === 'Your uploads' || !item.source.url) return item?.source.retailer === 'Your uploads' ? 'Your upload' : 'Original design';
  return `See ${item.source.retailer} for price`;
};

type SceneApi = { mode(next: string): void; changeLayout(index: number): boolean; toggleExplosion(): void; setOverlay(open: boolean): void; dispose(): void };

/**
 * The landing-page demo. It renders the same scene as the editor from bundled sample data and the
 * shared public catalog, without a Convex subscription, the editor chrome, or the inventory. Only the
 * models that appear in the sample's layouts are fetched. Nothing mounts until the block is on screen.
 */
export function HeroDemo() {
  const home = DEMO;
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const api = useRef<SceneApi | null>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<'iso' | 'fps'>('iso');
  const [layout, setLayout] = useState(0);
  const [busy, setBusy] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [hover, setHover] = useState<FurnitureHover>(null);
  const [interacted, setInteracted] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
      const timer = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    import('../decorate/scene')
      .then(async ({ mountRoom }) => {
        if (!host.current || disposed) return;
        const result = await mountRoom(host.current, {
          status: setStatus,
          hover: setHover,
          furnitureExploded: setExploded,
          count: () => undefined,
          active: () => undefined,
          playing: () => undefined,
          hint: () => undefined,
          motion: (phase) => setBusy(phase !== null),
          // The demo has no inventory or detail dialogs; release the scene immediately.
          inventory: () => api.current?.setOverlay(false),
          details: () => api.current?.setOverlay(false),
          placement: () => undefined,
        }, DEMO, 0, 'auto', DEMO_ITEMS, { zoom: 1.75, azimuth: 217 });
        if (disposed) { result.dispose(); return; }
        api.current = result;
        cleanup = result.dispose;
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => { disposed = true; cleanup?.(); api.current = null; };
  }, [visible]);

  useEffect(() => {
    if (!status || !ready) return;
    const timer = setTimeout(() => setStatus(''), 3000);
    return () => clearTimeout(timer);
  }, [status, ready]);

  const layouts = home.plan.layouts ?? [];
  const hoveredItem = hover ? DEMO_ITEMS.find((item) => item.id === hover.id) : undefined;
  return (
    <div ref={frame} className="hb-demo" aria-label="Interactive apartment demo" aria-busy={visible && !ready}>
      <div className="hb-demo-stage">
        <div ref={host} className="room-canvas" />
        {!ready && !failed && (
          <div className="hb-demo-poster">
            <p>{visible ? 'Loading the apartment…' : `${home.beds} bedrooms · ${home.sqft.toLocaleString()} sq ft`}</p>
          </div>
        )}
        {failed && (
          <div className="hb-demo-poster">
            <p>The 3D demo could not load here.</p>
            <Link className="hb-text-link" href={`/decorate?home=${DEMO_HOME}`}>Open it in the editor</Link>
          </div>
        )}
        {ready && !interacted && (
          <button type="button" className="hb-demo-start" onClick={() => { setInteracted(true); host.current?.querySelector('canvas')?.focus(); }}>
            <span><MousePointerClick size={20} aria-hidden="true" />Click to interact</span>
          </button>
        )}
        {status && ready && interacted && <output className="room-status">{status}</output>}
        {ready && mode === 'fps' && <div className="crosshair" aria-hidden="true" />}
        {ready && interacted && mode === 'iso' && !busy && hover && hoveredItem && (
          <FurnitureHoverLabel hover={hover} name={hoveredItem.name.split(/ — |, /)[0]} price={priceLabel(hoveredItem.id)} photo={hoveredItem.source.photo_url || hoveredItem.files.preview} fallbackPhoto={hoveredItem.files.preview} />
        )}
      </div>
      <div className="hb-demo-tools">
        {layouts.length > 1 && (
          <div className="camera-toggle" aria-label="Furniture arrangement">
            {layouts.map((entry, index) => (
              <button key={entry.id} type="button" disabled={!ready || busy || mode !== 'iso'} aria-pressed={index === layout} onClick={() => { if (api.current?.changeLayout(index)) setLayout(index); }}>
                {entry.name}
              </button>
            ))}
          </div>
        )}
        {mode === 'iso' && (
          <button type="button" className="hb-demo-explode" disabled={!ready || busy} aria-pressed={exploded} onClick={() => api.current?.toggleExplosion()}>
            {exploded ? <Shrink size={14} /> : <Expand size={14} />}<span>{exploded ? 'Return' : 'Explode'}</span>
          </button>
        )}
        <div className="camera-toggle" aria-label="Camera view">
          <button type="button" disabled={!ready || busy} aria-pressed={mode === 'iso'} onClick={() => { api.current?.mode('iso'); setMode('iso'); }}><Layers size={15} /><span>Overview</span></button>
          <button type="button" disabled={!ready || busy} aria-pressed={mode === 'fps'} onClick={() => { api.current?.mode('fps'); setMode('fps'); }}><Footprints size={15} /><span>Walk</span></button>
        </div>
        <Link className="hb-demo-open" href={`/decorate?home=${DEMO_HOME}`}>Full editor <ArrowUpRight size={14} /></Link>
      </div>
      <p className="hb-demo-hint">{mode === 'fps' ? 'Click the room, then WASD to move and arrow keys to look. Click a piece to carry it.' : 'Drag to orbit, scroll to zoom. Click a piece to move it.'}</p>
    </div>
  );
}
