import bpy, math, os, json
from mathutils import Vector
O=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.unit_settings.system='METRIC'
def mat(n,c,rough=.75):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;return m
wood=mat('Natural pale oak',(.52,.32,.15),.48)
n=wood.node_tree.nodes;l=wood.node_tree.links;p=n.get('Principled BSDF');tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=3;tex.inputs['Detail'].default_value=3;co=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(2,65,5);l.new(co.outputs['Generated'],mapping.inputs[0]);l.new(mapping.outputs[0],tex.inputs['Vector']);r=n.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(.27,.13,.044,1);r.color_ramp.elements[1].color=(.67,.46,.24,1);l.new(tex.outputs['Fac'],r.inputs[0]);l.new(r.outputs[0],p.inputs['Base Color'])
def fabric(n,c):
 m=mat(n,c);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Sheen Weight'].default_value=.22;t=m.node_tree.nodes.new('ShaderNodeTexNoise');t.inputs['Scale'].default_value=180;b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.16;b.inputs['Distance'].default_value=.0007;m.node_tree.links.new(t.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs[0],p.inputs['Normal']);return m
linen=fabric('Warm ivory linen',(.82,.77,.66));sage=fabric('Eucalyptus green duvet',(.25,.34,.27));head=fabric('Oatmeal headboard weave',(.57,.51,.40));thread=mat('Matching sage piping',(.19,.25,.20));dark=mat('Recessed shadow plinth',(.075,.052,.032))
def box(n,loc,dim,rad,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);b=o.modifiers.new('Crafted soft edges','BEVEL');b.width=rad;b.segments=6;bpy.ops.object.modifier_apply(modifier=b.name);o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o
def line(n,pts,m,r=.002):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);c.materials.append(m)
box('Recessed floating plinth',(0,0,.12),(1.45,1.72,.24),.025,dark)
box('Solid oak platform',(0,0,.28),(1.91,2.23,.16),.025,wood)
box('Solid oak headboard surround',(0,1.075,.72),(1.91,.12,1.18),.045,wood)
box('Upholstered inset headboard',(0,.998,.86),(1.75,.105,.78),.075,head)
for x in [-.44,0,.44]:line('Headboard tailored vertical channel',[(x,.939,.54),(x,.939,1.19)],linen,.0014)
box('Queen mattress',(0,-.025,.485),(1.60,2.02,.25),.085,linen)
# Duvet rounded volume plus hem piping, with folded upper edge.
box('Puffy eucalyptus duvet',(0,-.35,.638),(1.73,1.39,.125),.058,sage)
box('Turned back duvet cuff',(0,.25,.692),(1.70,.30,.068),.030,sage)
line('Duvet front stitched hem',[(-.79,-1.044,.64),(.79,-1.044,.64)],thread,.002)
for x in [-.861,.861]:line('Duvet side tailored hem',[(x,-.96,.63),(x,.22,.63)],thread,.0018)
for x in [-.40,.40]:
 p=box('Ivory sleeping pillow',(x,.64,.692),(.73,.42,.18),.087,linen);p.rotation_euler.x=math.radians(7)
 line('Pillow front seam',[(x-.28,.431,.682),(x+.28,.431,.682)],head,.0012)
# Bedside runner provides a visibly folded textile layer across foot.
throw=fabric('Sand woven bed runner',(.57,.42,.27))
box('Sand runner across foot',(0,-.78,.715),(1.78,.31,.035),.016,throw)
for xx in [-.88,.88]:box('Runner hanging edge',(xx,-.78,.57),(.022,.31,.29),.01,throw)
models=list(s.objects);col=bpy.data.collections.new('Alder bed | editable components');s.collection.children.link(col)
for o in models:
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o)
bpy.ops.object.select_all(action='DESELECT')
for o in models:o.select_set(True)
bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH')
bpy.ops.export_scene.gltf(filepath=O+'/bed.glb',export_format='GLB',use_selection=True)
g=mat('Studio ivory',(.78,.75,.69));bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.name='Studio floor';bpy.context.object.data.materials.append(g)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,pow,size in [((-3,-4,5),550,4),((4,0,4),400,3),((0,4,5),450,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=pow;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.5))
bpy.ops.object.camera_add(location=(3.3,-4.5,3.1));cam=bpy.context.object;aim(cam,(0,0,.55));cam.data.type='ORTHO';cam.data.ortho_scale=3.85;s.camera=cam
s.world=bpy.data.worlds.new('Studio world');s.world.color=(.3,.3,.3);s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.render.filepath=O+'/bed.png';s.view_settings.view_transform='AgX'
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.color_type='MATERIAL'
s['Design']='Original Alder platform bed; concept visualization, not manufacturer CAD.'
bpy.ops.wm.save_as_mainfile(filepath=O+'/bed.blend');bpy.ops.render.render(write_still=True)
json.dump({'id':'bed','name':'Alder Platform Bed','category':'Beds','description':'A contemporary queen platform bed in pale oak, with an oatmeal upholstered headboard, eucalyptus duvet, ivory pillows and a sand runner.','dimensions_m':{'width':1.91,'depth':2.23,'height':1.31},'files':{'blend':'bed.blend','glb':'bed.glb','preview':'bed.png'},'provenance':'Original procedural design created for this catalog; conceptual proportions, not manufacturer CAD.'},open(O+'/item.json','w'),indent=2)
