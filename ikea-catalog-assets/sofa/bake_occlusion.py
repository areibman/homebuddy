import bpy,os
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'sofa.blend'))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.render.threads_mode='FIXED';scene.render.threads=2
col=bpy.data.collections['Furniture | editable components'];objs=list(col.objects)
bpy.ops.object.select_all(action='DESELECT')
for o in objs:
 o.select_set(True)
 if not o.data.uv_layers:o.data.uv_layers.new(name='Surface UV')
 o.data.uv_layers[0].name='Surface UV';o.data.uv_layers.new(name='Occlusion UV');o.data.uv_layers.active_index=1
bpy.context.view_layer.objects.active=objs[0]
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.008);bpy.ops.object.mode_set(mode='OBJECT')
ao=bpy.data.images.new('KIVIK baked seam and cushion occlusion',1024,1024);ao.colorspace_settings.name='Non-Color'
materials=set(m for o in objs for m in o.data.materials)
for m in materials:
 n=m.node_tree.nodes;l=m.node_tree.links
 uv=n.new('ShaderNodeUVMap');uv.uv_map='Surface UV'
 for tex in list(n):
  if tex.type=='TEX_IMAGE':l.new(uv.outputs['UV'],tex.inputs['Vector'])
 tex=n.new('ShaderNodeTexImage');tex.image=ao;n.active=tex;tex.select=True
scene.render.bake.margin=8
# Studio floor is not part of the asset and should not shade the lower mesh.
for o in scene.objects:
 if o not in objs:o.hide_render=True
bpy.ops.object.bake(type='AO')
ao.filepath_raw=os.path.join(OUT,'fabric-occlusion.png');ao.file_format='PNG';ao.save();ao.pack()
group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
for m in materials:
 n=m.node_tree.nodes;l=m.node_tree.links;tex=next(t for t in n if t.type=='TEX_IMAGE' and t.image==ao);uv=n.new('ShaderNodeUVMap');uv.uv_map='Occlusion UV';l.new(uv.outputs['UV'],tex.inputs['Vector']);g=n.new('ShaderNodeGroup');g.node_tree=group;l.new(tex.outputs['Color'],g.inputs['Occlusion'])
for o in scene.objects:o.hide_render=False
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'sofa.glb'),export_format='GLB',use_selection=True,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'sofa.blend'))
print('AO EMBEDDED',flush=True)
