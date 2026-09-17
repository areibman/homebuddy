import { Suspense } from 'react';
import { SignInForm } from './form';

export const metadata = {
  title: 'Sign in | Homebuddy',
  description: 'Sign in or create a Homebuddy account to upload floor plans and arrange furniture.',
};

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="hb-wait">Loading sign in…</p>}>
      <SignInForm />
    </Suspense>
  );
}
