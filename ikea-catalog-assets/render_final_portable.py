import bpy,os
ROOT=os.path.dirname(os.path.abspath(__file__))
for slug in ['sofa','armchair']:
 out=os.path.join(ROOT,slug);bpy.ops.wm.open_mainfile(filepath=os.path.join(out,slug+'.blend'));s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=2;s.cycles.max_bounces=3;s.render.threads_mode='FIXED';s.render.threads=2;s.render.resolution_x=800;s.render.resolution_y=600;s.render.resolution_percentage=100;s.render.filepath=os.path.join(out,slug+'.png');bpy.ops.render.render(write_still=True)
 objs=[o for o in s.objects if o.type=='MESH' and o.name!='Studio floor' and max(o.dimensions)<20 and not o.is_shadow_catcher]
 for o in objs:bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.import_scene.gltf(filepath=os.path.join(out,slug+'.glb'));s.render.filepath=os.path.join(out,'roundtrip.png');bpy.ops.render.render(write_still=True);print('FINAL',slug,flush=True)
