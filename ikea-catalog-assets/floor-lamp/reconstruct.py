import bpy,math,os,sys,json
from mathutils import Vector
OUT=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,os.path.dirname(OUT));from rebuild_utils import *
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.unit_settings.system='METRIC'
ash=textured('Natural ash | embedded long grain',OUT,'ash',.56);linen=textured('White textile shade | fine embedded weave',OUT,'shade',.84);white=material('White cord and shade bindings',(.90,.90,.87),.8);metal=material('Socket metal',(.25,.25,.23),.4)
def cyl(name,r,h,z,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=h,location=(0,0,z));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
 b=o.modifiers.new('Fine edge rounding','BEVEL');b.width=min(.0015,h*.15);b.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');uv(o,.24);return o
for angle in [90,210,330]:
 a=math.radians(angle);rad=Vector((math.cos(a),math.sin(a),0));tan=Vector((-math.sin(a),math.cos(a),0));bottom=rad*.294+Vector((0,0,.014));top=rad*.045+Vector((0,0,.798));v=[]
 for center,width,depth in [(bottom,.023,.023),(top,.031,.030)]:
  for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]:v.append(tuple(center+tan*s*width/2+rad*t*depth/2))
 me=bpy.data.meshes.new('Tapered flat ash leg');me.from_pydata(v,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);me.update();o=bpy.data.objects.new('Flat tapered ash tripod leg',me);scene.collection.objects.link(o);o.data.materials.append(ash);uv(o,.27);b=o.modifiers.new('Small sanded arris','BEVEL');b.width=.001;b.segments=3;o.modifiers.new('Planar timber faces','WEIGHTED_NORMAL')
cyl('Solid round ash tripod hub',.071,.038,.815,ash)
cyl('Sliding solid ash height stem',.0125,.790,.925,ash)
cyl('Cord spool lower ash disk',.026,.018,.505,ash)
cyl('Cord spool upper ash disk',.026,.018,.546,ash)
cyl('Spool center',.015,.030,.526,ash)
for i in range(5):
 pts=[]
 for j in range(65):
  t=2*math.pi*j/64;pts.append((.018*math.cos(t),.018*math.sin(t),.517+i*.003))
 curve('White cord wound around storage spool',pts,.0015,white)
cyl('Lamp holder',.019,.052,1.247,metal)
# Thin double wall with smooth cylindrical sides and separate bound rims.
N=128;verts=[];faces=[]
for z,r in [(1.1986,.1905),(1.4986,.1905),(1.1986,.1888),(1.4986,.1888)]:
 for i in range(N):
  a=2*math.pi*i/N;verts.append((r*math.cos(a),r*math.sin(a),z))
for i in range(N):
 j=(i+1)%N;faces.extend([(i,j,N+j,N+i),(2*N+j,2*N+i,3*N+i,3*N+j)])
me=bpy.data.meshes.new('Thin cylindrical textile shade');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('White textile drum shade',me);scene.collection.objects.link(o);me.materials.append(linen)
uvl=me.uv_layers.new(name='Shade textile UV')
for poly in me.polygons:
 poly.use_smooth=True
 for li in poly.loop_indices:
  v=me.vertices[me.loops[li].vertex_index].co;uvl.data[li].uv=(math.atan2(v.y,v.x)*.1905/.25,v.z/.25)
for z in [1.199,1.498]:
 pts=[(.1897*math.cos(i*2*math.pi/N),.1897*math.sin(i*2*math.pi/N),z) for i in range(N)];curve('White bound shade rim',pts,.0012,white,True)
# Inside carrier visible from above.
for a in [0,120,240]:
 t=math.radians(a);curve('Shade wire support',[(0,0,1.241),(.177*math.cos(t),.177*math.sin(t),1.215)],.0011,white)
# Thin draping cable, shown unlit as in the catalog.
curve('White hanging power cable',[(.017,.015,1.24),(.020,.020,1.12),(.022,.025,1.00),(.035,.028,.88),(.042,.04,.79),(.03,.048,.62),(.017,.06,.54),(.036,.08,.45),(.085,.13,.32),(.14,.19,.17),(.20,.24,.008),(.29,.29,.005),(.38,.31,.004)],.00165,white)
models=list(scene.objects)
finish(OUT,'floor-lamp',models,(1.5,-6,1.65),(0,0,.75),2.04)
item=json.load(open(os.path.join(OUT,'item.json')));item['viewer']={'orbit':'14deg 82deg 105%','field_of_view':'30deg'};item['provenance']='Photo-based independent recreation with tapered ash tripod, white textile shade and embedded PBR textures; not official manufacturer CAD.';json.dump(item,open(os.path.join(OUT,'item.json'),'w'),indent=2)
