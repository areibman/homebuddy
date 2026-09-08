import bpy,json,os
from mathutils import Vector
for s in ['dining-table','coffee-table','rug']:
 root='/Users/hyperbox/homebuddy/ikea-catalog-assets/'+s
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=root+'/'+s+'.glb')
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert meshes;assert all(o.type=='MESH' for o in bpy.context.scene.objects)
 pts=[o.matrix_world@Vector(p) for o in meshes for p in o.bound_box];dims=[max(p[i] for p in pts)-min(p[i] for p in pts) for i in range(3)]
 j=json.load(open(root+'/item.json'));expected=list(j['dimensions_m'].values());assert all(abs(a-b)<.001 for a,b in zip(dims,expected)),(dims,expected)
 json.dump({'valid':True,'mesh_count':len(meshes),'measured_dimensions_m':dims,'nominal_dimensions_m':expected,'studio_excluded':True},open(root+'/validation.json','w'),indent=2)
 print('VALIDATED',s,dims,len(meshes))
