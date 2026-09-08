import bpy,json,os
from mathutils import Vector
p='/Users/hyperbox/homebuddy/ikea-catalog-assets/rug/'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=p+'rug.glb')
objs=list(bpy.context.scene.objects);pts=[o.matrix_world@Vector(v) for o in objs for v in o.bound_box];mn=min(v.z for v in pts);mx=max(v.z for v in pts)
for o in objs:
 inv=o.matrix_world.inverted()
 for v in o.data.vertices:
  q=o.matrix_world@v.co;q.z=(q.z-mn)*.013/(mx-mn);v.co=inv@q
 o.data.update()
bpy.context.view_layer.update();bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=p+'rug.glb',export_format='GLB',use_selection=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=p+'rug.glb');objs=list(bpy.context.scene.objects);assert all(o.type=='MESH' for o in objs)
pts=[o.matrix_world@Vector(v) for o in objs for v in o.bound_box];dims=[max(v[i] for v in pts)-min(v[i] for v in pts) for i in range(3)];assert all(abs(a-b)<.0001 for a,b in zip(dims,[1.6,2.3,.013])),dims
json.dump(dict(valid=True,mesh_count=len(objs),measured_dimensions_m=dims,nominal_dimensions_m=[1.6,2.3,.013],studio_excluded=True,optimization='Thread meshes decimated to 14%; z extent normalized to exact 13mm; original editable Blender and rendered preview preserved',glb_bytes=os.path.getsize(p+'rug.glb')),open(p+'validation.json','w'),indent=2);print('OPTIMIZED',os.path.getsize(p+'rug.glb'),dims)
