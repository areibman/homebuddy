# Homebuddy

One application lives in `furniture-catalog/` (the historical directory name). Run `npm run dev` from this repository root.

- `/`: browse a real OpenStreetMap street map and enter a playable home directly. Incomplete interiors are disabled in the list and omitted from the map.
- `/decorate?home=13`: explore and decorate Spera Plan E (503 sq ft).
- `/decorate?home=15`: explore 333 Bush Street #4101 (1,250 sq ft), with Gather and Retreat furniture arrangements, listing finishes, full appliances, and 11 working doors. Download the furnished Blender scenes through Photos & floor plan.
- Other home IDs show an unavailable state until their playable interior is implemented. Availability and verified map coordinates live in `app/city/playable.ts`.
- `/catalog`: the shared furniture library.
- Homepage **Upload your space**: upload a floor plan, photos, and/or walkthrough videos, then generate 3D assets with a background Codex process running `gpt-6-astra`. Completed models appear in `/catalog`, with rendered previews and GLB downloads.
- `/furnish?home=15`: the Bush Street demo. Choose catalog furniture or start with Skyline Social / Evening Retreat, review quantities and the catalog subtotal, then ask GPT-6 Astra to arrange the selected pieces. The map opens this flow for Bush Street.

The furnishing demo uses a server-side `OPENAI_API_KEY` with access to `gpt-6-astra`. Set it in the server environment or an ignored `furniture-catalog/.env.local` file before starting the app. No key is sent to the browser. Hosted environments must configure the same key as a secret. The demo is running locally; existing remote deployments have not been changed.

Requests use the OpenAI Responses API in background mode, with a signed job token saved on this browser. Refreshing the selection page resumes polling. The app checks all returned instances for catalog membership, floor containment, wall/fixture/furniture intersections, entrance clearance, door sweeps, and walking routes to every room. It asks Astra for up to two corrections when needed; it does not substitute a preset layout for a failed request. Pieces that cannot fit are listed explicitly. Generated arrangements use the existing 3D editor and do not offer the preset Blender downloads.

Prices are the saved US catalog references checked September 8, 2026, including the sofa prices in `.firecrawl/sofas-ten.md`. Quantity totals use integer cents. Original Homebuddy TV designs have no retail price and are explicitly excluded from the subtotal; tax, delivery, and separately sold accessories are extra.

Demo checks: `cd furniture-catalog && node scripts/check-astra-demo.mjs` and `node scripts/check-city-integration.mjs` (the latter expects the dev server on port 3000).

The former `homebuddy-city` project is now only a compatibility launcher. Existing remote deployments are not changed by this local consolidation.

### Upload generation worker

`npm run dev` starts a private, loopback-only Node worker automatically. It uses the installed `codex` CLI and its existing login; the account must have access to `gpt-6-astra`. The worker runs `codex exec` in a separate job workspace with the `workspace-write` sandbox. Install the media tools needed by your references (for example, ffmpeg for videos and a PDF renderer for PDFs); Codex can use the app's installed Three.js package to create models. Missing tools, account access, or unusable references produce a failed job instead of placeholder assets.

Uploads accept PNG, JPG, WebP, PDF, MP4, MOV, and WebM, up to 20 files and 50 MB combined. Jobs run one at a time with up to five pending jobs and a 45-minute time limit. Source uploads, workspaces, generated assets, and durable job metadata live in ignored `furniture-catalog/.asset-jobs/`. Closing the browser does not stop generation. A worker restart preserves completed assets and queued jobs, and marks interrupted running jobs as failed. Repeated submissions use an idempotency key so reconnecting does not create duplicate work. The worker validates the generated manifest, GLB container and embedded resources, file paths, and preview image signatures before publishing catalog entries. Dimensions inferred from references are labeled as estimates. Generated floor-plan models are catalog assets; they do not automatically become playable map homes.

Hosted Cloudflare Workers cannot launch local processes. To enable this flow outside local development, run `node server/asset-worker.mjs` on a persistent Node host with Codex authenticated, configure `ASSET_WORKER_TOKEN`, and set the web app's server-only `ASSET_WORKER_URL` and matching `ASSET_WORKER_TOKEN`. The standalone worker defaults to `127.0.0.1:4319`; use `PORT`, `ASSET_WORKER_HOST`, and `ASSET_WORKER_DATA_DIR` to configure its listener and persistent volume. Expose it only behind authenticated HTTPS and restrict app access to the intended users. Do not put the worker token or Codex credentials in browser code. Each worker needs its own data directory; do not run two workers against the same volume. Without a configured worker, hosted uploads show an explicit unavailable state.

Run `cd furniture-catalog && node scripts/check-asset-imports.mjs` for isolated integration checks of upload validation, authorization, duplicate submissions, model selection, catalog publishing, asset downloads, path traversal, restart persistence, and failures. These checks use a subprocess fixture and do not spend model credits.

The apartment editor includes Morning, Daylight, Golden hour, and Night lighting. Auto follows San Francisco time (morning 6–10, daylight 10–17, golden hour 17–20, night 20–6); these are preview periods, not a solar simulation. The selected mode is remembered on this browser.

In Walk mode, ambient light and reflections follow connected space from windows and declared fixtures. Walls and closed doors block this indirect fill; unlit closets receive spill only through an open doorway. Direct lights retain their shadow maps. The roofless overview keeps its presentation lighting.

Bush Street also offers three ready-to-view suggestions: Skyline Social, Evening Retreat, and City living. The first two are saved presets; City living is a checked result from a real GPT-6 Astra request, stored as placement data in `app/furnish/saved-astra-layout.json`. Opening and switching these suggestions never starts an OpenAI generation. A new successful Astra arrangement appears alongside all three in the same editor, and the displayed subtotal follows the selected arrangement.

The request status appears above the catalog and comes into view on start or completion. It distinguishes submitting, OpenAI-confirmed activity (with elapsed time and last confirmation), refinement, reconnection, success, failure, cancellation, and an unconfirmed submission. Saved layouts remain available during generation. A real browser-started Astra request completed with all 24 selected pieces placed after layout refinement, and the result rendered in the 3D editor. Browser checks cover map entry, totals, request resumption after refresh, saved-layout switching, generated/preset switching, and walking mode; failure/cancellation/reconnection are exercised with an isolated local response fixture.
