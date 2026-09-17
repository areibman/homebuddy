'use client';

import Link from 'next/link';
import { useConvexAuth } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function SiteNav() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.account.me);
  return (
    <header className="hb-nav">
      <div className="hb-bar">
        <nav className="hb-links" aria-label="Homebuddy">
          <Link href="/">Home</Link>
          <a href="/#features">Features</a>
          <Link href="/homes">Homes</Link>
          <Link href="/catalog">Catalog</Link>
          <Link href="/pricing">Plans</Link>
        </nav>
        <div className="hb-nav-end">
          {isAuthenticated && me && <span className="hb-credits">{me.credits} credits</span>}
          {!isLoading && isAuthenticated ? (
            <Link className="hb-text-link" href="/account">Account</Link>
          ) : (
            <Link className="hb-text-link" href="/sign-in">Sign in</Link>
          )}
          <Link className="hb-button" href={isAuthenticated ? '/homes' : '/sign-in'}>
            {isAuthenticated ? 'Your homes' : 'Upload a floor plan'}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="hb-footer">
      <p>Walk a furnished apartment, then upload the floor plan of the one you actually have. Not affiliated with IKEA.</p>
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
