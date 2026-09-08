import bpy,os
ROOT=os.path.dirname(os.path.abspath(__file__))
for slug in ['sofa','dresser','coffee-table','bed','nightstand','armchair','bookshelf','dining-table','floor-lamp']:
 path=os.path.join(ROOT,slug,slug+'.blend');bpy.ops.wm.open_mainfile(filepath=path);g=bpy.data.node_groups.get('glTF Material Output')
 if g:
  names={s.name for s in g.interface.items_tree}
  for name,value in [('Thickness',0),('Dispersion',0),('Iridescence Factor',0),('Iridescence Thickness Minimum',100)]:
   if name not in names:g.interface.new_socket(name=name,in_out='INPUT',socket_type='NodeSocketFloat').default_value=value
 bpy.ops.wm.save_as_mainfile(filepath=path)
print('COMPATIBLE SETTINGS GROUPS',flush=True)
