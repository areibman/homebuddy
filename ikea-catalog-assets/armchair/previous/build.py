import bpy,math,os,json
from mathutils import Vector
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.unit_settings.system='METRIC'
def mat(name,c,r):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=r;return m
wood=mat('Tinted lacquer solid beech',(.042,.019,.012),.4)
p=wood.node_tree.nodes.get('Principled BSDF');n=wood.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=6;n.inputs['Detail'].default_value=3
tex=wood.node_tree.nodes.new('ShaderNodeTexCoord');v=wood.node_tree.nodes.new('ShaderNodeVectorMath');v.operation='MULTIPLY';v.inputs[1].default_value=(3,3,32);wood.node_tree.links.new(tex.outputs['Generated'],v.inputs[0]);wood.node_tree.links.new(v.outputs[0],n.inputs[0]);r=wood.node_tree.nodes.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(.019,.008,.004,1);r.color_ramp.elements[1].color=(.075,.036,.022,1);wood.node_tree.links.new(n.outputs['Fac'],r.inputs[0]);wood.node_tree.links.new(r.outputs[0],p.inputs['Base Color'])
cloth=mat('Kilanda light beige upholstery',(.56,.515,.44),.88);p=cloth.node_tree.nodes.get('Principled BSDF');p.inputs['Sheen Weight'].default_value=.3;n=cloth.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=240;b=cloth.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.23;b.inputs['Distance'].default_value=.001;cloth.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);cloth.node_tree.links.new(b.outputs[0],p.inputs['Normal'])
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

# EKENASET geometry derived from inspected IKEA product photo: thin rounded arms,
# angular front supports, two broad upholstered panels with no loose welt loops.
wood.node_tree.links.remove(p) if False else None
for sign in [-1,1]:
 x=sign*.294
 beam('EKENASET front leg',(x,-.335,.015),(x,-.25,.62),.037,.046,wood)
 beam('EKENASET rear leg',(x,.35,.015),(x,.205,.61),.039,.047,wood)
 arm=box('Slim rounded beech armrest',(x,-.018,.624),(.052,.565,.028),.013,wood)
 beam('Beech side seat rail',(x,-.275,.335),(x,.25,.308),.036,.056,wood)
box('Exposed dark beech front rail',(0,-.295,.328),(.585,.035,.058),.006,wood)
box('Rear seat cross rail',(0,.23,.318),(.585,.04,.05),.007,wood)
seat=box('Kilanda light beige fixed seat',(0,-.055,.399),(.557,.523,.111),.033,cloth);seat.rotation_euler.x=math.radians(-4)
back=box('Kilanda light beige reclined back',(0,.235,.566),(.558,.119,.437),.041,cloth);back.rotation_euler.x=math.radians(15)
# Normalize overall extents to published 64 x 78 x 76 cm while preserving assembled geometry.
bpy.context.view_layer.update()
coords=[o.matrix_world@Vector(c) for o in s.objects for c in o.bound_box];mins=[min(v[i] for v in coords) for i in range(3)];maxs=[max(v[i] for v in coords) for i in range(3)]
from mathutils import Matrix
factor=[target/(mx-mn) for target,mx,mn in zip([.64,.78,.76],maxs,mins)]
M=Matrix.Diagonal((*factor,1))
for o in list(s.objects):o.matrix_world=M@o.matrix_world
models=list(s.objects);bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH')
# Measured dimensions including all furniture components.
coords=[o.matrix_world@Vector(c) for o in s.objects for c in o.bound_box];dims={key:round(max(v[i] for v in coords)-min(v[i] for v in coords),3) for i,key in enumerate(['width','depth','height'])}
bpy.ops.export_scene.gltf(filepath=OUT+'/armchair.glb',export_format='GLB',use_selection=True)
floor=mat('Ivory studio',(.79,.765,.71),.85);bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.data.materials.append(floor)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((-3,-4,5),450,4),((3,-1,3),210,3),((1,4,4),400,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.4))
bpy.ops.object.camera_add(location=(2.1,-3.1,1.8));cam=bpy.context.object;aim(cam,(0,.015,.38));cam.data.type='ORTHO';cam.data.ortho_scale=1.43;s.camera=cam
s.world=bpy.data.worlds.new('Warm studio environment');s.world.color=(.3,.3,.3);s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.render.filepath=OUT+'/armchair.png';s.view_settings.view_transform='AgX'
s['Design']='Unofficial EKENASET recreation from IKEA catalog reference.'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/armchair.blend');bpy.ops.render.render(write_still=True)
json.dump({'id':'armchair','name':'EKENÄSET Armchair — Kilanda light beige','category':'Armchairs','description':'Reference-based recreation of IKEA’s compact beige armchair with a dark-brown beech frame and gently reclined back.','dimensions_m':{'width':.64,'depth':.78,'height':.76},'materials':['Polyester upholstery','Tinted lacquer solid beech','Foam cushioning'],'source':{'retailer':'IKEA','url':'https://www.ikea.com/us/en/p/ekenaeset-armchair-kilanda-light-beige-30533493/','photo_url':'https://www.ikea.com/us/en/images/products/ekenaeset-armchair-kilanda-light-beige__1109687_pe870153_s5.jpg','article_number':'305.334.93','checked_date':'2026-09-08'},'files':{'blend':'armchair.blend','glb':'armchair.glb','preview':'armchair.png'},'provenance':'Unofficial simplified recreation based on linked IKEA product. Photo belongs to IKEA.'},open(OUT+'/item.json','w'),indent=2)
