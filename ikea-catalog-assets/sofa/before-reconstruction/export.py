import bpy,os,json,shutil
O=os.path.dirname(os.path.abspath(__file__));bpy.ops.wm.open_mainfile(filepath='/Users/hyperbox/homebuddy/sofa-kivik/kivik-sofa.blend')
bpy.ops.object.select_all(action='DESELECT');col=bpy.data.collections['KIVIK | editable sofa parts']
for o in col.objects:o.select_set(True)
bpy.context.view_layer.objects.active=next(iter(col.objects));bpy.ops.object.convert(target='MESH')
bpy.context.scene['Reference']='https://www.ikea.com/us/en/p/kivik-sofa-gunnared-beige-s89499703/'
bpy.ops.export_scene.gltf(filepath=O+'/sofa.glb',export_format='GLB',use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=O+'/sofa.blend');shutil.copy2('/Users/hyperbox/homebuddy/sofa-kivik/kivik-preview.png',O+'/sofa.png')
json.dump({'id':'sofa','name':'KIVIK Sofa','category':'Sofas','description':'Gunnared beige upholstery with wide low arms and two deep seat cushions.','materials':['Gunnared beige polyester','Upholstered frame'],'dimensions_m':{'width':2.28,'depth':.95,'height':.83},'source':{'retailer':'IKEA','url':bpy.context.scene['Reference'],'photo_url':'https://www.ikea.com/us/en/images/products/kivik-sofa-gunnared-beige__1577008_pe1032893_s5.jpg?f=s','article_number':'894.997.03','checked_date':'2026-09-08'},'files':{'blend':'sofa.blend','glb':'sofa.glb','preview':'sofa.png'},'provenance':'Unofficial simplified recreation based on linked IKEA product. Photo belongs to IKEA.'},open(O+'/item.json','w'),indent=2)
