import bpy,os
p='/Users/hyperbox/homebuddy/ikea-catalog-assets/dining-table/'
bpy.ops.wm.open_mainfile(filepath=p+'dining-table.blend');sc=bpy.context.scene
m=bpy.data.materials.new('Reference-derived pale ash top grain');m.use_nodes=True;n=m.node_tree.nodes;pr=n.get('Principled BSDF');pr.inputs['Roughness'].default_value=.42;t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(p+'textures/ash-reference.jpg');t.image.pack();m.node_tree.links.new(t.outputs['Color'],pr.inputs['Base Color'])
for o in sc.objects:
 if not o.name.startswith('LISABO 105'):continue
 idx=len(o.data.materials);o.data.materials.append(m)
 uv=o.data.uv_layers.active
 for f in o.data.polygons:
  if f.normal.z>.9:
   f.material_index=idx
   for li in f.loop_indices:
    v=o.data.vertices[o.data.loops[li].vertex_index].co
    uv.data[li].uv=(.5+.908*(.925*v.x+.38*v.y),.853-.141*(.38*v.x-.925*v.y))
bpy.ops.object.select_all(action='DESELECT')
for o in sc.objects:
 if o.type=='MESH':o.select_set(True)
bpy.ops.export_scene.gltf(filepath=p+'dining-table.glb',export_format='GLB',use_selection=True)
sc.render.filepath=p+'dining-table.png';sc.cycles.samples=24;bpy.ops.wm.save_as_mainfile(filepath=p+'dining-table.blend');bpy.ops.render.render(write_still=True)
for o in list(sc.objects):
 if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=p+'dining-table.glb');sc.render.filepath=p+'roundtrip.png';bpy.ops.render.render(write_still=True)
