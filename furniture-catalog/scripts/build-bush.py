"""Export two furnished Blender scenes, using the same geometry and photo crops as the viewer."""
import bpy,json,math,pathlib,sys
from mathutils import Vector
R=pathlib.Path(__file__).resolve().parents[1];p=json.loads((R/'app/decorate/homes/bush-4101/plan.json').read_text());items={i['id']:i for i in json.loads((R/'app/catalog.json').read_text())}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.76,.83,.9,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
scene.view_settings.view_transform='AgX'
materials={}
for name in ['floor','wall','ceiling','tile','backsplash','stone']:
 m=bpy.data.materials.new('Listing photo · '+name);m.use_nodes=True;nodes=m.node_tree.nodes;bs=nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.78 if name in ['wall','ceiling','floor'] else .38
 tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(R/f'public/listings/bush-4101/textures/{name}.jpg'));tex.extension='MIRROR';m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);materials[name]=m

def collection(name):
 c=bpy.data.collections.new(name);scene.collection.children.link(c);return c
def put(o,c):
 for old in list(o.users_collection):old.objects.unlink(o)
 c.objects.link(o)
def import_arch(filename,c):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(R/'public/plans'/filename));objects=set(bpy.data.objects)-before
 for o in objects:
  put(o,c)
  if o.type=='LIGHT' and o.data.type=='POINT':o.data.energy=65;o.data.shadow_soft_size=.08
  if o.type!='MESH':continue
  name=o.name.lower()
  key='tile' if 'surface tile' in name else 'backsplash' if 'surface backsplash' in name else 'wall' if any(n in name for n in ['wall','structural pier']) else 'stone' if 'counter' in name else None
  if key:o.data.materials.clear();o.data.materials.append(materials[key])
 return objects
full=collection('Architecture · full height');cut=collection('Architecture · cutaway')
import_arch('bush-4101-architecture.glb',full);import_arch('bush-4101-cutaway.glb',cut)
full.hide_render=True;full.hide_viewport=True
floors=collection('Oak floors and marble bathroom floors')
def mesh_object(name,verts,faces,mat,col):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);me.materials.append(mat);uv=me.uv_layers.new()
 for face in me.polygons:
  for li in face.loop_indices:
   co=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(co.x/.75,-co.y/.85)
 return o
for (x,z,w,d),finish in zip(p['floors'],p['floorFinishes']):mesh_object('Floor · '+finish,[(x,-z,0),(x+w,-z,0),(x+w,-z-d,0),(x,-z-d,0)],[(0,3,2,1)],materials[finish],floors)
ceiling=collection('Ceiling · show for interior views');ceiling.hide_render=True;ceiling.hide_viewport=True
mesh_object('Continuous white ceiling',[(x,-z,p['height']) for x,z in p['footprint']],[tuple(range(len(p['footprint'])))],materials['ceiling'],ceiling)
# A solid foundation under the entire traced polygon, plus finished edge faces.
foot=p['footprint'];n=len(foot);verts=[(x,-z,h) for h in [-.22,-.005] for x,z in foot];faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh_object('Continuous foundation',verts,faces,materials['floor'],floors)
# Normalize catalog geometry exactly as the browser does, then reuse templates.
cache=collection('Catalog templates · hidden');cache.hide_render=True;cache.hide_viewport=True
templates={}
for id in set(f['id'] for layout in p['layouts'] for f in layout['furniture']):
 item=items[id];before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(R/'public'/item['files']['glb'].split('?')[0].lstrip('/')));objs=set(bpy.data.objects)-before
 coords=[o.matrix_world@Vector(c) for o in objs if o.type=='MESH' for c in o.bound_box];low=Vector([min(v[a] for v in coords) for a in range(3)]);high=Vector([max(v[a] for v in coords) for a in range(3)]);size=high-low;d=item['dimensions_m'];scale=Vector((d['width']/size.x,d['depth']/size.y,d['height']/size.z))
 # Apply normalization in world space to each mesh; retain shared materials/textures.
 parts=[]
 for o in list(objs):
  if o.type=='MESH':
   me=o.data.copy();world=o.matrix_world.copy()
   for v in me.vertices:
    co=world@v.co;v.co=((co.x-(low.x+high.x)/2)*scale.x,(co.y-(low.y+high.y)/2)*scale.y,(co.z-low.z)*scale.z)
   obj=bpy.data.objects.new(id,me);cache.objects.link(obj);parts.append(obj)
 for o in objs:bpy.data.objects.remove(o,do_unlink=True)
 templates[id]=parts
placements=collection('Furniture · proposed IKEA staging')
def stage(layout):
 for o in list(placements.objects):bpy.data.objects.remove(o,do_unlink=True)
 for f in layout['furniture']:
  anchor=bpy.data.objects.new(items[f['id']]['name'],None);placements.objects.link(anchor);anchor.location=(f['x'],-f['z'],.01);anchor.rotation_euler.z=f['r']
  for model in templates[f['id']]:
   o=model.copy();o.data=model.data;placements.objects.link(o);o.parent=anchor
lighting=collection('Lighting and cameras')
def light(name,loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;put(o,lighting)
light('Soft daylight',(4,-4,12),2400,10);light('Window fill',(16,-4,8),1700,8)
bpy.ops.object.camera_add(location=(24,-28,25));cam=bpy.context.object;cam.name='Isometric overview';put(cam,lighting);cam.rotation_euler=(Vector((6.8,-6.6,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=22.8;scene.camera=cam
scene['source']='https://333bush4101.com/';scene['reconstruction_notes']=p['source']['note'];scene['furniture_note']='Proposed staging using the existing IKEA catalog. Enable full-height architecture and ceiling for interiors.'
for layout in p['layouts']:
 stage(layout);scene['layout']=layout['name'];bpy.ops.file.pack_all()
 bpy.ops.wm.save_as_mainfile(filepath=str(R/f"public/plans/bush-4101-{layout['id']}.blend"))
 scene.render.filepath=str(R/f"public/plans/bush-4101-{layout['id']}.png")
 if '--skip-renders' not in sys.argv:bpy.ops.render.render(write_still=True)
# Eye-level kitchen render proves the full enclosure is present in exported scenes.
cut.hide_render=True;full.hide_render=False;ceiling.hide_render=False
cam.data.type='PERSP';cam.data.lens=20;cam.location=((670-99)/78,-(702-453)/78,1.55);cam.rotation_euler=(Vector(((490-99)/78,-(515-453)/78,1.35))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1500;scene.render.resolution_y=1000;scene.render.filepath=str(R/'public/plans/bush-4101-kitchen.png')
if '--skip-renders' not in sys.argv:bpy.ops.render.render(write_still=True)
print('BUSH_SCENES_COMPLETE')
