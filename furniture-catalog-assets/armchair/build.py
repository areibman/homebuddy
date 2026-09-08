import bpy,math,os,json
from mathutils import Vector
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.unit_settings.system='METRIC'
def mat(name,c,r):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=r;return m
wood=mat('Oiled dark walnut',(.145,.062,.029),.34)
p=wood.node_tree.nodes.get('Principled BSDF');n=wood.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=6;n.inputs['Detail'].default_value=3
tex=wood.node_tree.nodes.new('ShaderNodeTexCoord');v=wood.node_tree.nodes.new('ShaderNodeVectorMath');v.operation='MULTIPLY';v.inputs[1].default_value=(3,3,32);wood.node_tree.links.new(tex.outputs['Generated'],v.inputs[0]);wood.node_tree.links.new(v.outputs[0],n.inputs[0]);r=wood.node_tree.nodes.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(.055,.017,.006,1);r.color_ramp.elements[1].color=(.23,.105,.044,1);wood.node_tree.links.new(n.outputs['Fac'],r.inputs[0]);wood.node_tree.links.new(r.outputs[0],p.inputs['Base Color'])
cloth=mat('Burnt sienna woven upholstery',(.47,.115,.047),.88);p=cloth.node_tree.nodes.get('Principled BSDF');p.inputs['Sheen Weight'].default_value=.3;n=cloth.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=240;b=cloth.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.23;b.inputs['Distance'].default_value=.001;cloth.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);cloth.node_tree.links.new(b.outputs[0],p.inputs['Normal'])
thread=mat('Upholstery piping',(.28,.055,.021),.9);brass=mat('Recessed brass joinery',(.39,.25,.095),.29);brass.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.8

def box(name,loc,sz,r,ma):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=sz;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);m=o.modifiers.new('Crafted radiused edges','BEVEL');m.width=r;m.segments=6;bpy.ops.object.modifier_apply(modifier=m.name);o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');o.data.materials.append(ma)
 for f in o.data.polygons:f.use_smooth=True
 return o

def beam(name,a,b,width,depth,ma):
 o=box(name,(Vector(a)+Vector(b))/2,(width,depth,(Vector(b)-Vector(a)).length),.018,ma);o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o

def pipe(name,pts,ma,r=.002):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);c.materials.append(ma)

# Splayed continuous side frames and long softly contoured arm rests.
for sign in [-1,1]:
 x=sign*.365
 beam('Front splayed walnut leg',(sign*.395,-.36,.025),(x,-.235,.615),.055,.064,wood)
 beam('Rear splayed walnut leg',(sign*.395,.395,.025),(x,.25,.66),.055,.064,wood)
 arm=box('Sculpted walnut armrest',(x,.015,.635),(.093,.73,.061),.029,wood);arm.rotation_euler.x=math.radians(4)
 beam('Side support rail',(x,-.32,.325),(x,.31,.33),.052,.054,wood)
 beam('Rear backrest upright',(x,.27,.34),(x,.44,.845),.043,.05,wood)
 for y,z in [(-.255,.57),(.26,.595)]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=.010,location=(x+sign*.047,y,z));o=bpy.context.object;o.name='Flush brass dowel';o.scale=(.20,1,1);o.data.materials.append(brass)
for y in [-.28,.27]:box('Walnut seat cross rail',(0,y,.33),(.72,.052,.063),.017,wood)
for z,y in [(.44,.32),(.76,.43)]:box('Walnut back cross rail',(0,y,z),(.71,.045,.055),.015,wood)
seat=box('Deep tailored seat cushion',(0,-.045,.414),(.64,.68,.17),.070,cloth);seat.rotation_euler.x=math.radians(-4)
back=box('Reclined tailored back cushion',(0,.30,.651),(.645,.18,.48),.071,cloth);back.rotation_euler.x=math.radians(16)
# Rounded welt loops follow cushion local coordinates.
def welt(o,sx,sy,z):
 pts=[];rad=.053
 for cx,cy,start in [(sx-rad,sy-rad,0),(-sx+rad,sy-rad,90),(-sx+rad,-sy+rad,180),(sx-rad,-sy+rad,270)]:
  for j in range(13):
   t=math.radians(start+j*90/12);pt=Vector((cx+rad*math.cos(t),cy+rad*math.sin(t),z));pts.append(o.matrix_world@pt)
 pts.append(pts[0]);pipe('Tailored cushion welt',pts,thread,.0018)
bpy.context.view_layer.update();welt(seat,.307,.327,.029)
# Back panel welt loop on forward face, rotated with cushion.
pts=[]
for cx,cz,st in [(.25-.05,.165-.05,0),(-.25+.05,.165-.05,90),(-.25+.05,-.165+.05,180),(.25-.05,-.165+.05,270)]:
 for j in range(13):
  t=math.radians(st+j*90/12);pts.append(back.matrix_world@Vector((cx+.05*math.cos(t),-.09,cz+.05*math.sin(t))))
pts.append(pts[0]);pipe('Back cushion stitched welt',pts,thread,.0018)
models=list(s.objects);bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH')
# Measured dimensions including all furniture components.
coords=[o.matrix_world@Vector(c) for o in s.objects for c in o.bound_box];dims={key:round(max(v[i] for v in coords)-min(v[i] for v in coords),3) for i,key in enumerate(['width','depth','height'])}
bpy.ops.export_scene.gltf(filepath=OUT+'/armchair.glb',export_format='GLB',use_selection=True)
floor=mat('Ivory studio',(.79,.765,.71),.85);bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.data.materials.append(floor)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((-3,-4,5),450,4),((3,-1,3),210,3),((1,4,4),400,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.4))
bpy.ops.object.camera_add(location=(2.1,-3.1,1.8));cam=bpy.context.object;aim(cam,(0,.03,.43));cam.data.type='ORTHO';cam.data.ortho_scale=1.60;s.camera=cam
s.world=bpy.data.worlds.new('Warm studio environment');s.world.color=(.3,.3,.3);s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.render.filepath=OUT+'/armchair.png';s.view_settings.view_transform='AgX'
s['Design']='Original Ember lounge chair; concept model, not manufacturer CAD.'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/armchair.blend');bpy.ops.render.render(write_still=True)
json.dump({'id':'armchair','name':'Ember Lounge Chair','category':'Armchairs','description':'Sculptural walnut lounge chair with splayed timber legs, brass dowel details and deep burnt-orange upholstered cushions.','dimensions_m':dims,'files':{'blend':'armchair.blend','glb':'armchair.glb','preview':'armchair.png'},'provenance':'Original concept design created for this virtual catalog. Not a branded product or manufacturer CAD; materials and dimensions are illustrative.'},open(OUT+'/item.json','w'),indent=2)
