import bpy,math,os,json
from mathutils import Vector
OUT=os.path.dirname(os.path.abspath(__file__));bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.unit_settings.system='METRIC'
def mat(name,c,metallic=0,rough=.5):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=rough;return m
brass=mat('Natural ash',(.57,.42,.27),0,.58);dark=mat('Graphite base',(.045,.05,.053),.55,.4);linen=mat('Warm ivory linen',(.78,.73,.61),0,.88);inner=mat('Shade lining',(.83,.79,.67),0,.8);black=mat('Cable rubber',(.013,.015,.017),0,.8)
def cyl(name,r,h,z,material,x=0,y=0):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=h,location=(x,y,z));o=bpy.context.object;o.name=name;o.data.materials.append(material);b=o.modifiers.new('Soft machined rim','BEVEL');b.width=min(.008,h*.22);b.segments=3
 for f in o.data.polygons:f.use_smooth=True
 o.modifiers.new('Balanced normals','WEIGHTED_NORMAL');return o
# Reference: IKEA LAUTERS ash/white, adjustable tripod floor lamp.
# Published max height 59 in, shade width 15 in, base diameter 24 in.
for a in [math.radians(90),math.radians(210),math.radians(330)]:
 bottom=Vector((.29*math.cos(a),.29*math.sin(a),.020));top=Vector((.042*math.cos(a),.042*math.sin(a),.81));delta=top-bottom
 bpy.ops.mesh.primitive_cube_add(size=1,location=(top+bottom)/2);o=bpy.context.object;o.name='Splayed ash tripod leg';o.dimensions=(.031,.036,delta.length);o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(brass);b=o.modifiers.new('Soft timber edge','BEVEL');b.width=.003;b.segments=3;o.modifiers.new('Timber normals','WEIGHTED_NORMAL')
cyl('Round tripod hub',.067,.037,.815,brass)
cyl('Adjustable ash stem',.0125,.79,.925,brass)
cyl('Cord spool lower flange',.027,.018,.505,brass)
cyl('Cord spool upper flange',.027,.018,.540,brass)
cyl('Cord spool core',.016,.025,.522,brass)
cyl('Socket',.02,.05,1.245,dark)
N=96;verts=[];faces=[]
for z,r in [(1.1986,.1905),(1.4986,.1905),(1.1986,.1875),(1.4986,.1875)]:
 for i in range(N):
  a=2*math.pi*i/N;verts.append((r*math.cos(a),r*math.sin(a),z))
for i in range(N):
 j=(i+1)%N;faces.extend([(i,j,N+j,N+i),(2*N+j,2*N+i,3*N+i,3*N+j),(j,i,2*N+i,2*N+j),(N+i,N+j,3*N+j,3*N+i)])
mesh=bpy.data.meshes.new('White cylindrical shade mesh');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('White textile drum shade',mesh);scene.collection.objects.link(o);o.data.materials.append(linen)
for poly in mesh.polygons:poly.use_smooth=True
for z in [1.1986,1.4986]:
 bpy.ops.mesh.primitive_torus_add(major_segments=96,minor_segments=8,major_radius=.189,minor_radius=.0015,location=(0,0,z));o=bpy.context.object;o.name='Shade bound rim';o.data.materials.append(linen)
def curve(name,pts,r,material):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);c.materials.append(material)
curve('White power cord',[(.019,.02,1.25),(.02,.02,.82),(.014,.015,.55),(.10,.10,.28),(.22,.20,.004),(.28,.19,.004)],.002,linen)
models=list(scene.objects);col=bpy.data.collections.new('LAUTERS | unofficial recreation');scene.collection.children.link(col)
for o in models:
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o)
bpy.ops.object.select_all(action='DESELECT')
for o in models:o.select_set(True)
bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH');bpy.context.view_layer.update()
points=[o.matrix_world@Vector(v) for o in col.objects for v in o.bound_box];dims=[max(v[i] for v in points)-min(v[i] for v in points) for i in range(3)]
scene['Provenance']='Unofficial simplified recreation based on linked IKEA product. Photo belongs to IKEA.'
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'floor-lamp.glb'),export_format='GLB',use_selection=True)
ground=mat('Neutral studio',(.68,.68,.66),0,.8);bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.data.materials.append(ground)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,pow,size in [((-3,-4,5),450,4),((4,-1,3),240,3),((0,3,4),350,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=pow;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.8))
bpy.ops.object.camera_add(location=(2.3,-4,2.5));cam=bpy.context.object;aim(cam,(0,0,.83));cam.data.type='ORTHO';cam.data.ortho_scale=2.75;scene.camera=cam
scene.world=bpy.data.worlds.new('Studio world');scene.world.color=(.3,.3,.3);scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.filepath=os.path.join(OUT,'floor-lamp.png')
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.color_type='MATERIAL';area.spaces.active.overlay.show_overlays=False
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'floor-lamp.blend'));bpy.ops.render.render(write_still=True)
json.dump({'id':'floor-lamp','name':'LAUTERS Floor Lamp','category':'Lighting','description':'Ash tripod base and white textile drum shade. Shown at the maximum adjustable height.','materials':['Solid ash','White textile shade'],'dimensions_m':{'width':.6096,'depth':.6096,'height':1.4986},'dimensions_note':'Base diameter 24 in; maximum height 59 in. Height adjusts from 47 to 59 in.','source':{'retailer':'IKEA','url':'https://www.ikea.com/us/en/p/lauters-floor-lamp-ash-white-00405048/','photo_url':'https://www.ikea.com/us/en/images/products/lauters-floor-lamp-ash-white__0663863_pe712536_s5.jpg?f=s','article_number':'004.050.48','checked_date':'2026-09-08'},'files':{'blend':'floor-lamp.blend','glb':'floor-lamp.glb','preview':'floor-lamp.png'},'provenance':scene['Provenance']},open(os.path.join(OUT,'item.json'),'w'),indent=2)
print('COMPLETE LAUTERS',flush=True)
