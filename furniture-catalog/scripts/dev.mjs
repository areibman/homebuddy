import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Local development runs the generation worker beside `next dev`. Production runs
// `node server/asset-worker.mjs` on its own host; see the README.
const configuredToken = process.env.ASSET_WORKER_TOKEN;
const token = configuredToken || randomBytes(32).toString('hex');
let worker;
if (!process.env.ASSET_WORKER_URL) {
  const { createAssetWorker } = await import('../server/asset-worker.mjs');
  const convexSite = process.env.CONVEX_SITE_URL || process.env.VITE_CONVEX_SITE_URL || '';
  worker = await createAssetWorker({
    root: fileURLToPath(new URL('../.asset-jobs', import.meta.url)),
    token,
    convexSite,
    convexToken: token,
  });
  process.env.ASSET_WORKER_URL = worker.url;
  process.env.ASSET_WORKER_TOKEN = token;
  if (!convexSite) {
    console.warn('[dev] CONVEX_SITE_URL is not set. The worker cannot claim or complete jobs in Convex.');
  } else if (!configuredToken) {
    console.warn('[dev] ASSET_WORKER_TOKEN is not set, so Convex cannot verify this worker and generated homes will not be saved.');
    console.warn('[dev] Set the same value in .env.local and with `npx convex env set ASSET_WORKER_TOKEN <value>`.');
  }
}

const child = spawn('npx', ['next', 'dev', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
const stop = async (code = 0) => {
  await worker?.close();
  process.exit(code);
};
child.on('exit', (code) => void stop(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child.kill(signal); });
