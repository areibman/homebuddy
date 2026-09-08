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

# Rounded solid walnut cabinet, floating drawer face and open lower shelf.
box('Rounded walnut top',(0,0,.565),(.57,.44,.045),.021,wood)
box('Solid walnut lower shelf',(0,0,.18),(.55,.42,.035),.016,wood)
for x in [-.265,.265]:
 box('Rounded walnut case side',(x,0,.374),(.04,.44,.4),.019,wood)
box('Recessed walnut rear panel',(0,.201,.37),(.50,.017,.37),.008,wood)
box('Drawer support shelf',(0,.005,.397),(.5,.39,.025),.010,wood)
inside=mat('Dark walnut drawer interior',(.07,.023,.009),.6)
box('Drawer shadow reveal',(0,-.198,.477),(.5,.022,.135),.004,inside)
box('Inset walnut drawer front',(0,-.217,.478),(.492,.027,.125),.013,wood)
# Small projecting brushed-brass horizontal bar pull and stand-offs.
for x in [-.067,.067]:beam('Brass pull stand-off',(x,-.235,.482),(x,-.264,.482),.011,.011,brass)
beam('Rounded brass drawer pull',(-.085,-.269,.482),(.085,-.269,.482),.014,.014,brass)
for x in [-.222,.222]:
 for y in [-.16,.16]:
  beam('Short splayed walnut foot',(x*1.08,y*1.12,.018),(x,y,.178),.042,.042,wood)
  # Flat brass foot ferrule.
  box('Brass foot cap',(x*1.08,y*1.12,.016),(.044,.044,.032),.009,brass)
models=list(s.objects);bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH')
# Measured dimensions including all furniture components.
coords=[o.matrix_world@Vector(c) for o in s.objects for c in o.bound_box];dims={key:round(max(v[i] for v in coords)-min(v[i] for v in coords),3) for i,key in enumerate(['width','depth','height'])}
bpy.ops.export_scene.gltf(filepath=OUT+'/nightstand.glb',export_format='GLB',use_selection=True)
floor=mat('Ivory studio',(.79,.765,.71),.85);bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.data.materials.append(floor)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((-3,-4,5),450,4),((3,-1,3),210,3),((1,4,4),400,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.4))
bpy.ops.object.camera_add(location=(1.6,-2.7,1.5));cam=bpy.context.object;aim(cam,(0,0,.29));cam.data.type='ORTHO';cam.data.ortho_scale=1.07;s.camera=cam
s.world=bpy.data.worlds.new('Warm studio environment');s.world.color=(.3,.3,.3);s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.render.filepath=OUT+'/nightstand.png';s.view_settings.view_transform='AgX'
s['Design']='Original Cove walnut nightstand; concept model, not manufacturer CAD.'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/nightstand.blend');bpy.ops.render.render(write_still=True)
json.dump({'id':'nightstand','name':'Cove Nightstand','category':'Nightstands','description':'Rounded walnut bedside cabinet with an inset drawer, brushed-brass bar pull, open lower shelf and short splayed legs.','dimensions_m':dims,'materials':['Oiled walnut','Brushed brass'],'files':{'blend':'nightstand.blend','glb':'nightstand.glb','preview':'nightstand.png'},'provenance':'Original concept design created for this virtual catalog. Not a branded product or manufacturer CAD; materials and dimensions are illustrative.'},open(OUT+'/item.json','w'),indent=2)
