import bpy,math,os,json
from mathutils import Vector
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.unit_settings.system='METRIC'
def lin(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def mat(name,srgb,rough=.65):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=tuple(lin(x) for x in srgb)+(1,);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=m.diffuse_color;p.inputs['Roughness'].default_value=rough;return m
white=mat('Neutral white paper foil',(.95,.95,.95),.65);backwhite=mat('White painted fiberboard',(.94,.94,.94),.75);hole=mat('Recessed shelf holes',(.43,.43,.43),.95)
def finish(o,ma,r=.0006):
 bpy.context.view_layer.objects.active=o;o.select_set(True);o.data.materials.append(ma);m=o.modifiers.new('Submillimeter edge easing','BEVEL');m.width=r;m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name);o.modifiers.new('Flat panel face normals','WEIGHTED_NORMAL');return o
def box(name,loc,size,ma=white,r=.0006):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,ma,r)
# Full-height sides include a shallow rear skirting notch, visible in the source.
for sign in [-1,1]:
 yz=[(-.14,0),(.104,0),(.104,.095),(.14,.11),(.14,2.02),(-.14,2.02)]
 verts=[(sign*.391+dx,y,z) for dx in [-.009,.009] for y,z in yz];N=len(yz);faces=[tuple(reversed(range(N))),tuple(range(N,N*2))]
 for i in range(N):j=(i+1)%N;faces.append((i,j,j+N,i+N))
 me=bpy.data.meshes.new('Side panel with skirting relief');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('BILLY 18mm side panel',me);bpy.context.collection.objects.link(o);finish(o,white)
box('Top panel',(0,0,2.011),(.764,.28,.018))
box('Bottom shelf above plinth',(0,-.006,.079),(.764,.268,.018))
box('Recessed front plinth',(0,-.119,.035),(.764,.018,.07))
box('Thin full white back',(0,.136,1.04),(.764,.008,1.936),backwhite,.0004)
# Reference shelf spacing: 5 shelves, 6 open compartments.
for i,z in enumerate([.404,.724,1.044,1.364,1.684]):box('Fixed center shelf' if i==2 else 'Adjustable white shelf '+str(i+1),(0,-.006,z),(.764,.268,.018))
# Two regular vertical bore rows inside each side, 32mm pitch.
for x in [-.3817,.3817]:
 for y in [-.104,.082]:
  for i in range(55):
   z=.159+i*.032
   bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.00165,depth=.00035,location=(x,y,z),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='Small 3.3mm shelf adjustment bore';o.data.materials.append(hole)
bpy.ops.object.select_all(action='DESELECT');bores=[o for o in s.objects if o.name.startswith('Small 3.3mm')]
for o in bores:o.select_set(True)
bpy.context.view_layer.objects.active=bores[0];bpy.ops.object.join();bpy.context.object.name='Shelf adjustment holes — combined mesh'
models=list(s.objects);bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH');bpy.ops.export_scene.gltf(filepath=OUT+'/bookshelf.glb',export_format='GLB',use_selection=True)
# Catalog-like lighting: neutral white floor and wall, gentle shadow cast right.
floormat=mat('White studio floor',(.99,.99,.99),.8);bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.name='Studio floor';bpy.context.object.is_shadow_catcher=True;bpy.context.object.data.materials.append(floormat)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((-3,-4,6),850,4),((3,-2,3),180,3),((0,3,5),200,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;aim(o,(0,0,1))
bpy.ops.object.camera_add(location=(2.5,-7,1.70));cam=bpy.context.object;aim(cam,(0,0,1.01));cam.data.type='ORTHO';cam.data.ortho_scale=3.05;s.camera=cam
s.world=bpy.data.worlds.new('Neutral white environment');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.7
s.render.engine='CYCLES';s.cycles.samples=4;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=.6
s.render.film_transparent=False
nt=s.world.node_tree;lp=nt.nodes.new('ShaderNodeLightPath');mix=nt.nodes.new('ShaderNodeMixShader');camera_bg=nt.nodes.new('ShaderNodeBackground');camera_bg.inputs[0].default_value=(1,1,1,1);camera_bg.inputs[1].default_value=4;nt.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]);nt.links.new(nt.nodes['Background'].outputs[0],mix.inputs[1]);nt.links.new(camera_bg.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],nt.nodes['World Output'].inputs[0])
s['Reference']='https://www.ikea.com/us/en/p/billy-bookcase-white-20522046/';s.render.filepath=OUT+'/bookshelf.png';bpy.ops.wm.save_as_mainfile(filepath=OUT+'/bookshelf.blend');bpy.ops.render.render(write_still=True)
for o in models:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=OUT+'/bookshelf.glb');s.render.filepath=OUT+'/bookshelf-roundtrip.png';bpy.ops.render.render(write_still=True)
meta=json.load(open(OUT+'/item.json'));meta['description']='Unofficial recreation of the white BILLY bookcase with five interior shelves, thin panels, a recessed plinth, rear skirting cutouts and shelf adjustment holes.';meta['validation']={'roundtrip_preview':'bookshelf-roundtrip.png','review':'review.md','color_space':'Neutral white sRGB converted to linear PBR base color'};json.dump(meta,open(OUT+'/item.json','w'),indent=2)
