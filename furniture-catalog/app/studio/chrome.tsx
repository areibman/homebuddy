'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConvexAuth } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function SiteNav() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.account.me);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={open ? 'hb-nav is-open' : 'hb-nav'}>
      <div className="hb-bar">
        <Link className="hb-brand-compact" href="/" onClick={() => setOpen(false)}>Homebuddy</Link>
        <button
          type="button"
          className="hb-menu"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
        <div id="site-menu" className="hb-menu-panel">
          <nav className="hb-links" aria-label="Homebuddy">
            <Link href="/" onClick={() => setOpen(false)}>Home</Link>
            <a href="/#features" onClick={() => setOpen(false)}>Features</a>
            <Link href="/homes" onClick={() => setOpen(false)}>Homes</Link>
            <Link href="/catalog" onClick={() => setOpen(false)}>Catalog</Link>
            <Link href="/pricing" onClick={() => setOpen(false)}>Plans</Link>
          </nav>
          <div className="hb-nav-end">
            {isAuthenticated && me && <span className="hb-credits">{me.credits} credits</span>}
            {!isLoading && isAuthenticated ? (
              <Link className="hb-text-link" href="/account" onClick={() => setOpen(false)}>Account</Link>
            ) : (
              <Link className="hb-text-link" href="/sign-in" onClick={() => setOpen(false)}>Sign in</Link>
            )}
            <Link className="hb-button" href={isAuthenticated ? '/homes' : '/sign-in'} onClick={() => setOpen(false)}>
              {isAuthenticated ? 'Your homes' : 'Upload a floor plan'}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="hb-footer">
      <p>Walk a furnished apartment, then upload the floor plan of the one you actually have. Not affiliated with the retailers in the catalog.</p>
      <nav aria-label="Footer">
        <Link href="/pricing">Pricing</Link>
        <Link href="/catalog">Catalog</Link>
        <Link href="/homes">Homes</Link>
        <Link href="/account">Account</Link>
        <Link href="/legal">Terms</Link>
      </nav>
    </footer>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return <div className="hb"><p className="hb-wait">Checking your account…</p></div>;
  if (!isAuthenticated) {
    return (
      <div className="hb">
        <SiteNav />
        <main className="hb-narrow">
          <p className="hb-kicker">Account</p>
          <h1>Sign in to open your homes.</h1>
          <p>Your floor plans, photos, and furniture stay on this account.</p>
          <Link className="hb-button" href="/sign-in?next=/homes">Sign in</Link>
        </main>
      </div>
    );
  }
  return <>{children}</>;
}
