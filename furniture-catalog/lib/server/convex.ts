import type { ConvexHttpClient } from 'convex/browser';
import type { api as Api } from '../../convex/_generated/api';

/** Errors that map straight to an HTTP status when a route catches them. */
export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export const convexUrl = () => process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || '';

export function bearerToken(request: Request) {
  return request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
}

/** Rejects cross-origin POSTs. Same-origin fetches from the app send a matching Origin header. */
export function assertSameOrigin(request: Request, message = 'Please make this request from Homebuddy.') {
  const origin = request.headers.get('Origin');
  if (request.method === 'POST' && origin && origin !== new URL(request.url).origin) throw new HttpError(message, 403);
}

export type ConvexHandle = { client: ConvexHttpClient; api: typeof Api };

/** A Convex HTTP client carrying the browser's auth token. Throws HttpError when accounts are unavailable. */
export async function convexFor(token: string): Promise<ConvexHandle> {
  const url = convexUrl();
  if (!url) throw new HttpError('Accounts are not connected.', 503);
  if (!token) throw new HttpError('Sign in to continue.', 401);
  const { ConvexHttpClient } = await import('convex/browser');
  const { api } = await import('../../convex/_generated/api');
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return { client, api };
}

/** The signed-in account behind a request, or an HttpError. */
export async function requireAccount(request: Request, signInMessage = 'Sign in to continue.') {
  const handle = await convexFor(bearerToken(request)).catch((error: unknown) => {
    if (error instanceof HttpError && error.status === 401) throw new HttpError(signInMessage, 401);
    throw error;
  });
  const me = await handle.client.query(handle.api.account.me, {});
  if (!me) throw new HttpError(signInMessage, 401);
  return { ...handle, me };
}

/** Turns a thrown error into a JSON response without leaking internals. */
export function errorResponse(error: unknown, fallback = 'The request could not be completed.', fallbackStatus = 400) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  return json({ error: error instanceof Error && error.message ? error.message : fallback }, fallbackStatus);
}
