import bpy,math,json,os,numpy as np
from mathutils import Vector
BASE='/Users/hyperbox/homebuddy/ikea-catalog-assets'
def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def mat(n,c,r=.5):
 m=bpy.data.materials.new(n);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*[lin(v) for v in c],1);p.inputs['Roughness'].default_value=r;m.diffuse_color=p.inputs['Base Color'].default_value;return m
def box(n,loc,dim,m,r=.0007):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);b=o.modifiers.new('Fine manufactured edge','BEVEL');b.width=r;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name);o.modifiers.new('Face normals','WEIGHTED_NORMAL');o.data.materials.append(m);return o
def grainuv(o):
 uv=o.data.uv_layers.active or o.data.uv_layers.new();vaxis=max(range(3),key=lambda i:o.dimensions[i]);
 for p in o.data.polygons:
  other=[i for i in range(3) if i!=vaxis];uaxis=min(other,key=lambda i:abs(p.normal[i]))
  for li in p.loop_indices:
   c=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(c[uaxis]/max(o.dimensions[uaxis],.001)+.5,c[vaxis]/max(o.dimensions[vaxis],.001)+.5)
def pine(out):
 m=mat('HEMNES white stained pine - embedded grain',(.96,.958,.942),.5);w=512;h=1024;x,y=np.meshgrid(np.linspace(0,1,w),np.linspace(0,1,h));warp=x+.009*np.sin(y*12)+.013*np.sin(y*4+x*11);grain=.45*np.sin(warp*270)+.25*np.sin(warp*580)+.18*np.sin(warp*1050);knots=np.zeros_like(x)
 for cx,cy in [(.27,.24),(.71,.76)]:
  rad=np.sqrt(((x-cx)*1.1)**2+((y-cy)*3.8)**2);knots+=np.exp(-rad*22)*(.8+.2*np.cos(rad*210))
 value=.965+.004*grain-.022*knots;arr=np.ones((h,w,4),dtype=np.float32);arr[:,:,0]=value;arr[:,:,1]=value-.001;arr[:,:,2]=value-.007
 im=bpy.data.images.new('White stained pine portable albedo',width=w,height=h);im.pixels.foreach_set(arr.reshape(-1));im.filepath_raw=out+'/pine-albedo.png';im.file_format='PNG';im.save();im.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);return m
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def studio(slug,H):
 s=bpy.context.scene;s.world=bpy.data.worlds.new('Neutral daylight');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.75
 for loc,power,size in [((-3,-4,5),180,5),((4,-1,3),45,4)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;aim(o,(0,0,H/2))
 bpy.ops.object.camera_add();cam=bpy.context.object;target=Vector((0,0,H*.48));dist=10;azi=math.radians(23 if slug=='bed' else 20 if slug=='dresser' else 24);elev=math.radians(14 if slug=='bed' else 13 if slug=='dresser' else 13);cam.location=target+Vector((math.sin(azi)*math.cos(elev)*dist,-math.cos(azi)*math.cos(elev)*dist,math.sin(elev)*dist));aim(cam,target);cam.data.type='ORTHO';cam.data.ortho_scale=3.25 if slug=='bed' else 1.86 if slug=='dresser' else 1.19;s.camera=cam
 s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.render.film_transparent=True;s.world.color=(1,1,1);s.view_settings.view_transform='Standard';s.view_settings.look='None';s.view_settings.exposure=0;s.view_settings.gamma=1
 # White background compositing, without a gray floor or cast floor shadows.
 s.render.film_transparent=False;nt=s.world.node_tree;bg=nt.nodes['Background'];camera_bg=nt.nodes.new('ShaderNodeBackground');camera_bg.inputs[0].default_value=(1,1,1,1);camera_bg.inputs[1].default_value=1;lp=nt.nodes.new('ShaderNodeLightPath');mix=nt.nodes.new('ShaderNodeMixShader');nt.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]);nt.links.new(bg.outputs[0],mix.inputs[1]);nt.links.new(camera_bg.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],nt.nodes['World Output'].inputs[0]);return s

