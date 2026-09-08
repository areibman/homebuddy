# BILLY fidelity review

Exact source photograph of IKEA article 205.220.46, white 80×28×202 cm, inspected at 1400×1400 on 2026-09-08.

## Observed mismatches in previous reconstruction

- Previous beige floor and dim lighting made the white paper-foil finish appear gray or beige.
- Previous elevated camera showed too much of the top panel and shelf surfaces; original photograph is close to frontal, with a narrow right side visible.
- IKEA side panels extend to the floor alongside the inset plinth. This relationship needs a crisper visible shadow line.
- Source shows five internal shelves (six compartments), thin front edges, white back and two rows of small adjustment holes per side. Count is correct in the previous mesh, but holes and interior separation were too faint.
- Rear lower side-panel skirting cutout is present in the reference silhouette and absent in the first version.

## Correction scope

Retain correct 18 mm panels and five internal shelves, refine plinth and rear bottom cutout, clarify hole contrast, use neutral white material and lighting and a catalog-like low three-quarter view. Roundtrip exported GLB into a new scene and render to verify appearance.

## Remaining uncertainty

Shelf placement and toe-kick details are inferred from photograph. This is a simplified recreation, not manufacturer CAD; outer dimensions remain exactly 80×28×202 cm.

## Final validation

Final native and imported-GLB previews were inspected at 1200×900 with 4 denoised samples. Their mean absolute display-RGB difference is 0.0013/255 (95th percentile 0/255), confirming export preserves the appearance. White-on-white native preview is low contrast; this is a lighting limitation, while the actual neutral PBR material and shelf geometry are present. Additional viewer ambient occlusion can strengthen shelf depth without changing the product color. Adjustment holes are joined into one mesh to reduce browser draw calls; the GLB has 12 meshes and an actual transformed-vertex envelope of 0.8000×0.2800×2.0200 m. No studio objects are exported. Camera is orthographic at roughly 20° azimuth / 5° elevation with 89% vertical occupancy in the 1200×900 frame. Shelf details and joinery remain photograph-inferred approximations.

Browser fidelity pass: baked ambient occlusion to a second UV atlas, embedded in GLB, preserving contact depth at joints and seams in real-time lighting. Native PBR color maps remain unchanged.
