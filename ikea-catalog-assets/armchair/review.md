# EKENÄSET fidelity review

Exact source photograph (IKEA article 305.334.93, Kilanda light beige) inspected at 1400×1400 on 2026-09-08. Published envelope remains 64×78×76 cm.

## Observed mismatches in previous reconstruction

- Legs in IKEA photo have long flat rectangular faces and lightly eased corners. Previous 18 mm bevel nearly converted 37 mm legs into round rods.
- Front leg meets underside of the arm squarely. Previous smoothing hid the planar side-frame joints.
- Front and side seat rails are substantial rectangular members. Previous highlights and over-rounding made them look cylindrical.
- IKEA cushion has a largely vertical front apron, relatively square lower corners, softly domed top and a long high rectangular back. Previous cushion had excessive all-around rounding and showed a gap above its supporting rail.
- IKEA fabric has visible beige/taupe woven yarn variation. Previous procedural shader was too faint in Blender and entirely absent from exported GLB.
- Original photo uses a low, frontal three-quarter angle; previous camera exposed too much seat and arm top.
- Original dark-brown stained beech is visibly darker than the old studio rendering.

## Correction scope

Rebuild rectangular frame with 2.5 mm edge easing, capsule-like arm tops, restrained cushion shaping and seams. Embed real PNG base-color and tangent normal texture images in GLB, using linearized sRGB base colors. Match a lower camera and neutral white studio. Import the exported GLB into a new scene and render it to check texture and color survival.

## Remaining uncertainty

Exact joinery, cushion sewing pattern and curvature are inferred from a product photograph; the asset is a simplified recreation, not manufacturing CAD. Published outer dimensions are retained.

Published seat depth (~50 cm), seat height (~45 cm) and arm height (~63 cm) were additionally used to constrain the rebuilding, rather than relying solely on a global outer-dimension scale.

## Color evidence

A central, lit back-fabric crop in the source has median display sRGB approximately (0.827, 0.784, 0.749); a frontal leg crop is approximately (0.243, 0.161, 0.137). These are photographed radiances, not raw albedo, so they were used as appearance checks rather than copied directly into linear shader values. Woven texture pigmentation is authored as sRGB PNG around (0.710, 0.677, 0.626); beech around (0.230, 0.130, 0.095). Blender decodes those image textures to linear shading space, while constant colors are explicitly converted from sRGB to linear. All three image textures are embedded inside GLB buffer views.

A rotation-sign audit confirmed a major original geometry error: positive X rotation tilted the back top toward the front (-Y). Corrected to -15° so the top reclines toward +Y, matching the IKEA chair. This also closes the formerly displaced lower-back/seat intersection.

## Final appearance pass

The first corrected render still showed overly pale frame highlights and too much arm-top surface. Final texture pigmentation is (0.670, 0.628, 0.585) sRGB for fabric and (0.120, 0.065, 0.045) for dark-stained beech, with restrained wood specular level 0.15 and roughness 0.65. These supersede the initial texture values above. Reduced continuous row/column variation avoids a plaid-looking fabric. A close 39 mm perspective camera near arm height replaces the orthographic camera; this matches the reference's perspective changes between floor, seat and arm level. Final native and imported-GLB renders are compared under identical lighting, with no color edits applied to output images.

## Final validation

Both final previews are 1200×900, 4 samples with denoising; the low sample count is sufficient for export/material comparison but softens tiny weave detail. Native versus freshly imported GLB comparison: mean absolute display-RGB difference 0.64/255; 95th percentile 3/255. Both inspected visually. Final world uses a camera-ray white background (no compositor). GLB has 16 meshes, three embedded images, standard specular/sheen extensions, and an actual transformed-vertex envelope of 0.6400×0.7800×0.7600 m. Exact upholstery curvature and joints remain photo-inferred approximations.

Browser fidelity pass: baked ambient occlusion to a second UV atlas, embedded in GLB, preserving contact depth at joints and seams in real-time lighting. Native PBR color maps remain unchanged.

Browser fidelity pass: baked ambient occlusion to a second UV atlas, embedded in GLB, preserving contact depth at joints and seams in real-time lighting. Native PBR color maps remain unchanged.

Final browser calibration: textile/wood albedo corrected independently of the native studio lighting; occlusion texture filtered and set to 0.78 strength.
