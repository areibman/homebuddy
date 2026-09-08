import bpy, math, os, json, random
from mathutils import Vector
ROOT='/Users/hyperbox/homebuddy/ikea-catalog-assets'
def mat(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8;return m
def box(n,p,s,m,b=.002):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if b:
  mod=o.modifiers.new('Soft edges','BEVEL');mod.width=b;mod.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL')
 return o
def cyl(n,p,r,d,m):
 bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=r,depth=d,location=p);o=bpy.context.object;o.name=n;o.data.materials.append(m);mod=o.modifiers.new('Rounded edges','BEVEL');mod.width=.008;mod.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
def path(n,pts,mat,r):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for p,co in zip(s.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);c.materials.append(mat)
def poly(n,pts,m):
 mesh=bpy.data.meshes.new(n);mesh.from_pydata(pts,[],[tuple(range(len(pts)))]);mesh.update();o=bpy.data.objects.new(n,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(m)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def finish(slug,name,cat,desc,dims,cam,scale):
 folder=ROOT+'/'+slug;sc=bpy.context.scene;sc.unit_settings.system='METRIC';sc['Provenance']='Unofficial simplified recreation of IKEA product; see item.json for source.'
 bpy.ops.object.select_all(action='SELECT');models=list(sc.objects);bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH');bpy.ops.export_scene.gltf(filepath=f'{folder}/{slug}.glb',export_format='GLB',use_selection=True)
 floor=mat('Warm white studio',(.76,.75,.71));box('Studio floor',(0,0,-.035),(200,200,.05),floor,0)
 for loc,pow,size in [((-3,-4,5),650,4),((4,-1,4),400,3),((1,4,5),500,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=pow;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.3))
 bpy.ops.object.camera_add(location=cam);o=bpy.context.object;aim(o,(0,0,dims[2]*.4));o.data.type='ORTHO';o.data.ortho_scale=scale;sc.camera=o;sc.world=bpy.data.worlds.new('World');sc.world.color=(.3,.3,.3);sc.render.engine='CYCLES';sc.cycles.samples=40;sc.cycles.use_denoising=True;sc.render.resolution_x=1200;sc.render.resolution_y=900;sc.render.resolution_percentage=100;sc.render.filepath=f'{folder}/{slug}.png'
 for screen in bpy.data.screens:
  for a in screen.areas:
   if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
 bpy.ops.wm.save_as_mainfile(filepath=f'{folder}/{slug}.blend');bpy.ops.render.render(write_still=True)
 json.dump(dict(id=slug,name=name,category=cat,description=desc,dimensions_m=dict(zip(['width','depth','height'],dims)),files=dict(blend=slug+'.blend',glb=slug+'.glb',preview=slug+'.png'),provenance='Original procedural concept design, created for this virtual furniture catalog; not a manufacturer product or CAD asset.'),open(folder+'/item.json','w'),indent=2)

def metadata(slug,name,cat,desc,dims,mats,article):
 p=ROOT+'/'+slug+'/item.json';j=json.load(open(p));j.update(name=name,category=cat,description=desc,dimensions_m=dict(zip(['width','depth','height'],dims)),materials=mats);source=json.load(open(ROOT+'/'+slug+'/source.json'));source.update(retailer='IKEA',article_number=article,checked_date='2026-09-08');j['source']=source;j['provenance']='Unofficial simplified recreation based on linked IKEA product. Photo belongs to IKEA.';json.dump(j,open(p,'w'),indent=2)
 with open(ROOT+'/'+slug+'/reference.md','a') as f:f.write('\n\n## Modeling reference notes\nOfficial product photo: '+source['photo_url']+'\nDimensions were cross-checked with the same article on IKEA UK (metric): '+source['url'].replace('/us/en/','/gb/en/')+'\nSimplified reconstruction. Visible shape, color and overall dimensions matched; internal construction and fine surface grain approximated.\n')
bpy.ops.wm.read_factory_settings(use_empty=True)
ash=mat('Light ash veneer',(.67,.51,.32));birch=mat('Solid birch legs',(.64,.47,.27));grain=mat('Ash grain',(.58,.425,.26))
# Round top with the prominent underside chamfer visible in IKEA photograph.
verts=[];faces=[];rings=[(.508,.704),(.518,.714),(.525,.73),(.525,.74)]
for r,z in rings:
 for i in range(160):a=2*math.pi*i/160;verts.append((r*math.cos(a),r*math.sin(a),z))
for j in range(3):
 for i in range(160):a=j*160+i;b=j*160+(i+1)%160;faces.append((a,b,b+160,a+160))
faces.append(tuple(range(159,-1,-1)));faces.append(tuple(range(480,640)))
mesh=bpy.data.meshes.new('Chamfered table top');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('LISABO round ash tabletop',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(ash);o.modifiers.new('Tabletop normals','WEIGHTED_NORMAL')
for sx in [-1,1]:
 for sy in [-1,1]:
  verts=[]
  for cx,cy,z,r in [(sx*.345,sy*.345,0,.017),(sx*.285,sy*.285,.714,.033)]:
   for dx,dy in [(-1,-1),(1,-1),(1,1),(-1,1)]:verts.append((cx+dx*r,cy+dy*r,z))
  faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
  mesh=bpy.data.meshes.new('Tapered splayed leg');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('LISABO solid birch tapered leg',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(birch);b=o.modifiers.new('Rounded leg corners','BEVEL');b.width=.007;b.segments=4;o.modifiers.new('Leg normals','WEIGHTED_NORMAL')
random.seed(22)
for i in range(55):
 x=random.uniform(-.50,.50);yl=math.sqrt(.515**2-x*x);a=random.uniform(-yl,yl*.4);b=min(yl,a+random.uniform(.08,.65));path('Subtle ash grain',[(x+.0015*math.sin(t*.65+i),a+(b-a)*t/18,.7398) for t in range(19)],grain,.00018)
finish('dining-table','LISABO table — ash veneer','Dining tables','Round ash veneer table with splayed, tapered solid birch legs.',(1.05,1.05,.74),(2.6,-4.3,2.3),1.8)
metadata('dining-table','LISABO table — ash veneer','Dining tables','IKEA round table in ash veneer, 105 cm diameter, with tapered solid birch legs.',(1.05,1.05,.74),['Ash veneer','Solid birch','Clear acrylic lacquer'],'404.164.98')
bpy.ops.wm.read_factory_settings(use_empty=True)
white=mat('White acrylic finish',(.86,.85,.81))
box('LACK rectangular top',(0,0,.425),(.90,.55,.05),white,.001)
for x in [-.425,.425]:
 for y in [-.25,.25]:box('LACK square leg',(x,y,.20),(.05,.05,.40),white,.001)
box('LACK lower storage shelf',(0,0,.164),(.80,.50,.012),white,.0008)
finish('coffee-table','LACK coffee table — white','Coffee tables','White rectangular coffee table with four square legs and a separate magazine shelf.',(.90,.55,.45),(2.8,-4.5,2.8),1.40)
metadata('coffee-table','LACK coffee table — white','Coffee tables','IKEA LACK coffee table in white, 90 × 55 cm, with a lower storage shelf.',(.90,.55,.45),['White acrylic finish','Particleboard','Fiberboard','Paper honeycomb core'],'904.499.05')
bpy.ops.wm.read_factory_settings(use_empty=True)
jute=[mat('Natural jute '+str(i),(.34+i*.025,.235+i*.018,.145+i*.012)) for i in range(6)]
box('LOHALS flatwoven jute foundation',(0,0,.003),(1.6,2.3,.006),jute[2],.004)
random.seed(48)
# Tight regular weave, no fringes or decorative medallions: actual LOHALS appearance.
for i in range(260):
 x=-.796+i*1.592/259
 pts=[(x+.00035*math.sin(t),-1.146+2.292*t/120,.009+.001*math.sin(t*math.pi/2+i)) for t in range(121)]
 path('Jute warp',pts,jute[random.randrange(6)],.0019)
for i in range(380):
 y=-1.146+i*2.292/379
 pts=[(-.796+1.592*t/90,y+.0004*math.sin(t),.009+.0018*math.sin(t*math.pi/2+i)) for t in range(91)]
 path('Jute weft',pts,jute[random.randrange(6)],.0022)
for x in [-.797,.797]:path('Bound long selvedge',[(x,-1.147,.007),(x,1.147,.007)],jute[3],.003)
for y in [-1.147,1.147]:path('Bound end selvedge',[(-.797,y,.007),(.797,y,.007)],jute[3],.003)
finish('rug','LOHALS rug — natural','Rugs','Natural flatwoven jute rug with an undecorated rectangular weave and bound edges.',(1.6,2.3,.013),(3,-4.2,5.6),3.2)
metadata('rug','LOHALS rug — natural','Rugs','IKEA LOHALS natural jute rug, 160 × 230 cm; tightly flatwoven with natural color variation.',(1.6,2.3,.013),['100% jute'],'502.773.93')
