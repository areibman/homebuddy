# Homebuddy

One application lives in `furniture-catalog/` (the historical directory name). Run `npm run dev` from this repository root.

- `/`: browse a real OpenStreetMap street map and enter a playable home directly. Incomplete interiors are disabled in the list and omitted from the map.
- `/decorate?home=13`: explore and decorate Spera Plan E. Other home IDs show an unavailable state until their playable interior is implemented. Availability and verified map coordinates live in `app/city/playable.ts`.
- `/catalog`: the shared furniture library.

The former `homebuddy-city` project is now only a compatibility launcher. Existing remote deployments are not changed by this local consolidation.
