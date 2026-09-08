# Visual fidelity review

Compared exact linked MALM packshot with previous model render. Prior render had a gray background, dull gray paint, excessive elevation, a very uniform rounded-box mattress, and side rails that read too thin. Rebuilt head/foot panels with 44/32 mm estimated thickness, 64 mm side rails, fitted-sheet mattress with a gently crowned top and subtle side gathers. Camera lowered to 14 degrees elevation and 23 degrees azimuth. Neutral sRGB white converted to linear shader values; photographic white background, no gray ground plane. Mattress remains illustrative because the frame SKU excludes mattress. Frame's published outer dimensions unchanged. Remaining uncertainty: panel thickness, mattress thickness, tiny sheet folds and original lens parameters inferred from packshot rather than manufacturing CAD.

Previous delivered assets are preserved in before-fidelity/. Exact original photo URL remains in item.json source.photo_url. Source photos were used only for reference, not mapped onto geometry.

Validation: delivered GLB is imported into a fresh Blender scene and rendered with identical lighting/camera as roundtrip.png to check geometry and portable material appearance.

Browser fidelity pass: baked ambient occlusion to a second UV atlas, embedded in GLB, preserving contact depth at joints and seams in real-time lighting. Native PBR color maps remain unchanged.
