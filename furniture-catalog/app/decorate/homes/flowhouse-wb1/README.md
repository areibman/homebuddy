# Flow House WB1

Playable at `/decorate?home=flowhouse-wb1`. The homepage links to this imported home separately from the San Francisco map.

Source: page 1 of the supplied [Flow House two-bedroom PDF](https://flowhouse.imgix.net/cms/2_Bed_Floor_Plans_Final_65747c1695.pdf?fm=pdf), archived at `public/listings/flowhouse-wb1/source.pdf`. Pages 2 and 3 show different units, B3 and B4. This reconstruction uses WB1's floors 11–15 / 16–41 variant: 970 sq ft interior and 58 sq ft balcony.

The outline is traced at 1500px page height, scaled at 71.05px/metre to approximately 90m² interior. Room sizes, ceiling height (2.7m), hidden construction, finishes, and lighting are estimates, not surveyed dimensions. No interior photographs were supplied; oak, white paint, pale stone, and bathroom tile are proposed finishes. The editor uses a neutral outdoor background instead of attributing a San Francisco view to this unit.

Includes both bedrooms and baths, the angled hall and closets, washer/dryer, service cabinet, kitchen island, sink, dishwasher, refrigerator, range, balcony guards, and eight operable doors. The source balcony slider is approximated by a hinged glazed door. The source primary king bed is represented by the existing queen-size catalog asset. The A/C cupboard is represented as a closed service cabinet. Door handing is chosen for usable circulation; concealed details and joinery are not manufacturer models.

Two arrangements, **Palm & oak** and **Quiet mornings**, each contain 17 movable catalog pieces. Beds, nightstands, living and dining seating, rugs, a bookcase, and lamps are proposed decoration rather than an exact reproduction of the plan's furniture icons. Each arrangement has a rendered PNG and a packed Blender download under `public/plans/flowhouse-wb1-{gather,retreat}.*`. Full-height architecture and ceiling are separate hidden collections in the Blender file; enable them and hide the cutaway collection for interior views.

Rebuild from `furniture-catalog/`:

```sh
python3 scripts/trace-flowhouse.py
node scripts/check-flowhouse.mjs
node scripts/check-flowhouse-doors.mjs
node scripts/export-flowhouse.mjs
blender -b --python scripts/build-flowhouse.py
```

Validation checks furniture catalog membership, floor containment, collisions, access to ten room/balcony targets in both arrangements, and all eight door sweeps. Diagonal walls use one continuous visual mesh with short collision boxes so the wall's bounding box does not fill the hall. `scripts/check-city-integration.mjs` checks the new editor and existing unavailable-home guards.
