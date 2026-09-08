import bpy
p='/Users/hyperbox/homebuddy/ikea-catalog-assets/dining-table/'
bpy.ops.wm.open_mainfile(filepath=p+'dining-table.blend')
sc=bpy.context.scene
for o in sc.objects:
 if o.type=='LIGHT':o.data.energy*=.5
math=sc.world.node_tree.nodes.get('Math');math.inputs[1].default_value=.55;math.inputs[2].default_value=.45
sc.render.resolution_percentage=50;sc.cycles.samples=16;sc.render.filepath=p+'light-test.png';bpy.ops.render.render(write_still=True)
