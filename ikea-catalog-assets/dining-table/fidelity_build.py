import bpy,math,os,json
from mathutils import Vector
ROOT='/Users/hyperbox/homebuddy/ikea-catalog-assets'
def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def mat(n,c,rough=.5):
 m=bpy.data.materials.new(n);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*[lin(v) for v in c],1);p.inputs['Roughness'].default_value=rough;m.diffuse_color=(*[lin(v) for v in c],1);return m
def texmat(n,path,rough,normal=None):
 m=mat(n,(1,1,1),rough);p=m.node_tree.nodes.get('Principled BSDF');t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(path);t.image.pack();m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 if normal:
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(normal);t.image.colorspace_settings.name='Non-Color';t.image.pack();nn=m.node_tree.nodes.new('ShaderNodeNormalMap');nn.inputs['Strength'].default_value=.3;m.node_tree.links.new(t.outputs['Color'],nn.inputs['Color']);m.node_tree.links.new(nn.outputs['Normal'],p.inputs['Normal'])
 return m
def uv(o,mode='top',crop=False):
 
 for layer in list(o.data.uv_layers):o.data.uv_layers.remove(layer)
 lay=o.data.uv_layers.new(name='Material UV');lay.active_render=True
 for f in o.data.polygons:
  for li in f.loop_indices:
   v=o.data.vertices[o.data.loops[li].vertex_index].co
   if mode=='top':a=v.x/1.05+.5;b=v.y/1.05+.5
   elif mode=='rug':a=v.x/1.6+.5;b=v.y/2.3+.5;a=.184+a*.63;b=.028+b*.945
   else:a=v.x*3+.5;b=v.z/ .74
   lay.data[li].uv=(a,b)
def box(n,p,s,m,r):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if r:
  b=o.modifiers.new('Eased edges','BEVEL');b.width=r;b.segments=4
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def stage(slug,cam,aimpt,scale):
 sc=bpy.context.scene;sc.unit_settings.system='METRIC';sc.render.engine='CYCLES';sc.cycles.samples=48;sc.cycles.use_denoising=True;sc.render.resolution_x=1200;sc.render.resolution_y=900;sc.render.resolution_percentage=100;sc.view_settings.view_transform='Standard';sc.view_settings.look='None';sc.view_settings.exposure=0;sc.world=bpy.data.worlds.new('White photographic studio');sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);sc.world.node_tree.nodes['Background'].inputs[1].default_value=.6
 # Camera-transparent white world, no dark studio backdrop.
 sc.render.film_transparent=False;nt=sc.world.node_tree;lp=nt.nodes.new('ShaderNodeLightPath');mix=nt.nodes.new('ShaderNodeMath');mix.operation='MULTIPLY_ADD';mix.inputs[1].default_value=.4;mix.inputs[2].default_value=.6;nt.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]);nt.links.new(mix.outputs[0],nt.nodes['Background'].inputs[1])
 for p,en,size in [((-3,-4,5),280,5),((4,-1,3),110,4),((0,4,4),180,4)]:
  bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.data.energy=en;o.data.size=size;aim(o,(0,0,.3))
 bpy.ops.object.camera_add(location=cam);o=bpy.context.object;aim(o,aimpt);o.data.type='ORTHO';o.data.ortho_scale=scale;sc.camera=o
 sc.render.filepath=ROOT+'/'+slug+'/'+slug+'.png'
 return sc

