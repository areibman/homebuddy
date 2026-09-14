"""Export the restyled furnished Blender scenes, using the same geometry and photo crops as the viewer."""
import bpy,json,math,pathlib,sys
from mathutils import Vector
R=pathlib.Path(__file__).resolve().parents[1];slug='flowhouse-wb1';p=json.loads((R/'app/decorate/homes/flowhouse-wb1/plan.json').read_text());layouts=p['layouts'];items={i['id']:i for i in json.loads((R/'app/catalog.json').read_text())}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.76,.83,.9,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
scene.view_settings.view_transform='AgX'
materials={}
for name,color in {'floor':(.56,.39,.23,1),'wall':(.88,.86,.81,1),'ceiling':(.94,.93,.90,1),'tile':(.69,.70,.66,1),'backsplash':(.86,.84,.79,1),'stone':(.91,.88,.81,1)}.items():
 m=bpy.data.materials.new('Proposed finish · '+name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color;bs.inputs['Roughness'].default_value=.72 if name=='floor' else .48;materials[name]=m

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
import_arch(slug+'-architecture.glb',full);import_arch(slug+'-cutaway.glb',cut)
# Union the cutaway walls so coplanar caps at corners do not render black.
wall_parts=[o for o in cut.objects if o.type=='MESH' and o.name.lower().startswith('wall')]
if wall_parts:
 target=wall_parts[0];operands=bpy.data.collections.new('Temporary wall union');scene.collection.children.link(operands)
 for o in wall_parts[1:]:operands.objects.link(o)
 bpy.context.view_layer.objects.active=target;target.select_set(True)
 modifier=target.modifiers.new('Continuous wall junctions','BOOLEAN');modifier.operation='UNION';modifier.solver='EXACT';modifier.operand_type='COLLECTION';modifier.collection=operands
 bpy.ops.object.modifier_apply(modifier=modifier.name)
 for o in wall_parts[1:]:bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.collections.remove(operands);target.select_set(False)
full.hide_render=True;full.hide_viewport=True
floors=collection('Oak floors and marble bathroom floors')
def mesh_object(name,verts,faces,mat,col):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);me.materials.append(mat);uv=me.uv_layers.new()
 for face in me.polygons:
  for li in face.loop_indices:
   co=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(co.x/.75,-co.y/.85)
 return o
for (x,z,w,d),finish in zip(p['floors'],p.get('floorFinishes',['carpet' if z==0 else 'tile' if x==3.8 else 'floor' for x,z,w,d in p['floors']])):mesh_object('Floor · '+finish,[(x,-z,0),(x+w,-z,0),(x+w,-z-d,0),(x,-z-d,0)],[(0,3,2,1)],materials[finish],floors)
ceiling=collection('Ceiling · show for interior views');ceiling.hide_render=True;ceiling.hide_viewport=True
mesh_object('Continuous white ceiling',[(x,-z,p['height']) for x,z in p['interiorFootprint']],[tuple(range(len(p['interiorFootprint'])))],materials['ceiling'],ceiling)
# A solid foundation under the entire traced polygon, plus finished edge faces.
foot=p['footprint'];n=len(foot);verts=[(x,-z,h) for h in [-.22,-.005] for x,z in foot];faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh_object('Continuous foundation',verts,faces,materials['floor'],floors)
# Normalize catalog geometry exactly as the browser does, then reuse templates.
cache=collection('Catalog templates · hidden');cache.hide_render=True;cache.hide_viewport=True
templates={}
for id in set(f['id'] for layout in layouts for f in layout['furniture']):
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
placements=collection('Furniture · IKEA and Homebuddy staging')
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
bpy.ops.object.camera_add(location=(19,-24,24));cam=bpy.context.object;cam.name='Isometric overview';put(cam,lighting);cam.rotation_euler=(Vector((3.8,-5.2,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=16.5;scene.camera=cam
scene['source']=p['source']['url'];scene['reconstruction_notes']=p['source']['note'];scene['furniture_note']='Proposed catalog staging. Enable full-height architecture and ceiling for interior views.'
for layout in layouts:
 stage(layout);scene['layout']=layout['name'];bpy.ops.file.pack_all()
 bpy.ops.wm.save_as_mainfile(filepath=str(R/f"public/plans/{slug}-{layout['id']}.blend"))
 scene.render.filepath=str(R/f"public/plans/{slug}-{layout['id']}.png");bpy.ops.render.render(write_still=True)
print('FLOWHOUSE_SCENES_COMPLETE',slug)
