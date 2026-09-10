import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, type ViteDevServer } from 'vite';
import hostingConfig from './.openai/hosting.json';
import {randomBytes} from 'node:crypto';
import {request as httpRequest} from 'node:http';
import {fileURLToPath} from 'node:url';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async ({ command }) => {
  // This file-backed app can preview in Node without the unstable workerd HMR bridge.
  // Hosted builds and previews with storage bindings still use the Worker runtime.
  const useWorkerRuntime = command === 'build' || Boolean(d1 || r2);
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    // Standalone verification servers must not replace the live preview's
    // optimized modules. Builds also get their own cache while dev stays open.
    cacheDir: command === 'build' ? 'node_modules/.vite-build' : 'node_modules/.vite-dev',
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      command === 'serve' && !process.env.ASSET_WORKER_URL && {
        name: 'homebuddy-local-asset-worker',
        async configureServer(server: ViteDevServer) {
          const {createAssetWorker} = await import('./server/asset-worker.mjs');
          const token = randomBytes(32).toString('hex');
          const worker = await createAssetWorker({
            root: fileURLToPath(new URL('./.asset-jobs', import.meta.url)), token,
          });
          server.middlewares.use('/api/imports', (req, res) => {
            if(req.method === 'POST' && req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) {
              res.writeHead(403, {'Content-Type':'application/json'});
              res.end(JSON.stringify({error:'Please upload from Homebuddy.'}));return;
            }
            const upstream = httpRequest(worker.url + (req.url || '/'), {
              method:req.method, headers:{...req.headers, authorization:`Bearer ${token}`},
            }, response => {res.writeHead(response.statusCode || 502,response.headers);response.pipe(res);});
            upstream.on('error', () => {if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'The asset worker is unavailable.'}));});
            req.pipe(upstream);
          });
          server.httpServer?.once('close', () => {
            void worker.close();
          });
        },
      },
      vinext(),
      sites(),
      useWorkerRuntime && cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
