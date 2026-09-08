import bpy, math, os, json
from mathutils import Vector
OUT=os.path.dirname(os.path.abspath(__file__))
refs=[{'name':'Harbor modular sofa','url':'Original design — generated for the furniture catalog'}]
configs=[('sofa',2.40,1.00,.79,.24,.055,2,(.055,.13,.21),'round')]

def mat(name,c,rough=.8):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough
 return m

def box(name,loc,size,r,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=o.modifiers.new('Soft edges','BEVEL');mod.width=r;mod.segments=5
 bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in o.data.polygons:f.use_smooth=True
 o.modifiers.new('Upholstery normals','WEIGHTED_NORMAL');o.data.materials.append(material);return o

def cylinder(name,loc,radius,depth,material,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=radius,depth=depth,location=loc,rotation=rot);o=bpy.context.object;o.name=name;o.data.materials.append(material)
 bevel=o.modifiers.new('Rounded edges','BEVEL');bevel.width=.015;bevel.segments=3
 for p in o.data.polygons:p.use_smooth=True
 return o

def line(name,pts,material,rad=.0015):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=rad;c.bevel_resolution=2;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for p,co in zip(s.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);c.materials.append(material);return o

def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()

for idx,(slug,w,d,h,arm,leg,count,color,style) in enumerate(configs):
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.unit_settings.system='METRIC'
 cloth=mat('Upholstery',color,.43 if style in ['leather','tuft'] else .86)
 p=cloth.node_tree.nodes.get('Principled BSDF');p.inputs['Sheen Weight'].default_value=.18
 noise=cloth.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=190
 bump=cloth.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.0009
 cloth.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);cloth.node_tree.links.new(bump.outputs[0],p.inputs['Normal'])
 thread=mat('Seam thread',tuple(c*.75 for c in color));wood=mat('Warm oak',(.24,.12,.05),.5);metal=mat('Charcoal metal',(.035,.04,.04),.36)
 inner=w-2*arm; seat=.45; base_top=.31
 box('Upholstered base',(0,0,(leg+base_top)/2),(inner,d,base_top-leg),.035,cloth)
 if style=='wood':
  box('Exposed timber front rail',(0,-d/2+.015,leg+.04),(w,.075,.105),.018,wood)
  box('Exposed timber rear rail',(0,d/2-.015,leg+.04),(w,.075,.105),.018,wood)
 backh=h-.05
 box('Back structure',(0,d/2-.085,(base_top+backh)/2),(inner,.17,backh-base_top),.045,cloth)
 for x in [-w/2+arm/2,w/2-arm/2]:
  armtop=.64 if style in ['tuft','compact','curved','slim'] else .60
  if style=='curved':armtop=.70
  box('Arm', (x,0,(leg+armtop)/2),(arm,d,armtop-leg),min(arm*.44,.095) if style in ['round','curved'] else .036,cloth)
  if style=='rolled':cylinder('Rolled arm',(x,-.005,.60),arm*.54,d-.035,cloth,(math.pi/2,0,0))
  if style=='wood':
   box('Timber side rail',(x,0,leg+.035),(arm,d,.10),.018,wood)
 if style=='skirt':
  box('Front slipcover skirt',(0,-d/2-.003,.155),(w-.04,.028,.24),.009,cloth)
  for x in [-w/2+.025,w/2-.025]:box('Side slipcover skirt',(x,0,.155),(.026,d-.02,.24),.008,cloth)
  for x in [-inner/2,inner/2]:line('Skirt pleat',[(x,-d/2-.02,.035),(x,-d/2-.02,.25)],thread)
 seatcount=count;depth=d-.22
 for i in range(seatcount):
  cw=inner/seatcount;x=-inner/2+cw*(i+.5)
  extension=.62 if style=='chaise' and i==seatcount-1 else 0
  if extension:box('Chaise extension frame',(x,-d/2-extension/2,leg+.08),(cw,extension+.08,.16),.03,cloth)
  box('Seat cushion '+str(i+1),(x,-.105-extension/2,.38),(cw-.014,depth+extension,.15),.055 if style!='compact' else .075,cloth)
  if style!='compact':line('Seat front seam',[(x-cw/2+.045,-d/2-extension+.006,.402),(x+cw/2-.045,-d/2-extension+.006,.402)],thread)
 backs=3 if style=='skirt' else count
 if style=='compact':backs=1
 for i in range(backs):
  cw=inner/backs;x=-inner/2+cw*(i+.5); bh=h-seat+.04
  o=box('Back cushion '+str(i+1),(x,d/2-.22,seat+bh/2-.025),(cw-.018,.21,bh),.075 if style in ['round','curved','skirt'] else .048,cloth);o.rotation_euler.x=math.radians(-9)
  if style=='tuft':
   for dx in [-cw*.25,cw*.25]:
    for zz in [seat+.12,seat+.25]:
     bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.012,location=(x+dx,d/2-.333,zz));bpy.context.object.name='Upholstered tuft button';bpy.context.object.data.materials.append(thread)
 if style in ['wood','skirt']:
  for sign in [-1,1]:
   o=box('Loose side pillow',(sign*(inner/2-.13),-.02,.59),(.27,.34,.17),.075,cloth);o.rotation_euler.y=sign*math.radians(60)
 for x in [-w/2+.13,w/2-.13]:
  for y in [-d/2+.12,d/2-.12]:
   if style in ['slim','compact']:cylinder('Metal leg',(x,y,leg/2),.018 if style=='slim' else .025,leg,metal)
   else:cylinder('Wood foot',(x,y,leg/2),.038,leg,wood)
 if style=='chaise':
  for x in [inner/2-inner/count+.12,inner/2-.12]:cylinder('Chaise front foot',(x,-d/2-.49,leg/2),.032,leg,wood)
 models=list(scene.objects);col=bpy.data.collections.new(refs[idx]['name']+' | editable parts');scene.collection.children.link(col)
 for o in models:
  for c in list(o.users_collection):c.objects.unlink(o)
  col.objects.link(o)
 # Apply export modifiers and convert seam curves for a portable mesh GLB.
 bpy.ops.object.select_all(action='DESELECT')
 for o in models:o.select_set(True)
 bpy.context.view_layer.objects.active=models[0]
 bpy.ops.object.convert(target='MESH')
 folder=OUT;os.makedirs(folder,exist_ok=True)
 scene['Reference']=refs[idx]['url'];scene['Notes']='Original catalog concept. Dimensions are modeled estimates, not a purchasable product specification.'
 bpy.ops.export_scene.gltf(filepath=os.path.join(folder,slug+'.glb'),export_format='GLB',use_selection=True,export_extras=True)
 ground=mat('Studio floor',(.68,.68,.66));bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.name='Studio ground';bpy.context.object.data.materials.append(ground)
 for loc,power,size in [((-3,-4,5),450,4),((4,-1,3),240,3),((0,3,4),350,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.4))
 bpy.ops.object.camera_add(location=(3.2,-5.2,2.6));cam=bpy.context.object;aim(cam,(0,-.12 if style=='chaise' else 0,.42));cam.data.type='ORTHO';cam.data.ortho_scale=w*1.48;scene.camera=cam
 scene.world=bpy.data.worlds.new('Studio world');scene.world.color=(.3,.3,.3)
 scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
 scene.render.filepath=os.path.join(folder,slug+'.png');scene.view_settings.view_transform='AgX'
 for screen in bpy.data.screens:
  for area in screen.areas:
   if area.type=='VIEW_3D':
    area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.color_type='MATERIAL';area.spaces.active.overlay.show_overlays=False
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(folder,slug+'.blend'));bpy.ops.render.render(write_still=True)
 print('FINISHED',idx+1,slug,flush=True)
json.dump([dict(slug=c[0],name=r['name'],source=r['url']) for c,r in zip(configs,refs)],open(os.path.join(OUT,'manifest.json'),'w'),indent=2)
