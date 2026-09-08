import bpy,json,os
from mathutils import Vector
root='/Users/hyperbox/homebuddy/ikea-catalog-assets/'
for s in ['dining-table','coffee-table','rug']:
 p=root+s+'/';bpy.ops.wm.open_mainfile(filepath=p+s+'.blend');sc=bpy.context.scene
 for o in sc.objects:
  if o.type=='LIGHT':o.data.energy*=.5
 ma=sc.world.node_tree.nodes.get('Math');ma.inputs[1].default_value=.55;ma.inputs[2].default_value=.45
 sc.cycles.samples=32;sc.render.filepath=p+s+'.png';bpy.ops.wm.save_as_mainfile(filepath=p+s+'.blend');bpy.ops.render.render(write_still=True)
 for o in list(sc.objects):
  if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.import_scene.gltf(filepath=p+s+'.glb');sc.render.filepath=p+'roundtrip.png';bpy.ops.render.render(write_still=True)
 print('RELIT',s,flush=True)
