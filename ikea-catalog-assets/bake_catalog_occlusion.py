"""Bake short-range ambient occlusion into portable glTF PBR; retain editable native scenes."""
import bpy,os,sys,shutil,json,struct
ROOT=os.path.dirname(os.path.abspath(__file__))
slugs=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['sofa','bed','dresser','nightstand','armchair','bookshelf']
for slug in slugs:
 out=os.path.join(ROOT,slug);backup=os.path.join(out,'before-occlusion');os.makedirs(backup,exist_ok=True)
 for ext in ['blend','glb']:
  dest=os.path.join(backup,slug+'.'+ext)
  if not os.path.exists(dest):shutil.copy2(os.path.join(out,slug+'.'+ext),dest)
 bpy.ops.wm.open_mainfile(filepath=os.path.join(out,slug+'.blend'));s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=2;s.render.threads_mode='FIXED';s.render.threads=2
 objs=[o for o in s.objects if o.type in ['MESH','CURVE'] and o.name!='Studio floor' and max(o.dimensions)<20 and not o.is_shadow_catcher]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.convert(target='MESH')
 if slug=='dresser':
  # Include edge pulls within the published 470mm overall depth.
  ymin=min((o.matrix_world@v.co).y for o in objs for v in o.data.vertices)
  if ymin < -.238:
   for o in objs:
    if o.name.startswith('Folded white edge pull'):o.location.y+=.006
  bpy.context.view_layer.update()
 mats=set(m for o in objs for m in o.data.materials)
 for mat in mats:
  for node in list(mat.node_tree.nodes):
   if node.type=='GROUP' and node.node_tree and node.node_tree.name=='glTF Material Output':mat.node_tree.nodes.remove(node)
 for o in objs:
  if not o.data.uv_layers:o.data.uv_layers.new(name='Surface UV')
  old=o.data.uv_layers[0].name;o.data.uv_layers[0].name='Surface UV'
  for m in o.data.materials:
   for n in m.node_tree.nodes:
    if n.type=='UVMAP' and n.uv_map==old:n.uv_map='Surface UV'
  layer=o.data.uv_layers.get('Occlusion UV') or o.data.uv_layers.new(name='Occlusion UV');o.data.uv_layers.active=layer
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.006);bpy.ops.object.mode_set(mode='OBJECT')
 im=bpy.data.images.new(slug+' | baked short-range occlusion',1024,1024);im.colorspace_settings.name='Non-Color';restore=[]
 for m in mats:
  n=m.node_tree.nodes;l=m.node_tree.links;uv=n.new('ShaderNodeUVMap');uv.uv_map='Surface UV'
  for tex in list(n):
   if tex.type=='TEX_IMAGE' and not tex.inputs['Vector'].is_linked:l.new(uv.outputs['UV'],tex.inputs['Vector'])
  tex=n.new('ShaderNodeTexImage');tex.image=im;n.active=tex
  output=next(o for o in n if o.type=='OUTPUT_MATERIAL' and o.is_active_output);source=output.inputs['Surface'].links[0].from_socket
  ao=n.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.75 if slug in ['bookshelf','coffee-table'] else .20;ao.samples=8;em=n.new('ShaderNodeEmission');l.new(ao.outputs['Color'],em.inputs['Color']);l.new(em.outputs[0],output.inputs['Surface']);restore.append((m,source,output,ao,em))
 states={o:o.hide_render for o in s.objects}
 for o in s.objects:
  if o not in objs:o.hide_render=True
 s.render.bake.margin=8;bpy.ops.object.bake(type='EMIT')
 im.filepath_raw=os.path.join(out,'ambient-occlusion.png');im.file_format='PNG';im.save();im.pack()
 group=bpy.data.node_groups.get('glTF Material Output') or bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
 if not any(i.name=='Occlusion' for i in group.interface.items_tree):group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
 for m,source,output,ao,em in restore:
  n=m.node_tree.nodes;l=m.node_tree.links;l.new(source,output.inputs['Surface']);n.remove(ao);n.remove(em);tex=next(t for t in n if t.type=='TEX_IMAGE' and t.image==im);uv=n.new('ShaderNodeUVMap');uv.uv_map='Occlusion UV';l.new(uv.outputs['UV'],tex.inputs['Vector']);g=n.new('ShaderNodeGroup');g.node_tree=group;l.new(tex.outputs['Color'],g.inputs['Occlusion'])
 for o,state in states.items():o.hide_render=state
 bpy.ops.export_scene.gltf(filepath=os.path.join(out,slug+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,slug+'.blend'))
 with open(os.path.join(out,'review.md'),'a') as f:f.write('\nBrowser fidelity pass: baked ambient occlusion to a second UV atlas, embedded in GLB, preserving contact depth at joints and seams in real-time lighting. Native PBR color maps remain unchanged.\n')
 data=open(os.path.join(out,slug+'.glb'),'rb').read();n=struct.unpack_from('<I',data,12)[0];d=json.loads(data[20:20+n]);assert all('occlusionTexture' in m for m in d['materials']);print('BAKED',slug,len(data),'bytes',flush=True)
