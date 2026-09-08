# Photo comparison and correction

Previous render looked grey and matte against a grey floor; viewpoint too high. Reference has a satin white finish, 50mm top and square legs, thin shelf at approximately 170mm above floor. Revised satin roughness, neutral white paint (sRGB converted to linear), reference-like low camera and white background. Shelf exact height and construction joints estimated from photo.

Official reference: https://www.ikea.com/us/en/images/products/lack-coffee-table-white__0750652_pe746803_s5.jpg

Published overall dimensions preserved; this remains an unofficial visual reconstruction, not IKEA CAD.

Validation: packed texture images verified inside the GLB JSON. A separate roundtrip.png is rendered after importing the GLB, using the same studio scene. Previous assets are in backup-before-fidelity.

Browser fidelity pass: baked ambient occlusion to a second UV atlas, embedded in GLB, preserving contact depth at joints and seams in real-time lighting. Native PBR color maps remain unchanged.
