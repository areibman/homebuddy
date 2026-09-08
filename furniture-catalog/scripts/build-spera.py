import bpy,json,math,pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
plan=json.load(open(ROOT/'app/decorate/plan.json'));items={i['id']:i for i in json.load(open(ROOT/'app/catalog.json'))}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def cube(name,x,y,z,w,d,h,color):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-y,z));o=bpy.context.object;o.name=name;o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 m=bpy.data.materials.new(name);m.diffuse_color=(*tuple(int(color[i:i+2],16)/255 for i in (1,3,5)),1);o.data.materials.append(m);return o
for x,z,w,d in plan['floors']:cube('Floor',x+w/2,z+d/2,-.13,w,d,.25,'#d3b690')
# Export scripts/export-architecture.mjs first: reuse the viewer's exact fixture/window geometry.
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/plans/spera-architecture.glb'))
for f in plan['furniture']:
 i=items[f['id']];before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public'/i['files']['glb'].split('?')[0].lstrip('/')));objs=set(bpy.data.objects)-before
 meshes=[o for o in objs if o.type=='MESH'];coords=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box];low=Vector(tuple(min(v[a] for v in coords) for a in range(3)));high=Vector(tuple(max(v[a] for v in coords) for a in range(3)))
 parent=bpy.data.objects.new(i['name'],None);bpy.context.collection.objects.link(parent)
 for o in objs:
  if o.parent not in objs:o.parent=parent
 size=high-low;dim=i['dimensions_m'];scale=Vector((dim['width']/size.x,dim['depth']/size.y,dim['height']/size.z));parent.scale=scale
 offset=Vector((-(low.x+high.x)/2*scale.x,-(low.y+high.y)/2*scale.y,-low.z*scale.z));parent.location=offset
 anchor=bpy.data.objects.new('Placed '+i['name'],None);bpy.context.collection.objects.link(anchor);parent.parent=anchor;anchor.location=(f['x'],-f['z'],.01);anchor.rotation_euler.z=f['r']
bpy.ops.object.camera_add(location=(13,-18,15));camera=bpy.context.object;camera.rotation_euler=(Vector((3.1,-4.3,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=14;bpy.context.scene.camera=camera
bpy.ops.object.light_add(type='AREA',location=(0,-2,12));bpy.context.object.data.energy=2200;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=8
bpy.context.scene.world.color=(.4,.4,.4);bpy.context.scene['source']='Downloaded Spera Plan E marketing plan; approximate reconstruction. Furniture GLBs from existing local catalog.'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'public/plans/spera-furnished.blend'))
print('SCENE_OK furniture='+str(len(plan['furniture']))+' meshes='+str(len([o for o in bpy.data.objects if o.type=='MESH'])))
