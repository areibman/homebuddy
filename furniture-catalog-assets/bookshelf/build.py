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
oak=mat('Natural oak',(.46,.30,.16));panel=mat('Muted sage back',(.22,.30,.245));edge=mat('Oak edge grain',(.38,.23,.11))
# Tall cabinet carcass with recessed plinth and staggered internal partitions.
box('Recessed oak plinth',(0,0,.045),(.98,.30,.09),edge,.01)
for x in [-.562,.562]:box('Full height side',(x,0,1.02),(.036,.38,1.90),oak,.004)
for z in [.088,.55,1.02,1.49,1.97]:box('Solid oak shelf',(0,0,z),(1.088,.38,.035),oak,.004)
box('Recessed sage back',(0,.18,1.03),(1.086,.018,1.85),panel,.002)
for x,z,h in [(-.19,.319,.425),(.19,.785,.435),(-.19,1.255,.435),(.19,1.73,.445)]:box('Offset vertical divider',(x,.005,z),(.028,.34,h),oak,.004)
# Small exposed edge details suggest plywood-like timber joinery.
for z in [.088,.55,1.02,1.49,1.97]:box('Shelf front edge',(0,-.189,z),(1.08,.003,.018),edge,.001)
finish('bookshelf','Forma Open Bookshelf','Storage','A tall oak shelving unit with offset cubbies, softened edges and a recessed sage back panel.',(1.16,.3805,1.9875),(3.1,-5.0,2.9),3.4)
p=ROOT+'/bookshelf/item.json';j=json.load(open(p));j['materials']=['Natural oak','Sage painted backing'];json.dump(j,open(p,'w'),indent=2)
bpy.ops.wm.read_factory_settings(use_empty=True)
stone=mat('Warm ivory travertine',(.65,.58,.45));walnut=mat('Walnut supports',(.17,.085,.038));vein=mat('Travertine subtle banding',(.58,.505,.385));pore=mat('Mineral pores',(.46,.39,.28))
# Elliptical solid top, bevel applied after scaling.
bpy.ops.mesh.primitive_cylinder_add(vertices=192,radius=1,depth=.065,location=(0,0,.3975));o=bpy.context.object;o.name='Oval solid travertine top';o.scale=(.70,.37,1);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(stone);b=o.modifiers.new('Stone eased edge','BEVEL');b.width=.012;b.segments=5;o.modifiers.new('Stone normals','WEIGHTED_NORMAL')
# Two walnut crescent-like sculpted oval supports.
for x in [-.40,.40]:
 bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=1,depth=.365,location=(x,0,.1825));o=bpy.context.object;o.name='Sculpted walnut oval support';o.scale=(.092,.245,1);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(walnut);b=o.modifiers.new('Eased walnut edge','BEVEL');b.width=.015;b.segments=4;o.modifiers.new('Walnut normals','WEIGHTED_NORMAL')
# Restrained surface mineral stripes and pinholes in actual geometry.
random.seed(35)
for y in [-.26,-.19,-.12,-.03,.06,.14,.22,.28]:
 limit=.686*math.sqrt(1-(y/.36)**2)
 pts=[(-limit+2*limit*t/25,y+.0018*math.sin(t*.55),.43015) for t in range(26)]
 path('Mineral sediment line',pts,vein,.00055)
for i in range(115):
 x=random.uniform(-.66,.66);y=random.uniform(-.335,.335)
 if (x/.68)**2+(y/.35)**2>.97:continue
 bpy.ops.mesh.primitive_circle_add(vertices=7,radius=random.uniform(.0007,.0019),fill_type='NGON',location=(x,y,.4303));o=bpy.context.object;o.name='Travertine mineral pore';o.scale.y=.65;o.data.materials.append(pore)
finish('coffee-table','Sora Oval Coffee Table','Tables','An oval travertine concept coffee table on sculptural walnut supports, with subtle mineral banding and softened stone edges.',(1.4,.74,.4303),(2.6,-4.2,2.6),2.05)
p=ROOT+'/coffee-table/item.json';j=json.load(open(p));j['materials']=['Ivory travertine','Walnut'];json.dump(j,open(p,'w'),indent=2)
