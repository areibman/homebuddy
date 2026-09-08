exec(open('/Users/hyperbox/homebuddy/ikea-catalog-assets/bed/refine.py').read().split("for slug in ['bed','dresser','nightstand']:")[0])
out=BASE+'/dresser';meta=json.load(open(out+'/item.json'));H=meta['dimensions_m']['height'];bpy.ops.wm.open_mainfile(filepath=out+'/dresser.blend')
for o in bpy.context.scene.objects:
 if o.name.startswith('VIHALS full side panel'):o.dimensions.z=H-.047;o.location.z=(H+.011)/2
bpy.ops.object.select_all(action='DESELECT')
models=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in models:o.select_set(True)
bpy.context.view_layer.objects.active=models[0];bpy.ops.export_scene.gltf(filepath=out+'/dresser.glb',export_format='GLB',use_selection=True);bpy.ops.wm.save_as_mainfile(filepath=out+'/dresser.blend');bpy.ops.render.render(write_still=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=out+'/dresser.glb');s=studio('dresser',H);s.render.filepath=out+'/roundtrip.png';bpy.ops.render.render(write_still=True)
