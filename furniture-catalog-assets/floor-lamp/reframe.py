import bpy
p='/Users/hyperbox/homebuddy/furniture-catalog-assets/floor-lamp/'
bpy.ops.wm.open_mainfile(filepath=p+'floor-lamp.blend');bpy.context.scene.camera.data.ortho_scale=2.75;bpy.ops.wm.save_as_mainfile(filepath=p+'floor-lamp.blend');bpy.ops.render.render(write_still=True)
