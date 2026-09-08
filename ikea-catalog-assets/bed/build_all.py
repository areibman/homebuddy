import bpy,os,json,math
from mathutils import Vector
BASE='/Users/hyperbox/homebuddy/ikea-catalog-assets'
configs=[('bed','MALM Bed frame, white, Queen','Beds',(66.125,83.125,39.375),'199.316.05','malm-bed-frame-white-s19931605',['Particleboard','Fiberboard','Acrylic paint','Galvanized steel']),('dresser','VIHALS 6-drawer dresser, white','Storage',(55.125,18.5,29.5),'304.901.15','vihals-6-drawer-dresser-white-anchor-unlock-function-30490115',['Particleboard','Acrylic paint','Fiberboard']),('nightstand','HEMNES Nightstand, white stain','Nightstands',(18.125,13.75,27.5),'202.004.56','hemnes-nightstand-white-stain-20200456',['Solid pine','White stain','Clear acrylic lacquer','Fiberboard'])]
def mat(n,c,r=.55):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=r;return m
def box(n,loc,dim,m,r=.001):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);b=o.modifiers.new('Fine edge','BEVEL');b.width=r;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name);o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');o.data.materials.append(m);return o
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for slug,name,cat,inches,art,urltail,mats in configs:
 bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.unit_settings.system='METRIC';W,D,H=[v*.0254 for v in inches];white=mat('IKEA white finish',(.83,.835,.815));shadow=mat('Reveals',(.20,.20,.19));metal=mat('Hardware',(.36,.37,.37),.3)
 if slug=='bed':
  box('MALM full-width headboard',(0,D/2-.018,H/2),(W,.036,H),white)
  box('MALM low footboard',(0,-D/2+.018,.381/2),(W,.036,.381),white)
  for x in [-W/2+.035,W/2-.035]:box('MALM elevated side rail',(x,0,.295),(.07,D-.072,.172),white)
  box('SKORVA center beam',(0,0,.267),(.048,D-.074,.05),metal)
  mattress=mat('Illustrative white mattress',(.94,.935,.92),.9)
  box('Illustrative mattress - sold separately',(0,0,.465),(59.875*.0254,79.5*.0254,.24),mattress,.035)
 elif slug=='dresser':
  box('VIHALS top',(0,0,H-.01),(W,D,.02),white)
  box('VIHALS base',(0,0,.026),(W,D,.018),white)
  for x in [-W/2+.009,W/2-.009]:box('VIHALS side panel',(x,.005,H/2),(.018,D-.01,H-.036),white)
  box('Back',(0,D/2-.004,H/2),(W-.036,.008,H-.04),white)
  box('Dark drawer reveals',(0,-D/2+.025,H/2),(W-.036,.014,H-.062),shadow)
  # The two lower drawers are visibly taller than each of the upper pairs.
  for row,(z0,z1) in enumerate([(.04,.325),(.329,.538),(.542,H-.027)]):
   for col in [-1,1]:
    x=col*(W-.024)/4;cw=(W-.032)/2
    box('VIHALS drawer front '+str(row)+str(col),(x,-D/2+.009,(z0+z1)/2),(cw,.018,z1-z0),white)
    box('VIHALS small white edge pull',(x,-D/2-.006,z1-.007),(.036,.025,.009),white,.002)
  for x in [-W/2+.045,0,W/2-.045]:
   for y in [-D/2+.04,D/2-.04]:box('Low leveling foot',(x,y,.008),(.036,.03,.016),white)
 elif slug=='nightstand':
  white.name='White-stained pine'
  box('HEMNES overhanging top',(0,0,H-.009),(W,D,.018),white)
  for x in [-W/2+.046,W/2-.046]:
   for y in [-D/2+.047,D/2-.047]:box('HEMNES square leg',(x,y,(H-.018)/2),(.028,.028,H-.018),white)
  box('HEMNES lower open shelf',(0,0,.263),(W-.065,D-.07,.017),white)
  for x in [-W/2+.046,W/2-.046]:box('HEMNES upper side panel',(x,0,H-.073),(.018,D-.086,.111),white)
  box('HEMNES back apron',(0,D/2-.047,H-.073),(W-.064,.016,.11),white)
  box('HEMNES drawer front',(0,-D/2+.048,H-.072),(W-.125,.018,.105),white)
  box('HEMNES drawer bottom rail',(0,-D/2+.048,H-.136),(W-.12,.02,.019),white)
  knob=mat('Antiqued dark knob',(.055,.052,.038),.45)
  bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.009,location=(0,-D/2+.026,H-.07));o=bpy.context.object;o.name='HEMNES single round dark knob';o.scale=(1,.65,1);o.data.materials.append(knob)
 models=list(s.objects);col=bpy.data.collections.new(name+' editable furniture');s.collection.children.link(col)
 for o in models:
  for c in list(o.users_collection):c.objects.unlink(o)
  col.objects.link(o)
 bpy.ops.object.select_all(action='DESELECT')
 for o in models:o.select_set(True)
 bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH');out=BASE+'/'+slug
 bpy.ops.export_scene.gltf(filepath=out+'/'+slug+'.glb',export_format='GLB',use_selection=True)
 floor=mat('Neutral studio',(.73,.72,.69));bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.name='Studio floor';bpy.context.object.data.materials.append(floor)
 for loc,power,size in [((-3,-4,5),500,4),((4,0,4),330,3),((0,4,5),350,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;aim(o,(0,0,H*.5))
 bpy.ops.object.camera_add(location=(3,-5,2.8 if slug=='bed' else 2.1));cam=bpy.context.object;aim(cam,(0,0,H*.46));cam.data.type='ORTHO';cam.data.ortho_scale=3.4 if slug=='bed' else 2.0 if slug=='dresser' else 1.25;s.camera=cam
 s.world=bpy.data.worlds.new('Studio world');s.world.color=(.3,.3,.3);s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.render.filepath=out+'/'+slug+'.png';s.view_settings.view_transform='AgX'
 s['source']='https://www.ikea.com/us/en/p/'+urltail+'/';s['provenance']='Unofficial simplified recreation based on linked IKEA product. Photo belongs to IKEA.'
 bpy.ops.wm.save_as_mainfile(filepath=out+'/'+slug+'.blend');bpy.ops.render.render(write_still=True)
 photo=json.load(open(out+'/selected-photo.json'))['photo_url'];desc={'bed':'White Queen MALM frame with flat full-width headboard and low footboard. Mattress shown for context and sold separately.','dresser':'Wide white VIHALS with six flat-front drawers in two columns, small white edge pulls, and larger bottom drawers.','nightstand':'White-stained pine HEMNES with one drawer, a dark round knob, four square legs and an open lower shelf.'}[slug]
 data={'id':slug,'name':name,'category':cat,'description':desc,'dimensions_m':dict(zip(['width','depth','height'],[round(W,6),round(D,6),round(H,6)])),'materials':mats,'source':{'retailer':'IKEA','url':s['source'],'photo_url':photo,'article_number':art,'checked_date':'2026-09-08'},'files':{'blend':slug+'.blend','glb':slug+'.glb','preview':slug+'.png'},'provenance':s['provenance'],'dimension_note':'Converted from the published IKEA US inch dimensions; subcomponent proportions are estimated from the original catalog photo.'}
 json.dump(data,open(out+'/item.json','w'),indent=2)
 print('FINISHED',slug,flush=True)
