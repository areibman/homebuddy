"""Original Homebuddy TV furniture. Meter-scale editable meshes and furniture-only GLBs."""
import bpy,math,json,sys,pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parent/'ikea-catalog-assets'))
from rebuild_utils import material,box,curve,aim

def cylinder(name,a,b,r,mat):
 a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.data.materials.append(mat);m=o.modifiers.new('Rounded ends','BEVEL');m.width=.003;m.segments=3;return o

def polygon(name,points,y,mat):
 me=bpy.data.meshes.new(name);me.from_pydata([(x,y,z) for x,z in points],[],[tuple(range(len(points)))]);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(mat);return o

def create(slug,name,inches,console_w,depth,height,wood_color,easel=False):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 out=ROOT/slug;out.mkdir(exist_ok=True)
 wood=material('Warm oak' if inches==43 else 'Smoked walnut',wood_color,.62)
 black=material('Graphite aluminum',(.075,.087,.092),.3);p=black.node_tree.nodes.get('Principled BSDF');p.inputs['Metallic'].default_value=.45
 glass=material('Anti-glare screen',(.085,.15,.17),.25)
 rubber=material('Soft black feet',(.035,.04,.04),.9)
 linen=material('Speaker fabric',(.19,.21,.2),.98)
 metal=material('Brushed bronze hardware',(.48,.36,.2),.32);metal.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.65
 # Physical widescreen ratio; console is part of each floor-placeable catalog object.
 sw=inches*.0254*16/math.sqrt(16**2+9**2);sh=sw*9/16;top=height-.012;bottom=top-sh-.016;cy=-.01
 if easel:
  for x in [-.36,.36]:cylinder('Tapered easel front leg',(x,-depth/2+.025,.03),(x*.5,.15,1.04),.024,wood)
  cylinder('Easel rear leg',(0,depth/2-.025,.03),(0,.15,1.04),.026,wood)
  cylinder('Bronze leg brace',(-.26,-.15,.39),(.26,-.15,.39),.01,metal)
  for x,y in [(-.36,-depth/2+.025),(.36,-depth/2+.025),(0,depth/2-.025)]:box('Rubber foot',(x,y,.013),(.068,.05,.026),.009,rubber)
 else:
  ch=.50 if inches==43 else .49
  for x in [-console_w/2+.095,console_w/2-.095]:
   for y in [-depth/2+.065,depth/2-.065]:cylinder('Console leg',(x,y,.018),(x,y,.12),.021,black);box('Foot pad',(x,y,.009),(.048,.048,.018),.006,rubber)
  box('Console carcass',(0,0,.30),(console_w-.024,depth-.022,.37),.014,wood)
  box('Floating console top',(0,0,ch-.009),(console_w,depth,.028),.008,wood)
  box('Dark recessed front',(0,-depth/2-.002,.30),(console_w-.08,.012,.285),.003,linen)
  # Reeded sliding doors leave a central equipment bay exposed.
  for side in [-1,1]:
   center=side*console_w*.325;w=console_w*.29
   box('Sliding door panel',(center,-depth/2-.012,.30),(w,.018,.292),.004,wood)
   n=int(w/.024)
   for j in range(n):box('Reeded wood flute',(center-w/2+.012+j*.024,-depth/2-.024,.30),(.011,.012,.282),.005,wood)
   box('Inset brass pull',(center+side*w*.33,-depth/2-.033,.31),(.01,.008,.085),.003,metal)
  box('Open media shelf',(0,-.006,.25),(console_w*.32,depth-.05,.018),.003,wood)
  box('Receiver',(0,-depth/2+.057,.286),(console_w*.25,.15,.045),.005,black)
  # Small removable-looking central pedestal, grounded on console top.
  box('TV pedestal base',(0,cy-.017,ch+.013),(sw*.33,.20,.026),.012,black)
  box('TV pedestal neck',(0,cy+.018,(ch+bottom)/2),(.055,.044,max(.04,bottom-ch)),.006,black)
 box('TV rear housing',(0,cy+.015,(bottom+top)/2),(sw+.025,.053,sh+.025),.012,black)
 box('Slim display bezel',(0,cy-.019,(bottom+top)/2),(sw+.018,.016,sh+.018),.006,black)
 box('Screen glass',(0,cy-.029,(bottom+top)/2),(sw,.004,sh),.004,glass)
 # Original quiet landscape artwork in screen space. No third-party content or bright emissive fill.
 colors=[(.62,.73,.72),(.78,.68,.50),(.32,.48,.47),(.17,.33,.36),(.12,.24,.28)]
 mats=[material('Screen art '+str(i),c,1) for i,c in enumerate(colors)]
 left,right=-sw/2+.007,sw/2-.007;low,high=bottom+.009,top-.009
 polygon('Screen sky',[(left,low),(right,low),(right,high),(left,high)],cy-.032,mats[0])
 radius=sh*.10;sunx=sw*.27;sunz=bottom+sh*.72
 polygon('Screen sun',[(sunx+math.cos(t*math.tau/48)*radius,sunz+math.sin(t*math.tau/48)*radius) for t in range(48)],cy-.033,mats[1])
 for j,points in enumerate([
  [(left,low),(right,low),(right,bottom+sh*.57),(sw*.16,bottom+sh*.46),(-sw*.13,bottom+sh*.69),(left,bottom+sh*.42)],
  [(left,low),(right,low),(right,bottom+sh*.26),(sw*.2,bottom+sh*.44),(-sw*.11,bottom+sh*.23),(left,bottom+sh*.40)],
  [(left,low),(right,low),(right,bottom+sh*.15),(-sw*.15,bottom+sh*.1),(left,bottom+sh*.23)]
 ]):polygon('Screen ridge '+str(j),points,cy-.034-j*.001,mats[j+2])
 box('Standby indicator',(sw*.44,cy-.031,bottom-.005),(.006,.003,.002),.001,metal)
 box('Rear connection bay',(sw*.24,cy+.044,bottom+sh*.26),(.11,.004,.065),.002,rubber)
 for j in range(3):box('HDMI port',(sw*.21+j*.025,cy+.047,bottom+sh*.26),(.014,.002,.006),.001,black)
 objects=list(bpy.context.scene.objects)
 # Normalize final dimensions exactly once; studio fixtures are not included in GLB.
 bpy.context.view_layer.update();verts=[o.matrix_world@Vector(c) for o in objects if o.type=='MESH' for c in o.bound_box]
 lo=Vector([min(v[a] for v in verts) for a in range(3)]);hi=Vector([max(v[a] for v in verts) for a in range(3)])
 dimensions={'width':round(hi.x-lo.x,5),'depth':round(hi.y-lo.y,5),'height':round(hi.z-lo.z,5)}
 center=(lo+hi)/2
 for o in objects:o.location.x-=center.x;o.location.y-=center.y;o.location.z-=lo.z
 bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.convert(target='MESH')
 bpy.ops.export_scene.gltf(filepath=str(out/(slug+'.glb')),export_format='GLB',use_selection=True,export_apply=True)
 scene=bpy.context.scene;scene.world=bpy.data.worlds.new('Soft studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.9,.93,.91,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
 floor=material('Studio ivory',(.92,.93,.90),.9);box('Studio floor',(0,0,-.04),(200,200,.07),0,floor)
 for loc,energy,size in [((-3,-4,5),450,4),((4,-1,3),220,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.7))
 bpy.ops.object.camera_add(location=(2.4,-4,2.05));cam=bpy.context.object;aim(cam,(0,0,height*.47));cam.data.type='ORTHO';cam.data.ortho_scale=max(console_w,height)*1.65;scene.camera=cam
 scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=4
 scene.render.resolution_x=1100;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
 scene.render.image_settings.file_format='PNG';scene.render.filepath=str(out/(slug+'.png'))
 bpy.ops.wm.save_as_mainfile(filepath=str(out/(slug+'.blend')));bpy.ops.render.render(write_still=True)
 item={'id':slug,'name':name,'category':'TVs & media','description':f'Original {inches}-inch TV concept with '+('a sculptural wooden easel stand.' if easel else 'an integrated slatted media console and concealed equipment shelf.'),'materials':['Anti-glare glass','Graphite aluminum','Natural oak' if inches==43 else 'Walnut'],'dimensions_m':dimensions,'dimensions_note':'Original Homebuddy design. TV and stand are one movable model; dimensions describe the whole assembly.','source':{'retailer':'Homebuddy','url':'','photo_url':'','article_number':'','checked_date':'2026-09-08'},'provenance':'Original Homebuddy model and original geometric screen artwork. Not a retail product; no purchase price.'}
 (out/'item.json').write_text(json.dumps(item,indent=2));print('TV_COMPLETE',slug,dimensions,flush=True)

if '--easel-only' not in sys.argv:create('tv-studio-43','Studio 43″ TV · oak console',43,1.12,.34,1.15,(.63,.48,.31))
if '--easel-only' not in sys.argv:create('tv-cinema-65','Cinema 65″ TV · walnut console',65,1.8,.40,1.38,(.34,.23,.16))
create('tv-easel-55','Gallery 55″ TV · easel stand',55,1.24,.64,1.50,(.50,.35,.22),True)
