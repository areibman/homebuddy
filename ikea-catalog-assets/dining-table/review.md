# Photo comparison and correction

Previous render had no visible ash grain, a uniformly beige top, overly angular legs and an elevated viewpoint. Reference shows pale ash with darker longitudinal grain, rounded tapered birch legs, a thin top lip and a broad underside chamfer. Revised UV textures, leg rounding/splay, chamfer profile and low product camera. Internal mounting geometry and wood grain specimen remain estimated.

Official reference: https://www.ikea.com/us/en/images/products/lisabo-table-ash-veneer__0631745_pe695175_s5.jpg

Published overall dimensions preserved; this remains an unofficial visual reconstruction, not IKEA CAD.

Final refinement: the tabletop now uses a reference-derived planar UV projection of the actual ash top photograph, retaining its broad light/dark grain. Birch legs use an authored longitudinal grain texture. The photographic top includes baked illumination and is therefore an appearance approximation rather than measured albedo.

Validation: packed texture images verified inside the GLB JSON. A separate roundtrip.png is rendered after importing the GLB, using the same studio scene. Previous assets are in backup-before-fidelity.

Browser fidelity pass: baked ambient occlusion to a second UV atlas, embedded in GLB, preserving contact depth at joints and seams in real-time lighting. Native PBR color maps remain unchanged.
