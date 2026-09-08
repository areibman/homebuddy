import bpy,json,os
from mathutils import Vector
p='/Users/hyperbox/homebuddy/ikea-catalog-assets/rug/'
bpy.ops.wm.open_mainfile(filepath=p+'rug.blend');sc=bpy.context.scene
bpy.ops.object.select_all(action='DESELECT')
for o in sc.objects:
 if o.type!='MESH':continue
 o.select_set(True)
 for layer in list(o.data.uv_layers):
  if layer.name!='Material UV':o.data.uv_layers.remove(layer)
 o.data.uv_layers.active_index=0;o.data.uv_layers[0].active_render=True
bpy.ops.export_scene.gltf(filepath=p+'rug.glb',export_format='GLB',use_selection=True)
sc.render.filepath=p+'rug.png';bpy.ops.wm.save_as_mainfile(filepath=p+'rug.blend');bpy.ops.render.render(write_still=True)
for o in list(sc.objects):
 if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=p+'rug.glb');sc.render.filepath=p+'roundtrip.png';bpy.ops.render.render(write_still=True)
objs=[o for o in sc.objects if o.type=='MESH'];pts=[o.matrix_world@Vector(v) for o in objs for v in o.bound_box];dims=[max(v[i] for v in pts)-min(v[i] for v in pts) for i in range(3)];assert all(abs(a-b)<.0003 for a,b in zip(dims,[1.6,2.3,.013]));j=json.load(open(p+'validation.json'));j.update(measured_dimensions_m=dims,glb_bytes=os.path.getsize(p+'rug.glb'),uv_check='Only intended material UV layer exported; primitive default UV removed');json.dump(j,open(p+'validation.json','w'),indent=2)
