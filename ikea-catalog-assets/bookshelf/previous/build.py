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

# BILLY 80 x 28 x 202 cm reference recreation, 5 internal shelves and plinth.
white=mat('White paper foil finish',(.88,.875,.84),.62)
backwhite=mat('White painted fiberboard',(.84,.84,.81),.72)
for x in [-.391,.391]:box('BILLY full-height side',(x,0,1.01),(.018,.28,2.02),.0009,white)
box('BILLY top',(0,0,2.011),(.764,.28,.018),.0008,white)
box('BILLY bottom shelf',(0,-.002,.079),(.764,.276,.018),.0008,white)
box('BILLY recessed plinth',(0,-.125,.035),(.764,.018,.07),.0007,white)
box('BILLY thin back panel',(0,.136,1.04),(.764,.008,1.936),.0005,backwhite)
for index,z in enumerate([.403,.723,1.043,1.363,1.683]):
 box('BILLY '+('fixed middle shelf' if index==2 else 'adjustable shelf '+str(index+1)),(0,-.002,z),(.764,.264,.018),.0008,white)
# Small shelf-adjustment pin bores represented as recessed dark dots.
holemat=mat('Shelf peg bore shadow',(.42,.42,.40),.9)
for x in [-.3818,.3818]:
 for y in [-.093,.093]:
  for i in range(55):
   z=.16+i*.032
   bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.0017,depth=.0004,location=(x,y,z),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='Shelf adjustment bore';o.data.materials.append(holemat)
models=list(s.objects);bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH')
# Measured dimensions including all furniture components.
coords=[o.matrix_world@Vector(c) for o in s.objects for c in o.bound_box];dims={key:round(max(v[i] for v in coords)-min(v[i] for v in coords),3) for i,key in enumerate(['width','depth','height'])}
bpy.ops.export_scene.gltf(filepath=OUT+'/bookshelf.glb',export_format='GLB',use_selection=True)
floor=mat('Ivory studio',(.79,.765,.71),.85);bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.data.materials.append(floor)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((-3,-4,5),450,4),((3,-1,3),210,3),((1,4,4),400,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.4))
bpy.ops.object.camera_add(location=(2.0,-4.4,2.5));cam=bpy.context.object;aim(cam,(0,0,1.01));cam.data.type='ORTHO';cam.data.ortho_scale=2.97;s.camera=cam
s.world=bpy.data.worlds.new('Warm studio environment');s.world.color=(.3,.3,.3);s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.render.filepath=OUT+'/bookshelf.png';s.view_settings.view_transform='AgX'
s['Design']='Unofficial BILLY recreation from IKEA product reference.'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/bookshelf.blend');bpy.ops.render.render(write_still=True)
json.dump({'id':'bookshelf','name':'BILLY Bookcase — white','category':'Bookcases','description':'Reference-based recreation of IKEA’s tall white BILLY bookcase with five interior shelves, a recessed plinth and adjustable shelf holes.','dimensions_m':{'width':.8,'depth':.28,'height':2.02},'materials':['Particleboard with white paper foil','Painted fiberboard backing','Plastic edging'],'source':{'retailer':'IKEA','url':'https://www.ikea.com/us/en/p/billy-bookcase-white-20522046/','photo_url':'https://www.ikea.com/us/en/images/products/billy-bookcase-white__1590272_pe1038911_s5.jpg','article_number':'205.220.46','checked_date':'2026-09-08'},'files':{'blend':'bookshelf.blend','glb':'bookshelf.glb','preview':'bookshelf.png'},'provenance':'Unofficial simplified recreation based on linked IKEA product. Photo belongs to IKEA.'},open(OUT+'/item.json','w'),indent=2)
