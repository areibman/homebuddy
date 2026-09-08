# 333 Bush Street #4101

Two proposed arrangements for database listing `15`: Skyline Social and Evening Retreat, each with 24 movable furniture instances drawn from the IKEA catalog and original Homebuddy TV collection. Both are available on the city map and at `/decorate?home=15&layout=0` and `layout=1`.

## References and reconstruction

- Original source: https://333bush4101.com/
- Archived floor plan: `public/city-plans/333-bush-street-unit-4101-1.jpg` (Compass / Open Homes).
- Listing states 1,250 sq ft, two bedrooms and two bathrooms. Model geometry is an approximate trace, calibrated at 78 px/m using the labeled bedroom dimensions. It is not a survey or verified gross-area model.
- White wall and ceiling paint, oak floors, gray kitchen millwork, stainless appliances, quartz counters, glass-tile backsplash and marble bathroom tile are based on the listing photographs. Exact photo URLs and texture crop rectangles are retained in `listing.json`.
- Ceiling height (2.7 m), lighting positions, cabinet internals, appliance models and hidden construction are approximations. Appliances are recognizable reconstructions, not manufacturer CAD. Furniture arrangements are proposed staging rather than replicas of the listing's furniture.
- Source photographs show shower enclosures in the renovated baths; the model uses showers, even where an older plan symbol resembles a bathtub.
- Map location: OpenStreetMap Nominatim lookup for 333 Bush Street: 37.7905749, -122.4030716.

## Included

Two bedrooms, two bathrooms, foyer, kitchen, living/dining area, laundry, closets, structural piers, six tall glazed openings, eleven hinged doors, full ceiling, recessed lights, baseboards and ceiling trim. Appliances include ceramic cooktop/oven, island hood, dishwasher, sink, bottom-freezer refrigerator, stacked washer/dryer and countertop microwave.

`Skyline Social` pairs the STOCKHOLM sofa with the Cinema 65-inch walnut media console. `Evening Retreat` uses the golden-brown FINNALA sofa and Gallery 55-inch easel TV. Both include a dining group, a primary-suite reading chair and a furnished second bedroom. Layout IDs remain `gather` and `retreat`.

## Reproduction

From the repository root, run `python3 furniture-catalog/scripts/trace-bush.py`. From `furniture-catalog/`, run `node scripts/export-bush.mjs`, then Blender in background mode with `--python scripts/build-restyled-homes.py`. Retracing preserves the separately curated design and furniture arrangements. The Blender scenes embed their images and retain separate full-height architecture, cutaway architecture and ceiling collections; enable the full-height and ceiling collections for interior views.

Validation: `scripts/check-bush.mjs` checks both furnished layouts for collisions, floor containment and walking access to nine room targets. `scripts/check-bush-doors.mjs` checks all door sweeps against fixtures and furniture in both layouts. Existing Spera, architecture, fixture, movement, ceiling, camera transition and route checks also pass.

Closet correction: the four closets now retain enclosed walls, caps and closed fronts in isometric view, with hanging rails inside. Bedroom double doors occupy the opening at the closet-front line and use one shared frame without a center post, with white frames and frosted-glass upper panels matching the listing photo. Paired leaves operate together. Regression coverage: `scripts/check-bush-closets.mjs`.
