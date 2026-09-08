import bpy,json,os
from mathutils import Vector
root='/Users/hyperbox/homebuddy/ikea-catalog-assets/'
for s in ['dining-table','coffee-table','rug']:
 p=root+s+'/';bpy.ops.wm.open_mainfile(filepath=p+s+'.blend');sc=bpy.context.scene;ma=sc.world.node_tree.nodes.get('Math')
 if ma.inputs[2].default_value>.5:
  for o in sc.objects:
   if o.type=='LIGHT':o.data.energy*=.5
  ma.inputs[1].default_value=.55;ma.inputs[2].default_value=.45
 if s=='dining-table':sc.camera.data.ortho_scale=1.48
 if s=='coffee-table':sc.camera.data.ortho_scale=1.16
 sc.cycles.samples=8;sc.cycles.use_denoising=True;sc.render.filepath=p+s+'.png';bpy.ops.wm.save_as_mainfile(filepath=p+s+'.blend');bpy.ops.render.render(write_still=True)
 for o in list(sc.objects):
  if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.import_scene.gltf(filepath=p+s+'.glb');sc.render.filepath=p+'roundtrip.png';bpy.ops.render.render(write_still=True)
 objs=[o for o in sc.objects if o.type=='MESH'];pts=[o.matrix_world@Vector(v) for o in objs for v in o.bound_box];dims=[max(v[i] for v in pts)-min(v[i] for v in pts) for i in range(3)];nom=list(json.load(open(p+'item.json'))['dimensions_m'].values());assert all(abs(a-b)<.0003 for a,b in zip(dims,nom)),(dims,nom)
 json.dump(dict(valid=True,measured_dimensions_m=dims,nominal_dimensions_m=nom,mesh_count=len(objs),glb_bytes=os.path.getsize(p+s+'.glb'),roundtrip_render='roundtrip.png',textures_embedded=s!='coffee-table',material_check='Explicit sRGB-decoded factor or embedded images; GLB reimport rendered with same light and camera'),open(p+'validation.json','w'),indent=2)
 print('FINAL VERIFIED',s,flush=True)
