# Homebuddy

One application lives in `furniture-catalog/` (the historical directory name). Run `npm run dev` from this repository root.

- `/`: browse a real OpenStreetMap street map and enter a playable home directly. Incomplete interiors are disabled in the list and omitted from the map.
- `/decorate?home=13`: explore and decorate Spera Plan E (503 sq ft).
- `/decorate?home=15`: explore 333 Bush Street #4101 (1,250 sq ft), with Gather and Retreat furniture arrangements, listing finishes, full appliances, and 11 working doors. Download the furnished Blender scenes through Photos & floor plan.
- Other home IDs show an unavailable state until their playable interior is implemented. Availability and verified map coordinates live in `app/city/playable.ts`.
- `/catalog`: the shared furniture library.
- `/furnish?home=15`: the Bush Street demo. Choose catalog furniture or start with Skyline Social / Evening Retreat, review quantities and the catalog subtotal, then ask GPT-6 Astra to arrange the selected pieces. The map opens this flow for Bush Street.

The furnishing demo uses a server-side `OPENAI_API_KEY` with access to `gpt-6-astra`. Set it in the server environment or an ignored `furniture-catalog/.env.local` file before starting the app. No key is sent to the browser. Hosted environments must configure the same key as a secret. The demo is running locally; existing remote deployments have not been changed.

Requests use the OpenAI Responses API in background mode, with a signed job token saved on this browser. Refreshing the selection page resumes polling. The app checks all returned instances for catalog membership, floor containment, wall/fixture/furniture intersections, entrance clearance, door sweeps, and walking routes to every room. It asks Astra for up to two corrections when needed; it does not substitute a preset layout for a failed request. Pieces that cannot fit are listed explicitly. Generated arrangements use the existing 3D editor and do not offer the preset Blender downloads.

Prices are the saved US catalog references checked September 8, 2026, including the sofa prices in `.firecrawl/sofas-ten.md`. Quantity totals use integer cents. Original Homebuddy TV designs have no retail price and are explicitly excluded from the subtotal; tax, delivery, and separately sold accessories are extra.

Demo checks: `cd furniture-catalog && node scripts/check-astra-demo.mjs` and `node scripts/check-city-integration.mjs` (the latter expects the dev server on port 3000).

The former `homebuddy-city` project is now only a compatibility launcher. Existing remote deployments are not changed by this local consolidation.

The apartment editor includes Morning, Daylight, Golden hour, and Night lighting. Auto follows San Francisco time (morning 6–10, daylight 10–17, golden hour 17–20, night 20–6); these are preview periods, not a solar simulation. The selected mode is remembered on this browser.

In Walk mode, ambient light and reflections follow connected space from windows and declared fixtures. Walls and closed doors block this indirect fill; unlit closets receive spill only through an open doorway. Direct lights retain their shadow maps. The roofless overview keeps its presentation lighting.
