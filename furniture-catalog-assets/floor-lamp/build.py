import bpy,math,os,json
from mathutils import Vector
OUT=os.path.dirname(os.path.abspath(__file__));bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.unit_settings.system='METRIC'
def mat(name,c,metallic=0,rough=.5):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=rough;return m
brass=mat('Brushed champagne brass',(.43,.29,.13),.75,.3);dark=mat('Graphite base',(.045,.05,.053),.55,.4);linen=mat('Warm ivory linen',(.78,.73,.61),0,.88);inner=mat('Shade lining',(.83,.79,.67),0,.8);black=mat('Cable rubber',(.013,.015,.017),0,.8)
def cyl(name,r,h,z,material,x=0,y=0):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=h,location=(x,y,z));o=bpy.context.object;o.name=name;o.data.materials.append(material);b=o.modifiers.new('Soft machined rim','BEVEL');b.width=min(.008,h*.22);b.segments=3
 for f in o.data.polygons:f.use_smooth=True
 o.modifiers.new('Balanced normals','WEIGHTED_NORMAL');return o
cyl('Weighted disc base',.165,.038,.019,dark);cyl('Brass base inset',.135,.007,.041,brass)
cyl('Slender stem',.012,1.37,.731,brass);cyl('Stem foot collar',.024,.035,.060,brass);cyl('Socket collar',.029,.078,1.398,brass)
# Hollow tapered shade: pleating is actual mesh and preserved in GLB.
N=192;verts=[];faces=[]
for z,r in [(1.335,.24),(1.665,.158),(1.335,.233),(1.665,.151)]:
 for i in range(N):
  a=2*math.pi*i/N;rr=r+(.0035 if i%2 else -.0035);verts.append((rr*math.cos(a),rr*math.sin(a),z))
for i in range(N):
 j=(i+1)%N
 faces.extend([(i,j,N+j,N+i),(2*N+j,2*N+i,3*N+i,3*N+j),(j,i,2*N+i,2*N+j),(N+i,N+j,3*N+j,3*N+i)])
mesh=bpy.data.meshes.new('Pleated linen shell');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Open pleated linen lampshade',mesh);scene.collection.objects.link(o);o.data.materials.append(linen)
def ring(name,r,z):
 bpy.ops.mesh.primitive_torus_add(major_segments=96,minor_segments=10,location=(0,0,z),major_radius=r,minor_radius=.0038);o=bpy.context.object;o.name=name;o.data.materials.append(linen)
ring('Lower bound linen hem',.24,1.335);ring('Upper bound linen hem',.158,1.665)
# Interior bulb and discreet support spokes.
bulb=mat('Frosted bulb',(.92,.86,.69),0,.32);p=bulb.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.77,.45,1);p.inputs['Emission Strength'].default_value=.3
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=.043,location=(0,0,1.463));bpy.context.object.name='Frosted bulb';bpy.context.object.data.materials.append(bulb)
def curve(name,pts,r,material):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for p,co in zip(s.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);c.materials.append(material)
for a in [0,2*math.pi/3,4*math.pi/3]:curve('Shade support spoke',[(0,0,1.41),(.20*math.cos(a),.20*math.sin(a),1.37)],.0025,brass)
curve('Power cord',[(0,.05,.012),(.02,.18,.004),(.065,.24,.004),(.15,.275,.004),(.23,.25,.004),(.29,.23,.004)],.003,black)
cyl('Foot switch',.025,.014,.011,black,x=.15,y=.275)
models=list(scene.objects);col=bpy.data.collections.new('Solstice Floor Lamp | furniture');scene.collection.children.link(col)
for o in models:
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o)
bpy.ops.object.select_all(action='DESELECT')
for o in models:o.select_set(True)
bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH');bpy.context.view_layer.update()
points=[o.matrix_world@Vector(v) for o in col.objects for v in o.bound_box];dims=[max(v[i] for v in points)-min(v[i] for v in points) for i in range(3)]
scene['Provenance']='Original concept for FORM catalog. Approximate illustrative dimensions.'
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
json.dump({'id':'floor-lamp','name':'Solstice Floor Lamp','category':'Lighting','description':'A slender brass floor lamp with a pleated linen shade, weighted graphite base, and discreet foot switch.','materials':['Brushed brass','Pleated linen'],'dimensions_m':dict(zip(['width','depth','height'],[round(d,3) for d in dims])),'files':{'blend':'floor-lamp.blend','glb':'floor-lamp.glb','preview':'floor-lamp.png'},'provenance':scene['Provenance']},open(os.path.join(OUT,'item.json'),'w'),indent=2)
print('COMPLETE floor-lamp',dims,flush=True)
