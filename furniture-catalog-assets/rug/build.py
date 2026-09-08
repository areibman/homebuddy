import bpy, math, os, json, random
from mathutils import Vector
ROOT='/Users/hyperbox/homebuddy/furniture-catalog-assets'
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
 folder=ROOT+'/'+slug;sc=bpy.context.scene;sc.unit_settings.system='METRIC';sc['Provenance']='Original design created procedurally for this catalog. No manufacturer affiliation.'
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
bpy.ops.wm.read_factory_settings(use_empty=True)
cream=mat('Natural wool',(.75,.66,.50));rust=mat('Terracotta wool',(.47,.14,.075));ink=mat('Ink wool',(.055,.075,.085));tan=mat('Sand wool',(.48,.34,.20))
box('Woven rug foundation',(0,0,.006),(2,2.8,.012),cream,.007)
for x in [-.95,.95]:box('Ink selvedge',(x,0,.013),(.012,2.77,.003),ink)
for y in [-1.32,1.32]:box('Terracotta end stripe',(0,y,.014),(1.88,.09,.004),rust)
# Large terracotta stepped diamond, with cream and ink central diamond.
for center in [-.68,.68]:
 pts=[(0,center-.49,.016),(.64,center,.016),(0,center+.49,.016),(-.64,center,.016)]
 poly('Terracotta woven medallion',pts,rust)
 poly('Cream inset',[(0,center-.35,.017),(.44,center,.017),(0,center+.35,.017),(-.44,center,.017)],cream)
 poly('Ink diamond',[(0,center-.24,.018),(.30,center,.018),(0,center+.24,.018),(-.30,center,.018)],ink)
 for x in [-.79,.79]:poly('Side motif',[(x,center-.12,.016),(x+.065,center,.016),(x,center+.12,.016),(x-.065,center,.016)],tan)
# Fine spaced warp threads produce woven surface relief with the pattern still visible.
for i in range(180):
 x=-.985+i*1.97/179
 path('Fine warp thread',[(x,-1.385,.019),(x,1.385,.019)],cream,.00048)
random.seed(2)
for sign in [-1,1]:
 for i in range(105):
  x=-.96+i*1.92/104
  path('Hand tied fringe',[(x,sign*1.39,.009),(x+.003,sign*1.43,.005),(x+random.uniform(-.008,.008),sign*(1.49+random.uniform(-.008,.008)),.004)],cream,.002)
finish('rug','Mesa Woven Rug','Rugs','A natural wool concept rug with terracotta diamond medallions, ink accents and hand-tied fringe.',(2,3,.021),(3.2,-4.5,5.9),4.1)
bpy.ops.wm.read_factory_settings(use_empty=True)
oak=mat('Honey oak',(.48,.30,.14));light=mat('Oak light grain',(.52,.335,.17));dark=mat('Oak medium grain',(.445,.267,.12));shadow=mat('Recessed charcoal plinth',(.045,.04,.032))
cyl('Solid round oak tabletop',(0,0,.725),.64,.05,oak)
# Thin concentric edge detail and fluted pedestal.
cyl('Under-edge reveal',(0,0,.694),.61,.012,dark);cyl('Tabletop support disc',(0,0,.67),.40,.036,oak)
cyl('Pedestal core',(0,0,.365),.215,.59,oak)
for i in range(40):
 a=i*2*math.pi/40;cyl('Oak pedestal flute %02d'%i,(.212*math.cos(a),.212*math.sin(a),.363),.018,.58,light if i%3==0 else oak)
cyl('Upper pedestal collar',(0,0,.646),.236,.035,dark);cyl('Lower pedestal collar',(0,0,.092),.238,.034,dark)
cyl('Broad circular foot',(0,0,.055),.37,.075,oak);cyl('Inset floor glides',(0,0,.01),.33,.02,shadow)
# Subtle parallel plank seams and grain use geometry, preserved in GLB.
for x in [-.42,-.21,0,.21,.42]:
 y=math.sqrt(.635**2-x*x);path('Tabletop board join',[(x,-y,.7502),(x,y,.7502)],dark,.00065)
random.seed(6)
for i in range(55):
 x=random.uniform(-.61,.61);ymax=math.sqrt(.63**2-x*x);ya=random.uniform(-ymax,ymax*.3);yb=min(ymax,ya+random.uniform(.1,.7))
 pts=[(x+.0015*math.sin(t*.8+i),ya+(yb-ya)*t/12,.75035) for t in range(13)]
 path('Fine oak grain',pts,light if i%2 else dark,.00038)
finish('dining-table','Alder Round Dining Table','Tables','A compact round oak concept table with a fluted pedestal, recessed collars and softly rounded solid top.',(1.28,1.28,.75),(2.8,-4.3,2.5),2.05)
