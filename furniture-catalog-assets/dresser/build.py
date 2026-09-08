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
# Six spacious drawers within a softly rounded oak case.
box('Oak cabinet carcass',(0,0,.57),(1.60,.47,.86),.03,wood)
shadow=mat('Drawer reveal shadow',(.09,.055,.025))
box('Recessed drawer reveals',(0,-.242,.57),(1.50,.021,.75),.005,shadow)
for col in range(2):
 for row in range(3):
  x=(-.382 if col==0 else .382);z=.305+row*.265
  box('Drawer '+str(col*3+row+1)+' solid oak front',(x,-.267,z),(.743,.053,.247),.012,wood)
  brass=mat('Brushed brass pull '+str(col*3+row+1),(.42,.27,.095),.3)
  for dx in [-.055,.055]:box('Pull standoff',(x+dx,-.308,z+.037),(.012,.035,.013),.004,brass)
  box('Slim brushed brass pull',(x,-.328,z+.037),(.14,.016,.018),.006,brass)
for x in [-.68,.68]:
 for y in [-.15,.15]:
  box('Tapered appearance oak foot',(x,y,.085),(.075,.075,.17),.014,wood)
box('Overhanging solid oak top',(0,0,1.005),(1.64,.50,.05),.02,wood)
models=list(s.objects);col=bpy.data.collections.new('Linden dresser | editable components');s.collection.children.link(col)
for o in models:
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o)
bpy.ops.object.select_all(action='DESELECT')
for o in models:o.select_set(True)
bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH')
bpy.ops.export_scene.gltf(filepath=O+'/dresser.glb',export_format='GLB',use_selection=True)
g=mat('Studio ivory',(.78,.75,.69));bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.name='Studio floor';bpy.context.object.data.materials.append(g)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,pow,size in [((-3,-4,5),550,4),((4,0,4),400,3),((0,4,5),450,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=pow;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.5))
bpy.ops.object.camera_add(location=(2.8,-4.5,2.3));cam=bpy.context.object;aim(cam,(0,0,.52));cam.data.type='ORTHO';cam.data.ortho_scale=2.35;s.camera=cam
s.world=bpy.data.worlds.new('Studio world');s.world.color=(.3,.3,.3);s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.render.filepath=O+'/dresser.png';s.view_settings.view_transform='AgX'
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.color_type='MATERIAL'
s['Design']='Original Linden six-drawer dresser; concept visualization, not manufacturer CAD.'
bpy.ops.wm.save_as_mainfile(filepath=O+'/dresser.blend');bpy.ops.render.render(write_still=True)
json.dump({'id':'dresser','name':'Linden Six-Drawer Dresser','category':'Storage','description':'A low dresser in warm natural oak with six drawers, narrow brass pulls, softened edges and raised feet.','dimensions_m':{'width':1.64,'depth':.586,'height':1.03},'materials':['Natural oak','Brushed brass'], 'files':{'blend':'dresser.blend','glb':'dresser.glb','preview':'dresser.png'},'provenance':'Original procedural design created for this catalog; conceptual proportions, not manufacturer CAD.'},open(O+'/item.json','w'),indent=2)
