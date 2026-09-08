import bpy,os,json,struct,sys
ROOT=os.path.dirname(os.path.abspath(__file__))
for slug in (sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['sofa','dresser','coffee-table','bed','nightstand','armchair','bookshelf','dining-table','floor-lamp']):
 out=os.path.join(ROOT,slug);bpy.ops.wm.open_mainfile(filepath=os.path.join(out,slug+'.blend'))
 filtered=bpy.data.images.load(os.path.join(out,'ambient-occlusion-filtered.png'));filtered.colorspace_settings.name='Non-Color';filtered.pack()
 for m in bpy.data.materials:
  if m.use_nodes:
   for n in m.node_tree.nodes:
    if n.type=='TEX_IMAGE' and n.image and 'baked short-range occlusion' in n.image.name:n.image=filtered
 bpy.ops.object.select_all(action='DESELECT');models=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name!='Studio floor' and max(o.dimensions)<20 and not o.is_shadow_catcher]
 for o in models:o.select_set(True)
 bpy.context.view_layer.objects.active=models[0];bpy.ops.export_scene.gltf(filepath=os.path.join(out,slug+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,slug+'.blend'))
 # glTF's strength controls how much indirect light is occluded.
 p=os.path.join(out,slug+'.glb');data=open(p,'rb').read();n=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+n]);
 for m in g['materials']:m['occlusionTexture']['strength']=.78
 j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);tail=data[20+n:];new=struct.pack('<4sII',b'glTF',2,20+len(j)+len(tail))+struct.pack('<II',len(j),0x4e4f534a)+j+tail;open(p,'wb').write(new);print('FILTERED',slug,flush=True)
