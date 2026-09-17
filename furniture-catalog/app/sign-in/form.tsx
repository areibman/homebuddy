'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthActions } from '@convex-dev/auth/react';
import { SiteNav } from '../studio/chrome';

export function SignInForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const next = useSearchParams().get('next') || '/homes';
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'signUp' && !agreed) {
      setError('Agree to the terms before creating an account.');
      return;
    }
    setPending(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    formData.set('flow', mode);
    try {
      await signIn('password', formData);
      router.push(next.startsWith('/') ? next : '/homes');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not sign in.';
      setError(message.includes('Invalid') ? 'That email and password did not match.' : message);
      setPending(false);
    }
  }

  return (
    <div className="hb">
      <SiteNav />
      <main className="hb-hero">
        <div>
          <p className="hb-kicker">{mode === 'signUp' ? 'New studio' : 'Welcome back'}</p>
          <h1>{mode === 'signUp' ? 'Create the account that holds your homes.' : 'Sign in to your homes.'}</h1>
          <p className="hb-lede">Email and a password. No map of other people’s apartments on the other side of this form.</p>
        </div>
        <form className="hb-form hb-panel" onSubmit={submit}>
          {mode === 'signUp' && (
            <label>Name
              <input name="name" autoComplete="name" maxLength={80} placeholder="What should we call you?" />
            </label>
          )}
          <label>Email
            <input name="email" type="email" autoComplete="email" required placeholder="you@studio.test" />
          </label>
          <label>Password
            <input name="password" type="password" autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'} required minLength={8} placeholder="At least 8 characters" />
          </label>
          {mode === 'signUp' && (
            <label className="hb-row" style={{ fontWeight: 500 }}>
              <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
              <span>I agree to the <Link href="/legal">terms</Link>. Credits used on an accepted arrangement are not refunded.</span>
            </label>
          )}
          {error && <p className="hb-error" role="alert">{error}</p>}
          <button className="hb-button" type="submit" disabled={pending}>{pending ? 'Checking…' : mode === 'signUp' ? 'Create account' : 'Sign in'}</button>
          <button type="button" className="hb-text-link" onClick={() => { setMode(mode === 'signUp' ? 'signIn' : 'signUp'); setError(''); }}>
            {mode === 'signUp' ? 'I already have an account' : 'Create an account instead'}
          </button>
        </form>
      </main>
    </div>
  );
}
