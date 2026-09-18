import { assetStore, contentTypeFor, isPublicAsset } from '../../../../server/asset-store.mjs';
import { requireAccount } from '@/lib/server/convex';

async function ownerId(request: Request) {
  return requireAccount(request).then(({ me }) => me.userId as string).catch(() => null);
}

export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await context.params;
  const key = parts.join('/');
  const url = new URL(request.url);
  try {
    if (!isPublicAsset(key) && !assetStore.verify(key, url.searchParams.get('exp'), url.searchParams.get('sig'))) {
      return new Response('Sign in to open this file.', { status: 401 });
    }
    if (isPublicAsset(key)) {
      const local = await assetStore.readLocal(key);
      if (local) {
        return new Response(new Uint8Array(local.body), {
          headers: {
            'Content-Type': local.contentType || contentTypeFor(key),
            'Content-Length': String(local.size || local.body.length),
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    }
    if (assetStore.mode === 's3') {
      const publicAsset = isPublicAsset(key);
      return new Response(null, {
        status: 302,
        headers: {
          Location: assetStore.signedGet(key, publicAsset ? 7200 : 600),
          'Cache-Control': publicAsset ? 'public, max-age=3600' : 'private, max-age=600',
        },
      });
    }
    const file = await assetStore.get(key);
    if (!file) return new Response('Asset not found.', { status: 404 });
    return new Response(new Uint8Array(file.body), {
      headers: {
        'Content-Type': file.contentType || contentTypeFor(key),
        'Content-Length': String(file.size || file.body.length),
        'Cache-Control': isPublicAsset(key) ? 'public, max-age=31536000, immutable' : 'private, max-age=600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Asset not found.', { status: 404 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const userId = await ownerId(request);
  if (!userId) return new Response('Sign in to delete this file.', { status: 401 });
  const { key: parts } = await context.params;
  const key = parts.join('/');
  if (!key.startsWith(`homes/${userId}/`)) return new Response('That file is not on your account.', { status: 403 });
  await assetStore.remove(key);
  return new Response(null, { status: 204 });
}
