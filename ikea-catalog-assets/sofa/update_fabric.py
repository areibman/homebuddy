import bpy,os,json,struct
OUT=os.path.dirname(os.path.abspath(__file__));bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'sofa.blend'))
im=bpy.data.images.load(os.path.join(OUT,'fabric-color.png'));im.pack()
for m in bpy.data.materials:
 if m.use_nodes:
  for n in m.node_tree.nodes:
   if n.type=='TEX_IMAGE' and n.image and n.image.name.startswith('fabric-color'):n.image=im
bpy.ops.object.select_all(action='DESELECT');objs=list(bpy.data.collections['Furniture | editable components'].objects)
for o in objs:o.select_set(True)
bpy.context.view_layer.objects.active=objs[0];path=os.path.join(OUT,'sofa.glb');bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'sofa.blend'))
d=open(path,'rb').read();n=struct.unpack_from('<I',d,12)[0];g=json.loads(d[20:20+n])
for m in g['materials']:m['occlusionTexture']['strength']=.78
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);tail=d[20+n:];open(path,'wb').write(struct.pack('<4sII',b'glTF',2,20+len(j)+len(tail))+struct.pack('<II',len(j),0x4e4f534a)+j+tail)
s=bpy.context.scene;s.cycles.samples=4;s.render.threads_mode='FIXED';s.render.threads=2;s.render.filepath=os.path.join(OUT,'sofa.png');bpy.ops.render.render(write_still=True)
for o in objs:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=path);s.render.filepath=os.path.join(OUT,'roundtrip.png');bpy.ops.render.render(write_still=True)
