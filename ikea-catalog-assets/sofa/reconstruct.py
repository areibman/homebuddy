import bpy,math,os,sys,json
from mathutils import Vector
OUT=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,os.path.dirname(OUT));from rebuild_utils import *
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.unit_settings.system='METRIC'
fabric=textured('Gunnared beige | embedded melange weave',OUT,'fabric',.88)
seam=material('Matching beige upholstery thread',(.72,.70,.65),.9);feet=material('Dark recessed support feet',(.105,.095,.08),.65)

def cushion(name,loc,dims,r,face_axis,crown,rotation=0):
 a=[d/2 for d in dims];core=[v-r for v in a];verts=[];faces=[];steps=24
 for axis in range(3):
  others=[i for i in range(3) if i!=axis]
  for sign in [-1,1]:
   base=len(verts)
   for i in range(steps+1):
    for j in range(steps+1):
     v=Vector((0,0,0));v[axis]=sign*a[axis];v[others[0]]=a[others[0]]*(2*i/steps-1);v[others[1]]=a[others[1]]*(2*j/steps-1)
     q=Vector([max(-core[k],min(core[k],v[k])) for k in range(3)]);delta=v-q
     v=q+delta.normalized()*r
     # Crown and gentle textile tension soften cushions without inflating their seam silhouette.
     if axis==face_axis:
      f=max(0,1-(v[others[0]]/a[others[0]])**2)*max(0,1-(v[others[1]]/a[others[1]])**2)
      v[axis]+=sign*crown*f
      v[axis]+=sign*.0012*math.sin(v[0]*37+v[2]*26)*f
     verts.append(tuple(v))
   for i in range(steps):
    for j in range(steps):
     k=base+i*(steps+1)+j;quad=(k,k+1,k+steps+2,k+steps+1);faces.append(quad)
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);o.location=loc;o.rotation_euler.x=math.radians(rotation);o.data.materials.append(fabric)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.00001);bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
 for p in me.polygons:p.use_smooth=True
 uv(o,.24);return o

def piping(name,w,h,r,loc,plane='XY',rot=0,depth=.00085):
 pts=[]
 for cx,cy,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
  for j in range(17):
   t=math.radians(start+j*90/16);x=cx+r*math.cos(t);y=cy+r*math.sin(t);pts.append((x,y,0) if plane=='XY' else (x,0,y))
 o=curve(name,pts,depth,seam,True);o.location=loc;o.rotation_euler.x=math.radians(rot);return o

box('Upholstered seat base',(0,-.018,.17),(1.80,.885,.28),.012,fabric)
box('Rear support beneath loose back cushions',(0,.409,.376),(1.80,.132,.652),.018,fabric)
for x in [-1.02,1.02]:
 box('Broad low upholstered arm',(x,0,.28),(.24,.95,.51),.018,fabric)
 piping('Inset cover seam on arm front',.207,.477,.016,(x,-.474,.28),'XZ',depth=.0006)
 # subtle inner horizontal sewn seam follows broad arm top.
 curve('Inner arm cover seam',[(x+(-1 if x>0 else 1)*.117,y,.497) for y in [-.43,-.25,0,.26,.42]],.00065,seam)
for i,x in enumerate([-.45,.45]):
 cushion('Loose seat cushion '+str(i+1),(x,-.109,.374),(.891,.715,.139),.027,2,.013)
 piping('Seat cushion top welt',.866,.690,.031,(x,-.109,.422))
 piping('Seat cushion bottom welt',.866,.690,.029,(x,-.109,.327),depth=.00065)
 o=cushion('Loose back cushion '+str(i+1),(x,.234,.624),(.897,.185,.397),.042,1,.036,-13)
 offset=Vector((0,-.083,0));offset.rotate(o.rotation_euler)
 piping('Back cushion perimeter seam',.865,.369,.025,Vector(o.location)+offset,'XZ',-13,.00085)
for x in [-.99,.99]:
 for y in [-.355,.355]:box('Recessed black foot',(x,y,.020),(.074,.075,.04),.003,feet)
models=list(scene.objects)
finish(OUT,'sofa',models,(2.4,-6,1.63),(0,0,.41),2.92)
item=json.load(open(os.path.join(OUT,'item.json')));item['viewer']={'orbit':'22deg 77deg 112%','target':'auto auto auto','field_of_view':'30deg'};item['provenance']='Photo-based independent recreation; reconstructed upholstery and embedded PBR fabric, not official manufacturer CAD.';json.dump(item,open(os.path.join(OUT,'item.json'),'w'),indent=2)
