import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, rename, readdir, realpath, stat, rm } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { validateInteriorPlan } from './interior-plan.mjs';
import { assetStore as defaultStore, contentTypeFor } from './asset-store.mjs';
import { generateInSandbox, MODEL as SANDBOX_MODEL } from './sandbox-generate.mjs';

export const MODEL = SANDBOX_MODEL;

/**
 * The generation worker. Convex owns the queue: jobs are created by the web app, this process claims
 * them (by polling, or when the web app pushes a freshly queued job to /adopt), runs the OpenAI sandbox,
 * validates what came back, publishes files to the asset store, and reports the result to Convex.
 *
 * The local `job.json` files are a diagnostic mirror. They are never authoritative.
 */

const ACTIVE = new Set(['queued', 'running', 'validating']);
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const publicJob = ({ id, name, status, createdAt, updatedAt, error, assetCount, interiorStatus }) => ({ id, name, status, createdAt, updatedAt, error, assetCount, interiorStatus, model: MODEL });
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

const ARCHITECTURE_PROMPT = (job) => `Reconstruct the architecture of the home described by the reference files in inputs/. Job: ${JSON.stringify({ name: job.name, notes: job.notes, files: job.files })}
Inspect every image, PDF, and video. Use a PDF renderer for plans and ffmpeg for video frames when those tools are available. Read the floor plan for walls, doors, windows, and fixed fittings. Use photos and videos only to confirm proportions and finishes.
Write output/interior.json, a walkable floor plan: name, height in metres between 2 and 6, footprint as [x,z] points, floors as [x,z,width,depth], walls as [x,z,x2,z2], fixtures as known fittings or [], doors as {x,z,width,rotation,swing} or [], furniture as [], and spawn as [x,z] inside the footprint. Metres, Y up, ground at y=0.
If the references cannot recover walls and a footprint, do not write interior.json and do not invent a generic house. Do not claim success until the file exists.`;

const FURNITURE_PROMPT = (job) => `Generate catalog-ready 3D furniture from the reference files in inputs/. Job: ${JSON.stringify({ name: job.name, notes: job.notes, files: job.files })}
Inspect every image, PDF, and video. Reconstruct each recognizable piece of furniture or room asset from photos and videos. Skip architecture; another step handles the floor plan. Do not invent furniture that is not in the references.
Write every final file in output/. Produce self-contained binary GLB 2 models with embedded materials and textures, metres, Y up, ground at y=0, centered X/Z. Also produce a rendered PNG, JPEG, or WebP preview of each model, not the source photo.
Write output/catalog.json as a JSON array. Each object must have name, category, description, materials, dimensions_m {width,depth,height}, provenance, and files {glb,preview,blend?}. Filenames are bare names in output/, letters numbers dashes and underscores only. Maximum 30 assets. Write an empty array when nothing recognizable is present. Do not claim success until the files exist.`;