for slug in ['bed','dresser','nightstand']:
 out=BASE+'/'+slug;meta=json.load(open(out+'/item.json'));W,D,H=[meta['dimensions_m'][k] for k in ['width','depth','height']];bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.unit_settings.system='METRIC';white=mat('Neutral white acrylic paint',(.935,.936,.932),.42);dark=mat('Interior shadow',(.26,.26,.25));steel=mat('Galvanized support',(.58,.59,.60),.35)
 if slug=='bed':
  box('MALM full headboard',(0,D/2-.022,H/2),(W,.044,H),white)
  box('MALM full low footboard',(0,-D/2+.016,.381/2),(W,.032,.381),white)
  for x in [-W/2+.032,W/2-.032]:box('MALM deep side rail',(x,-.006,.295),(.064,D-.078,.172),white)
  box('SKORVA center support',(0,0,.270),(.045,D-.075,.044),steel)
  sheet=mat('White fitted sheet',(.982,.982,.978),.86)
  mattress=box('Fitted sheet mattress with soft crown',(0,-.003,.469),(1.5208,2.0193,.255),sheet,.035)
  # Subtle broad crown and soft vertical gathers keep the sheet from reading as a rigid rounded block.
  bpy.context.view_layer.objects.active=mattress;sub= mattress.modifiers.new('Cloth contour mesh','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=3;bpy.ops.object.modifier_apply(modifier=sub.name)
  for v in mattress.data.vertices:
   x,y,z=v.co
   if z>.065:v.co.z+=.006*max(0,1-(x/.77)**4)*max(0,1-(y/1.02)**4)
   if abs(x)>.72 and z<.06:v.co.x+=.0014*math.sin(y*54)*math.sin((z+.13)*17)
   if abs(y)>.97 and z<.06:v.co.y+=.0014*math.sin(x*59)*math.sin((z+.13)*17)
  for p in mattress.data.polygons:p.use_smooth=True
 elif slug=='dresser':
  # Closed cabinet, genuine panel joins, small leveling feet and distinct drawer fronts.
  fy=-D/2+.015;back=D/2
  box('VIHALS top panel',(0,.004,H-.009),(W,D-.008,.018),white)
  box('VIHALS base panel',(0,.004,.020),(W,D-.008,.018),white)
  for x in [-W/2+.008,W/2-.008]:box('VIHALS full side panel',(x,.014,(H+.011)/2),(.016,D-.028,H-.047),white)
  box('VIHALS rear panel',(0,back-.005,(H+.011)/2),(W-.032,.01,H-.047),white)
  box('Inset cabinet behind fronts',(0,fy+.03,H/2),(W-.032,.016,H-.055),dark)
  for row,(lo,hi) in enumerate([(.031,.321),(.324,.532),(.535,H-.024)]):
   for sign in [-1,1]:
    x=sign*(W-.02)/4;box('VIHALS drawer '+str(row)+str(sign),(x,fy+.002,(lo+hi)/2),((W-.026)/2,.018,hi-lo),white)
    box('Folded white edge pull lip',(x,fy-.010,hi-.006),(.034,.022,.0038),white,.001)
    box('Folded white edge pull return',(x,fy-.019,hi-.009),(.034,.0035,.009),white,.0009)
  for x in [-W/2+.045,0,W/2-.045]:
   for y in [-D/2+.045,D/2-.035]:box('Flat leveling foot',(x,y,.006),(.04,.032,.012),white,.001)
 else:
  white=pine(out);glide=mat('Dark foot glides',(.13,.135,.125),.5)
  box('HEMNES top overhang',(0,0,H-.009),(W,D,.018),white)
  xs=[-W/2+.046,W/2-.046];ys=[-D/2+.049,D/2-.049]
  for x in xs:
   for y in ys:
    o=box('HEMNES subtly tapered pine leg',(x,y,(H-.018+.003)/2),(.032,.030,H-.021),white)
    for v in o.data.vertices:
     t=(v.co.z+(H-.021)/2)/(H-.021);fac=.69+.31*t;v.co.x*=fac;v.co.y*=fac
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.010,depth=.003,location=(x,y,.0015));o=bpy.context.object;o.name='Black floor glide';o.data.materials.append(glide)
  box('HEMNES lower shelf',(0,0,.260),(W-.074,D-.075,.016),white)
  for x in xs:box('HEMNES inset side apron',(x,0,H-.077),(.021,D-.106,.118),white)
  box('HEMNES back apron',(0,ys[1],H-.077),(W-.107,.02,.118),white)
  box('HEMNES shallow drawer box',(0,0,H-.071),(W-.127,D-.114,.09),white)
  box('HEMNES drawer front',(0,ys[0]-.002,H-.070),(W-.127,.017,.10),white)
  box('HEMNES lower front crossrail',(0,ys[0],H-.132),(W-.092,.024,.020),white)
  knob=mat('Antiqued pewter dark knob',(.235,.238,.213),.65)
  bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.0039,depth=.008,location=(0,ys[0]-.014,H-.068),rotation=(math.pi/2,0,0));bpy.context.object.data.materials.append(knob);bpy.context.object.name='Knob narrow stem'
  bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=20,radius=.010,location=(0,ys[0]-.020,H-.068));o=bpy.context.object;o.name='HEMNES round domed knob';o.scale.y=.48;o.data.materials.append(knob)
  for o in list(bpy.context.scene.objects):
   if o.type=='MESH' and o.data.materials and o.data.materials[0]==white:grainuv(o)
 models=list(bpy.context.scene.objects);col=bpy.data.collections.new(meta['name']+' - reconstructed parts');bpy.context.scene.collection.children.link(col)
 for o in models:
  for c in list(o.users_collection):c.objects.unlink(o)
  col.objects.link(o)
 bpy.ops.object.select_all(action='DESELECT')
 for o in models:o.select_set(True)
 bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH');bpy.ops.export_scene.gltf(filepath=out+'/'+slug+'.glb',export_format='GLB',use_selection=True,export_materials='EXPORT')
 s=studio(slug,H);s['source']=meta['source']['url'];s['provenance']=meta['provenance'];s.render.filepath=out+'/'+slug+'.png';bpy.ops.wm.save_as_mainfile(filepath=out+'/'+slug+'.blend');bpy.ops.render.render(write_still=True)
 # Import the delivered binary into an empty scene, using an identical neutral studio.
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=out+'/'+slug+'.glb');s=studio(slug,H);s.render.filepath=out+'/roundtrip.png';bpy.ops.render.render(write_still=True)
 print('FINISHED',slug,flush=True)
