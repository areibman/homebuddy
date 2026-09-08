import bpy,os,math
OUT=os.path.dirname(os.path.abspath(__file__));bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'armchair.blend'))
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 if o.name.startswith('Long pill-edged armrest'):
  zs=[v.co.z for v in o.data.vertices];ys=[v.co.y for v in o.data.vertices];zc=(max(zs)+min(zs))/2;yc=(max(ys)+min(ys))/2
  for v in o.data.vertices:v.co.z=.599+(v.co.z-zc)-(v.co.y-yc)*(.04/.55)
 if o.name.startswith('Flat rectangular rear leg'):
  for v in o.data.vertices:v.co.z-=.03*max(0,min(1,(v.co.z-.006)/.60))
for name in ['beech-basecolor.png','kilanda-basecolor.png']:
 im=bpy.data.images.load(os.path.join(OUT,name));im.pack()
 for m in bpy.data.materials:
  if m.use_nodes:
   for n in m.node_tree.nodes:
    if n.type=='TEX_IMAGE' and n.image and n.image.name.startswith(name):n.image=im
# Material calibration is independent of a bright photographic light rig.
s=bpy.context.scene;s.view_settings.view_transform='Standard';s.view_settings.look='None';s.view_settings.exposure=0
for o in s.objects:
 if o.type=='LIGHT':o.data.energy*=.35
s.world.node_tree.nodes.get('Background').inputs[1].default_value=.65
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'armchair.blend'))
print('FINAL ARM SLOPE AND PORTABLE PALETTE',flush=True)
