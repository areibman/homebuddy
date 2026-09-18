import { assetStore } from '../../../../server/asset-store.mjs';
import { errorResponse, HttpError, json, requireAccount } from '@/lib/server/convex';

export async function POST(request: Request) {
  try {
    const { me } = await requireAccount(request, 'Sign in to open this file.');
    const body = await request.json() as { keys?: unknown };
    const keys = Array.isArray(body.keys) ? body.keys.filter((key): key is string => typeof key === 'string') : [];
    if (!keys.length || keys.length > 40) throw new HttpError('Choose files to open.', 400);
    const prefix = `homes/${me.userId}/`;
    const urls: Record<string, string> = {};
    for (const key of keys) {
      if (!key.startsWith(prefix)) throw new HttpError('That file is not on your account.', 403);
      urls[key] = assetStore.signedGet(key);
    }
    return json({ urls });
  } catch (error) {
    return errorResponse(error, 'Could not open that file.');
  }
}
