import bpy
from mathutils import Vector
p='/Users/hyperbox/homebuddy/furniture-catalog-assets/bookshelf/'
bpy.ops.wm.open_mainfile(filepath=p+'bookshelf.blend')
for o in bpy.context.scene.objects:
 if o.name.startswith('Solid oak shelf'):o.scale.x=1.088/1.16
 if o.name.startswith('Shelf front edge'):o.scale.x=1.08/1.145
cam=bpy.context.scene.camera;cam.rotation_euler=(Vector((0,0,1.0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=3.15
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.name!='Studio floor':o.select_set(True)
bpy.ops.export_scene.gltf(filepath=p+'bookshelf.glb',export_format='GLB',use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=p+'bookshelf.blend');bpy.ops.render.render(write_still=True)
