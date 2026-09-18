import { assetStore, contentTypeFor } from '../../../../server/asset-store.mjs';
import { errorResponse, json, requireAccount } from '@/lib/server/convex';

const LIMITS: Record<string, number> = { glb: 30 * 1024 * 1024, preview: 8 * 1024 * 1024, floor_plan: 20 * 1024 * 1024, photo: 20 * 1024 * 1024, reference: 50 * 1024 * 1024 };

function rejectKind(kind: string, fileName: string, contentType: string, size: number) {
  const limit = LIMITS[kind];
  if (!limit) return 'That upload kind is not accepted.';
  if (size > limit) return `Keep this file under ${Math.round(limit / 1024 / 1024)} MB.`;
  if (kind === 'glb' && (contentType.startsWith('image/') || contentType === 'application/pdf' || contentType.startsWith('video/') || !fileName.toLowerCase().endsWith('.glb'))) {
    return 'Upload a GLB model, not a photo or PDF.';
  }
  if (kind === 'preview' && !contentType.startsWith('image/')) return 'The preview needs to be an image.';
  if (kind === 'floor_plan' && !['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(contentType)) {
    return 'Floor plans need to be PNG, JPG, WebP, or PDF.';
  }
  if (kind === 'photo' && !['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) {
    return 'Photos need to be PNG, JPG, or WebP.';
  }
  if (kind === 'reference' && !/\.(png|jpe?g|webp|pdf|mp4|mov|webm)$/i.test(fileName)) {
    return 'Use PNG, JPG, WebP, PDF, MP4, MOV, or WebM files.';
  }
  return '';
}

export async function GET() {
  return json({ mode: assetStore.mode });
}

export async function POST(request: Request) {
  let me: Awaited<ReturnType<typeof requireAccount>>['me'];
  try {
    ({ me } = await requireAccount(request, 'Sign in to upload.'));
  } catch (error) {
    return errorResponse(error);
  }
  if (request.headers.get('content-type')?.includes('application/json')) {
    const body = await request.json() as { kind?: string; fileName?: string; contentType?: string; size?: number };
    const kind = String(body.kind || '');
    const fileName = String(body.fileName || 'upload');
    const contentType = body.contentType || contentTypeFor(fileName);
    const size = Number(body.size || 0);
    const reason = rejectKind(kind, fileName, contentType, size);
    if (reason) return json({ error: reason }, reason.includes('under') ? 413 : 400);
    if (assetStore.mode !== 's3') return json({ direct: false });
    const key = assetStore.userKey(me.userId, fileName);
    return json({ key, uploadUrl: assetStore.uploadUrl(key, contentType), size, contentType });
  }
  const form = await request.formData();
  const file = form.get('file');
  const kind = String(form.get('kind') || '');
  if (!(file instanceof File) || !file.size) return json({ error: 'Choose a file to upload.' }, 400);
  const contentType = file.type || contentTypeFor(file.name);
  const reason = rejectKind(kind, file.name, contentType, file.size);
  if (reason) return json({ error: reason }, reason.includes('under') ? 413 : 400);
  const key = assetStore.userKey(me.userId, file.name);
  const saved = await assetStore.put(key, Buffer.from(await file.arrayBuffer()), contentType);
  return json({ key: saved.key, size: saved.size, contentType: saved.contentType });
}