def finish(slug,cam,pt,scale):
 sc=bpy.context.scene;bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=list(sc.objects)[0];bpy.ops.object.convert(target='MESH');bpy.ops.export_scene.gltf(filepath=ROOT+'/'+slug+'/'+slug+'.glb',export_format='GLB',use_selection=True,export_image_format='AUTO')
 sc=stage(slug,cam,pt,scale);bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/'+slug+'/'+slug+'.blend');bpy.ops.render.render(write_still=True)
 # Render imported GLB with precisely same camera/light setup. Keep authored Blender scene intact.
 for o in list(sc.objects):
  if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.import_scene.gltf(filepath=ROOT+'/'+slug+'/'+slug+'.glb');sc.render.filepath=ROOT+'/'+slug+'/roundtrip.png';bpy.ops.render.render(write_still=True)
 objs=[o for o in sc.objects if o.type=='MESH'];pts=[o.matrix_world@Vector(v) for o in objs for v in o.bound_box];dims=[max(v[i] for v in pts)-min(v[i] for v in pts) for i in range(3)];nom=list(json.load(open(ROOT+'/'+slug+'/item.json'))['dimensions_m'].values());assert all(abs(a-b)<.0003 for a,b in zip(dims,nom)),(dims,nom)
 json.dump(dict(valid=True,measured_dimensions_m=dims,nominal_dimensions_m=nom,mesh_count=len(objs),glb_bytes=os.path.getsize(ROOT+'/'+slug+'/'+slug+'.glb'),roundtrip_render='roundtrip.png',textures_embedded=True),open(ROOT+'/'+slug+'/validation.json','w'),indent=2)
 print('FINISHED',slug,flush=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
wood=texmat('Pale ash veneer - embedded longitudinal grain',ROOT+'/dining-table/textures/ash-color.jpg',.42)
verts=[];faces=[];rings=[(.508,.706),(.514,.712),(.525,.732),(.525,.74)]
for r,z in rings:
 for i in range(192):a=2*math.pi*i/192;verts.append((r*math.cos(a),r*math.sin(a),z))
for j in range(3):
 for i in range(192):a=j*192+i;b=j*192+(i+1)%192;faces.append((a,b,b+192,a+192))
faces+=[tuple(range(191,-1,-1)),tuple(range(576,768))];me=bpy.data.meshes.new('Chamfered ash top');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('LISABO 105cm round chamfered top',me);bpy.context.collection.objects.link(o);o.data.materials.append(wood);uv(o);o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
for sx in [-1,1]:
 for sy in [-1,1]:
  verts=[]
  for cx,cy,z,rx,ry in [(sx*.347,sy*.347,0,.0185,.0145),(sx*.296,sy*.296,.719,.031,.026)]:
   for dx,dy in [(-1,-1),(1,-1),(1,1),(-1,1)]:verts.append((cx+dx*rx,cy+dy*ry,z))
  me=bpy.data.meshes.new('Birch leg');me.from_pydata(verts,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);me.update();o=bpy.data.objects.new('Rounded tapered birch leg',me);bpy.context.collection.objects.link(o);o.data.materials.append(wood);uv(o,'leg');b=o.modifiers.new('Rounded birch corners','BEVEL');b.width=.009;b.segments=6;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
  # Small inset mounting pad under chamfer is visible on close inspection.
  o=box('Inset leg mounting pad',(sx*.286,sy*.286,.704),(.073,.068,.016),wood,.006);uv(o,'leg')
finish('dining-table',(3,-7,2.05),(0,0,.36),1.72)

bpy.ops.wm.read_factory_settings(use_empty=True)
white=mat('Satin white acrylic paint',(0.945,0.944,0.93),.32)
box('LACK 50mm tabletop',(0,0,.425),(.9,.55,.05),white,.00065)
for x in [-.425,.425]:
 for y in [-.25,.25]:box('Square white leg',(x,y,.2),(.05,.05,.4),white,.0007)
box('Thin magazine shelf',(0,0,.171),(.8,.50,.012),white,.0004)
finish('coffee-table',(2,-5,1.95),(0,0,.225),1.34)

bpy.ops.wm.read_factory_settings(use_empty=True)
jute=texmat('Natural jute - reference-derived color and fine weave normal',ROOT+'/rug/textures/jute-reference.jpg',.92,ROOT+'/rug/textures/jute-normal.png')
o=box('LOHALS thin woven rug',(0,0,.0065),(1.6,2.3,.013),jute,.002);uv(o,'rug')
finish('rug',(0,0,5),(0,0,0),3.22)
