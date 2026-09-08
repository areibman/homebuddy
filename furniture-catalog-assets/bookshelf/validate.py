import bpy,json,os
from mathutils import Vector
for s in ['bookshelf','coffee-table']:
 root='/Users/hyperbox/homebuddy/furniture-catalog-assets/'+s
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=root+'/'+s+'.glb')
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 assert meshes
 assert all(o.type=='MESH' for o in bpy.context.scene.objects)
 points=[o.matrix_world@Vector(p) for o in meshes for p in o.bound_box]
 dims=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
 item=json.load(open(root+'/item.json'));item['dimensions_m']=dict(zip(['width','depth','height'],[round(x,4) for x in dims]));json.dump(item,open(root+'/item.json','w'),indent=2)
 print('VALIDATED',s,len(meshes),'meshes','dimensions',dims)
