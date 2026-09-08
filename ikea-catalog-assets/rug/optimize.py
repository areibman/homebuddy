import bpy, os,json
from mathutils import Vector
p='/Users/hyperbox/homebuddy/ikea-catalog-assets/rug/'
bpy.ops.wm.open_mainfile(filepath=p+'rug.blend')
bpy.ops.object.select_all(action='DESELECT')
objs=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or o.name=='Studio floor':continue
 objs.append(o)
 if o.name.startswith('Jute warp') or o.name.startswith('Jute weft'):
  bpy.context.view_layer.objects.active=o
  m=o.modifiers.new('Browser thread simplification','DECIMATE');m.ratio=.14
  bpy.ops.object.modifier_apply(modifier=m.name)
 o.select_set(True)
bpy.ops.export_scene.gltf(filepath=p+'rug.glb',export_format='GLB',use_selection=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=p+'rug.glb')
objects=list(bpy.context.scene.objects);assert all(o.type=='MESH' for o in objects)
pts=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box];dims=[max(v[i] for v in pts)-min(v[i] for v in pts) for i in range(3)]
assert all(abs(a-b)<.0001 for a,b in zip(dims,[1.6,2.3,.013])),dims
json.dump(dict(valid=True,mesh_count=len(objects),measured_dimensions_m=dims,nominal_dimensions_m=[1.6,2.3,.013],studio_excluded=True,optimization='Thread meshes decimated to 14%; original editable Blender and rendered preview preserved',glb_bytes=os.path.getsize(p+'rug.glb')),open(p+'validation.json','w'),indent=2)
print('OPTIMIZED',os.path.getsize(p+'rug.glb'),dims)