export async function createAssetWorker({
  root = resolve('.asset-jobs'),
  token = '',
  port = 0,
  host = '127.0.0.1',
  generate = generateInSandbox,
  timeoutMs = 45 * 60 * 1000,
  pollMs = 4000,
  convexSite = process.env.CONVEX_SITE_URL || process.env.VITE_CONVEX_SITE_URL || '',
  convexToken = process.env.ASSET_WORKER_TOKEN || '',
  store = defaultStore,
} = {}) {
  if (!token) throw new Error('ASSET_WORKER_TOKEN is required.');
  await mkdir(root, { recursive: true, mode: 0o700 });
  const jobs = new Map();
  let active = false, closed = false, currentAbort, pollTimer;
  const adopting = new Set();

  async function convexCall(body) {
    if (!convexSite || !convexToken) return null;
    const response = await fetch(convexSite.replace(/\/$/, '') + '/worker', {
      method: 'POST',
      headers: { Authorization: `Bearer ${convexToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('The generation record could not be updated.');
    return response.json();
  }

  async function save(job) {
    job.updatedAt = new Date().toISOString();
    const path = join(root, job.id, 'job.json');
    await mkdir(join(root, job.id), { recursive: true, mode: 0o700 });
    await writeFile(path + '.tmp', JSON.stringify(job));
    await rename(path + '.tmp', path);
    jobs.set(job.id, job);
  }

  // Anything that was mid-flight when the previous process died cannot resume.
  for (const id of await readdir(root)) {
    try {
      const job = JSON.parse(await readFile(join(root, id, 'job.json'), 'utf8'));
      if (ACTIVE.has(job.status)) {
        job.status = 'failed';
        job.error = 'Generation was interrupted when the worker restarted. Upload again to retry.';
        await save(job);
      }
      jobs.set(id, job);
    } catch { /* not a job folder */ }
  }

  async function outputFile(id, name) {
    if (typeof name !== 'string' || !/^[-a-zA-Z0-9_]+\.(glb|png|jpg|jpeg|webp|blend)$/.test(name)) throw fail('Invalid asset filename.');
    const base = await realpath(join(root, id, 'output')), path = await realpath(join(base, name));
    if (!path.startsWith(base + '/')) throw fail('Asset is outside the output folder.');
    const info = await stat(path);
    if (!info.isFile() || info.size === 0 || info.size > 100 * 1024 * 1024) throw fail('Asset is empty or too large.');
    return path;
  }

  async function readOptional(path, limit) {
    try {
      if ((await stat(path)).size > limit) throw fail('Generated file is too large.');
      return await readFile(path, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /** Checks catalog.json and every referenced file. Returns [] when the model wrote nothing. */
  async function validateCatalog(job) {
    const raw = await readOptional(join(root, job.id, 'output', 'catalog.json'), 128 * 1024);
    if (raw === null) return [];
    const manifest = JSON.parse(raw);
    if (!Array.isArray(manifest) || manifest.length > 30) throw fail('Generation must produce 0–30 catalog assets.');
    const items = [];
    for (const [index, item] of manifest.entries()) {
      for (const key of ['name', 'category', 'description', 'provenance']) {
        if (typeof item[key] !== 'string' || !item[key].trim() || item[key].length > 3000) throw fail('Generated asset metadata is incomplete.');
      }
      if (!Array.isArray(item.materials) || item.materials.length > 30 || item.materials.some((m) => typeof m !== 'string' || m.length > 200)) throw fail('Invalid materials.');
      if (!['width', 'depth', 'height'].every((k) => Number.isFinite(item.dimensions_m?.[k]) && item.dimensions_m[k] > 0 && item.dimensions_m[k] < 1000)) throw fail('Invalid asset dimensions.');
      const files = {};
      for (const key of ['glb', 'preview', ...(item.files?.blend ? ['blend'] : [])]) {
        const name = item.files?.[key];
        if ((key === 'glb' && !name?.endsWith('.glb')) || (key === 'preview' && !/\.(png|jpg|jpeg|webp)$/.test(name ?? '')) || (key === 'blend' && !name?.endsWith('.blend'))) throw fail('Missing model or preview.');
        const bytes = await readFile(await outputFile(job.id, name));
        if (key === 'glb') {
          if (bytes.length < 28 || bytes.toString('utf8', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length || bytes.toString('utf8', 16, 20) !== 'JSON') throw fail('Invalid GLB model.');
          const scene = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
          if (!scene.meshes?.length || [...(scene.buffers || []), ...(scene.images || [])].some((v) => v.uri && !v.uri.startsWith('data:'))) throw fail('Models must contain meshes and embedded resources.');
        }
        if (key === 'preview' && !((bytes[0] === 137 && bytes.toString('utf8', 1, 4) === 'PNG') || (bytes[0] === 255 && bytes[1] === 216) || (bytes.toString('utf8', 0, 4) === 'RIFF' && bytes.toString('utf8', 8, 12) === 'WEBP'))) throw fail('Invalid preview image.');
        files[key] = name;
      }
      items.push({ index, item, files });
    }
    return items;
  }

  /** Checks interior.json. Returns a ready or failed interior record; the caller decides what that means. */
  async function validateInterior(job) {
    const raw = await readOptional(join(root, job.id, 'output', 'interior.json'), 900 * 1024);
    if (raw === null) return { status: 'failed', error: 'Astra could not recover walls and a footprint from these references.' };
    try {
      const plan = validateInteriorPlan(JSON.parse(raw), { requireSpawn: true });
      const area = plan.floors.reduce((sum, floor) => sum + floor[2] * floor[3], 0);
      return {
        status: 'ready',
        title: plan.name,
        subtitle: 'Your floor plan',
        beds: 1,
        sqft: Math.max(1, Math.round(area * 10.7639)),
        planJson: JSON.stringify(plan),
        listingJson: JSON.stringify({ source: 'Your upload', photos: [], finishes: {}, note: 'Reconstructed from your references. Dimensions are estimates.' }),
      };
    } catch (error) {
      return { status: 'failed', error: error.message || 'The generated floor plan could not be walked.' };
    }
  }

  async function publish(job, items, interior) {
    const output = join(root, job.id, 'output');
    const published = [];
    for (const { index, item, files } of items) {
      const keys = {};
      for (const [kind, name] of Object.entries(files)) {
        const key = `homes/${job.userId}/catalog/${job.id}/${name}`;
        await store.put(key, await readFile(join(output, name)), contentTypeFor(name));
        keys[kind] = key;
      }
      published.push({
        slug: `upload-${job.id}-${index}`,
        name: item.name,
        category: item.category,
        description: item.description,
        materials: item.materials,
        widthM: item.dimensions_m.width,
        depthM: item.dimensions_m.depth,
        heightM: item.dimensions_m.height,
        provenance: item.provenance,
        dimensionsNote: 'Reconstructed from your uploads. Unspecified dimensions are estimates.',
        retailer: 'Your uploads',
        sourceUrl: '',
        photoUrl: '',
        articleNumber: '',
        checkedDate: job.createdAt.slice(0, 10),
        glbKey: keys.glb,
        previewKey: keys.preview,
        ...(keys.blend ? { blendKey: keys.blend } : {}),
      });
    }
    const interiorRecord = interior.status === 'ready'
      ? interior
      : { status: 'failed', error: interior.error, title: job.name, subtitle: 'Not walkable', beds: 0, sqft: 0, planJson: '{}', listingJson: '{}' };
    await convexCall({ action: 'complete', jobId: job.id, items: published, interior: interiorRecord });
    return published;
  }

  async function runStage(job, prompt, signal) {
    const workspace = join(root, job.id, 'workspace');
    await mkdir(workspace, { recursive: true });
    await generate({ inputs: join(root, job.id, 'inputs'), output: join(root, job.id, 'output'), prompt, model: MODEL, signal, workspaceBaseDir: workspace });
  }

  async function drain() {
    if (active || closed) return;
    const job = [...jobs.values()].find((j) => j.status === 'queued');
    if (!job) return;
    active = true;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    currentAbort = abort;
    try {
      job.status = 'running';
      await save(job);
      await mkdir(join(root, job.id, 'output'), { recursive: true });
      // Two sandbox passes so a bad furniture result cannot take the floor plan down with it.
      const stageErrors = [];
      for (const prompt of [ARCHITECTURE_PROMPT(job), FURNITURE_PROMPT(job)]) {
        if (abort.signal.aborted) break;
        try { await runStage(job, prompt, abort.signal); } catch (error) { stageErrors.push(error); }
      }
      if (abort.signal.aborted) throw new Error('Generation reached its time limit. Try a smaller set of references.');
      job.status = 'validating';
      await save(job);
      const interior = await validateInterior(job);
      let items = [];
      try { items = await validateCatalog(job); } catch (error) { stageErrors.push(error); }
      if (interior.status !== 'ready' && !items.length) {
        const upstream = stageErrors.find((error) => error?.message && !error.status);
        throw new Error(upstream?.message || interior.error || 'OpenAI sandbox could not complete generation. Check Astra access and the reference files, then upload again.');
      }
      const published = await publish(job, items, interior);
      job.status = 'completed';
      job.assetCount = published.length;
      job.interiorStatus = interior.status;
      job.error = interior.status === 'failed' ? interior.error : undefined;
      await save(job);
    } catch (error) {
      job.status = 'failed';
      job.error = error.status ? 'Generated assets did not pass validation. Upload again with clearer references.' : error.message || 'Generation failed.';
      await save(job);
      await convexCall({ action: 'fail', jobId: job.id, error: job.error }).catch(() => undefined);
    } finally {
      clearTimeout(timer);
      currentAbort = undefined;
      active = false;
      void drain();
    }
  }

  /** Takes ownership of a job that Convex has already recorded and copies its inputs into a workspace. */
  async function adopt(claimed) {
    if (!claimed?.id || typeof claimed.id !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(claimed.id)) throw fail('Missing generation job.');
    const existing = jobs.get(claimed.id);
    if (existing) return existing;
    if (adopting.has(claimed.id)) return { id: claimed.id, name: claimed.name || '', status: 'queued', createdAt: new Date().toISOString() };
    if (!claimed.userId) throw fail('This generation job has no owner.');
    adopting.add(claimed.id);
    try {
      await mkdir(join(root, claimed.id, 'inputs'), { recursive: true, mode: 0o700 });
      const files = [];
      for (const [index, key] of (claimed.inputKeys || []).entries()) {
        if (typeof key !== 'string' || !key.startsWith(`homes/${claimed.userId}/`)) throw fail('An upload is not on this account.');
        const file = await store.get(key);
        if (!file) throw fail('An upload disappeared before generation started.');
        const filename = `reference-${index + 1}${extname(key).toLowerCase() || '.bin'}`;
        await writeFile(join(root, claimed.id, 'inputs', filename), file.body);
        files.push({ filename, type: file.contentType, size: file.size });
      }
      if (!files.length) throw fail('This generation job has no reference files.');
      const job = { id: claimed.id, userId: claimed.userId, homeId: claimed.homeId ?? null, name: String(claimed.name || 'Upload').slice(0, 100), notes: String(claimed.notes || '').slice(0, 2000), status: 'queued', createdAt: new Date().toISOString(), files };
      await save(job);
      void drain();
      return job;
    } catch (error) {
      await rm(join(root, claimed.id), { recursive: true, force: true }).catch(() => undefined);
      await convexCall({ action: 'fail', jobId: claimed.id, error: error.message || 'The worker could not start this job.' }).catch(() => undefined);
      throw error;
    } finally {
      adopting.delete(claimed.id);
    }
  }

  async function handle(request) {
    const provided = Buffer.from(request.headers.get('Authorization') || ''), expected = Buffer.from('Bearer ' + token);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return json({ error: 'Unauthorized' }, 401);
    const url = new URL(request.url);
    if (request.method === 'GET') {
      return json({ configured: true, model: MODEL, jobs: [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicJob) });
    }
    if (request.method === 'POST' && url.pathname.endsWith('/adopt')) {
      return json(publicJob(await adopt(await request.json())), 202);
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  const server = createServer(async (req, res) => {
    try {
      let length = 0;
      const chunks = [];
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 256 * 1024) throw fail('Request too large.', 413);
        chunks.push(chunk);
      }
      const response = await handle(new Request('http://worker' + req.url, { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks) }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.writeHead(error.status || 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.status ? error.message : 'The asset worker could not process this request.' }));
    }
  });
  await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(port, host, resolveListen); });

  if (convexSite && convexToken) {
    await convexCall({ action: 'fail-leased' }).catch(() => undefined);
    pollTimer = setInterval(() => {
      if (closed || active) return;
      void convexCall({ action: 'claim' }).then((claimed) => claimed && adopt(claimed)).catch(() => undefined);
    }, pollMs);
  }
  void drain();

  return {
    url: `http://${host}:${server.address().port}`,
    adopt,
    close: async () => {
      closed = true;
      currentAbort?.abort();
      if (pollTimer) clearInterval(pollTimer);
      await new Promise((resolveClose) => server.close(resolveClose));
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const worker = await createAssetWorker({
    root: resolve(process.env.ASSET_WORKER_DATA_DIR || '.asset-jobs'),
    token: process.env.ASSET_WORKER_TOKEN,
    port: Number(process.env.PORT || 4319),
    host: process.env.ASSET_WORKER_HOST || '127.0.0.1',
  });
  console.log('Asset worker listening at ' + worker.url);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await worker.close(); process.exit(0); });
}
