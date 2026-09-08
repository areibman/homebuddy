# Homebuddy

One application lives in `furniture-catalog/` (the historical directory name). Run `npm run dev` from this repository root.

- `/`: select a San Francisco home, inspect its floor plans, then choose **Decorate this home**.
- `/decorate?home=ID&plan=INDEX`: decorate the selected plan. Spera (13) has a walkable 3D model; other homes use their original images for 2D furniture layouts, with a user-adjustable scale.
- `/catalog`: the shared furniture library.

The former `homebuddy-city` project is now only a compatibility launcher. Existing remote deployments are not changed by this local consolidation.
