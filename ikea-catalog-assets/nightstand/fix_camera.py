exec(open('/Users/hyperbox/homebuddy/ikea-catalog-assets/bed/refine.py').read().split("for slug in ['bed','dresser','nightstand']:")[0])
out=BASE+'/nightstand';bpy.ops.wm.open_mainfile(filepath=out+'/nightstand.blend');bpy.context.scene.camera.data.ortho_scale=1.19;bpy.ops.wm.save_as_mainfile(filepath=out+'/nightstand.blend');bpy.ops.render.render(write_still=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=out+'/nightstand.glb');s=studio('nightstand',.6985);s.render.filepath=out+'/roundtrip.png';bpy.ops.render.render(write_still=True)
