import bpy,os
ROOT=os.path.dirname(os.path.abspath(__file__))
for slug in ['sofa','floor-lamp']:
 out=os.path.join(ROOT,slug);bpy.ops.wm.open_mainfile(filepath=os.path.join(out,slug+'.blend'));scene=bpy.context.scene;scene.cycles.samples=4;scene.render.threads_mode='FIXED';scene.render.threads=2;scene.render.filepath=os.path.join(out,slug+'.png');bpy.ops.render.render(write_still=True)
 col=bpy.data.collections['Furniture | editable components']
 for o in list(col.objects):bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.import_scene.gltf(filepath=os.path.join(out,slug+'.glb'));scene.render.filepath=os.path.join(out,'roundtrip.png');bpy.ops.render.render(write_still=True)
 print('VERIFIED',slug,flush=True)
