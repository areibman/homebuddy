import { assertSameOrigin, errorResponse, HttpError, json, requireAccount } from '@/lib/server/convex';

const MODEL = 'gpt-6-astra';

/**
 * The web app never runs generation. It records a job in Convex and, when a worker address is
 * configured, nudges the worker so it starts before its next poll. The worker also claims queued
 * jobs from Convex on its own, so a failed nudge leaves the job queued rather than lost.
 */
type QueuedJob = { id: string; userId: string; homeId: string | null; name: string; notes: string; inputKeys: string[] };

async function workerHealthy() {
  const worker = process.env.ASSET_WORKER_URL, token = process.env.ASSET_WORKER_TOKEN;
  if (!worker || !token) return false;
  try {
    const response = await fetch(worker.replace(/\/$/, '') + '/', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function wakeWorker(job: QueuedJob) {
  const worker = process.env.ASSET_WORKER_URL, token = process.env.ASSET_WORKER_TOKEN;
  if (!worker || !token) return false;
  try {
    const response = await fetch(worker.replace(/\/$/, '') + '/adopt', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
      signal: AbortSignal.timeout(15000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export const maxDuration = 30;

export async function GET() {
  return json({ configured: await workerHealthy(), model: MODEL });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, 'Please upload from Homebuddy.');
    if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError('Upload the files first, then send their keys.', 415);
    const { client, api, me } = await requireAccount(request, 'Sign in to generate a home.');
    const body = await request.json() as { homeId?: string; name?: string; notes?: string; inputKeys?: unknown };
    const inputKeys = Array.isArray(body.inputKeys) ? body.inputKeys.filter((key): key is string => typeof key === 'string') : [];
    if (!inputKeys.length) throw new HttpError('Upload a floor plan or photo before generating.', 400);
    const queued = await client.mutation(api.jobs.enqueue, {
      homeId: body.homeId ? (body.homeId as never) : undefined,
      name: String(body.name || '').trim(),
      notes: String(body.notes || '').trim(),
      idempotencyKey: request.headers.get('Idempotency-Key') || '',
      inputKeys,
    });
    const woke = await wakeWorker({ id: queued.jobId, userId: me.userId, homeId: queued.homeId, name: String(body.name || ''), notes: String(body.notes || ''), inputKeys });
    return json({ id: queued.jobId, homeId: queued.homeId, status: 'queued', model: MODEL, workerNotified: woke }, 202);
  } catch (error) {
    return errorResponse(error, 'The upload could not be accepted.');
  }
}
