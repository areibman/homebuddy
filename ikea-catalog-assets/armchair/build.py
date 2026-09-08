import bpy,math,os,json
import numpy as np
from mathutils import Vector,Matrix
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.unit_settings.system='METRIC'
def lin(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def material(name,color,rough=.65,texture=None,normal=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=tuple(lin(x) for x in color)+(1,);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=m.diffuse_color;p.inputs['Roughness'].default_value=rough
 if texture:
  im=bpy.data.images.load(OUT+'/'+texture);im.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
 if normal:
  im=bpy.data.images.load(OUT+'/'+normal);im.colorspace_settings.name='Non-Color';im.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;n=m.node_tree.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.55;m.node_tree.links.new(tex.outputs['Color'],n.inputs['Color']);m.node_tree.links.new(n.outputs['Normal'],p.inputs['Normal'])
 return m
cloth=material('Kilanda beige woven polyester',(.71,.677,.626),.9,'kilanda-basecolor.png','kilanda-normal.png');cloth.node_tree.nodes.get('Principled BSDF').inputs['Sheen Weight'].default_value=.12
wood=material('Dark brown tinted lacquer beech',(.12,.065,.045),.65,'beech-basecolor.png');wood.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.15;thread=material('Inset beige sewn seam',(.56,.527,.48),.93)
glide=material('Small gray foot glides',(.33,.33,.32),.7)
def uv_project(o,tile=.1):
 uv=o.data.uv_layers.new(name='Texture coordinates') if not o.data.uv_layers else o.data.uv_layers.active
 for poly in o.data.polygons:
  ax=max(range(3),key=lambda i:abs(poly.normal[i]));axes=[i for i in range(3) if i!=ax]
  for li in poly.loop_indices:
   co=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]/tile,co[axes[1]]/tile)
def box(name,loc,size,r,ma):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 b=o.modifiers.new('Small edge easing','BEVEL');b.width=r;b.segments=5;bpy.ops.object.modifier_apply(modifier=b.name)
 for f in o.data.polygons:f.use_smooth=True
 o.modifiers.new('Planar face normals','WEIGHTED_NORMAL');o.data.materials.append(ma);uv_project(o,.1 if ma==cloth else .75);return o
def beam(name,a,b,w,d,ma=wood,r=.0025):
 o=box(name,(Vector(a)+Vector(b))/2,(w,d,(Vector(b)-Vector(a)).length),r,ma);o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o
# Frame is rectangular timber with small eased edges, not cylinder-like poles.
for sign in [-1,1]:
 x=sign*.291
 beam('Flat rectangular front leg',(x,-.33,.006),(x,-.248,.603),.036,.041)
 beam('Flat rectangular rear leg',(x,.418,.006),(x,.20,.598),.036,.043)
 box('Long pill-edged armrest',(x,-.021,.616),(.052,.566,.026),.0128,wood)
 beam('Deep side seat rail',(x,-.276,.307),(x,.245,.317),.038,.067,r=.0038)
 box('Small front foot glide',(x,-.33,.003),(.032,.029,.006),.002,glide)
box('Deep rectangular front seat rail',(0,-.276,.319),(.577,.038,.059),.0045,wood)
box('Rear seat crosspiece',(0,.232,.325),(.576,.033,.052),.003,wood)
# Stacked rounded rectangle rings create a flat-front apron and domed top.
def cushion(name,loc,width,depth,height,ma):
 verts=[];faces=[];rings=[];N=16
 # Bottom is squarer than top, matching the fixed upholstered apron.
 specs=[(-height/2,.995,.008),(-height/2+.008,1,.013),(height*.20,1,.025),(height*.40,.97,.036),(height*.49,.82,.045),(height*.51,.45,.042)]
 for z,k,r in specs:
  sx=width*k/2;sy=depth*k/2;r=min(r,sx*.4,sy*.4);ring=[]
  for cx,cy,start in [(sx-r,sy-r,0),(-sx+r,sy-r,90),(-sx+r,-sy+r,180),(sx-r,-sy+r,270)]:
   for j in range(N):
    a=math.radians(start+j*90/N);ring.append(len(verts));verts.append((cx+r*math.cos(a),cy+r*math.sin(a),z))
  rings.append(ring)
 for a,b in zip(rings[:-1],rings[1:]):
  for i in range(len(a)):j=(i+1)%len(a);faces.append((a[i],a[j],b[j],b[i]))
 faces.append(tuple(reversed(rings[0])));faces.append(tuple(rings[-1]));me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.location=loc;o.data.materials.append(ma)
 for p in me.polygons:p.use_smooth=True
 uv_project(o,.1);o.modifiers.new('Tailored cushion normals','WEIGHTED_NORMAL');return o
seat=cushion('Fixed seat with squared lower apron',(0,-.044,.399),.558,.502,.112,cloth);seat.rotation_euler.x=math.radians(-3)
back=box('Tall subtly rounded upholstered back',(0,.241,.529),(.555,.115,.449),.031,cloth);back.rotation_euler.x=math.radians(-15)
# Discreet outer side sewing line: no decorative central welt invented.
def seam(name,points):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=.0005;c.bevel_resolution=2;sp=c.splines.new('POLY');sp.points.add(len(points)-1)
 for p,co in zip(sp.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);c.materials.append(thread)
bpy.context.view_layer.update()
for sign in [-1,1]:
 points=[back.matrix_world@Vector((sign*.272,-.006,z)) for z in [-.191+i*.382/30 for i in range(31)]];seam('Back side panel sewing',points)
# Preserve published envelope and sit on floor.
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=seat;bpy.ops.object.convert(target='MESH');bpy.context.view_layer.update();coords=[o.matrix_world@v.co for o in s.objects for v in o.data.vertices];lo=[min(v[i] for v in coords) for i in range(3)];hi=[max(v[i] for v in coords) for i in range(3)];f=[d/(b-a) for d,a,b in zip([.64,.78,.76],lo,hi)];M=Matrix.Diagonal((*f,1))
for o in s.objects:
 o.data.transform(M@o.matrix_world);o.matrix_world=Matrix.Identity(4)
 for v in o.data.vertices:v.co.z-=lo[2]*f[2]
 o.data.update()
models=list(s.objects)
bpy.ops.export_scene.gltf(filepath=OUT+'/armchair.glb',export_format='GLB',use_selection=True,export_image_format='AUTO')

def studio():
 ground=material('Neutral white seamless studio',(.99,.99,.99),.8);bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.name='Studio floor';bpy.context.object.is_shadow_catcher=True;bpy.context.object.data.materials.append(ground)
 def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
 for loc,power,size in [((-3,-4,5),650,4),((4,-1,2.6),200,3),((0,3,4),300,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;aim(o,(0,0,.4))
 bpy.ops.object.camera_add(location=(.48,-1.40,.67));cam=bpy.context.object;aim(cam,(0,.02,.30));cam.data.type='PERSP';cam.data.lens=39;s.camera=cam
 s.world=bpy.data.worlds.new('Neutral white environment');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.5
 s.render.engine='CYCLES';s.cycles.samples=4;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=.5
 s.render.film_transparent=False
 nt=s.world.node_tree;lp=nt.nodes.new('ShaderNodeLightPath');mix=nt.nodes.new('ShaderNodeMixShader');camera_bg=nt.nodes.new('ShaderNodeBackground');camera_bg.inputs[0].default_value=(1,1,1,1);camera_bg.inputs[1].default_value=4;nt.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]);nt.links.new(nt.nodes['Background'].outputs[0],mix.inputs[1]);nt.links.new(camera_bg.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],nt.nodes['World Output'].inputs[0])
studio();s['Reference']='https://www.ikea.com/us/en/p/ekenaeset-armchair-kilanda-light-beige-30533493/';s.render.filepath=OUT+'/armchair.png';bpy.ops.wm.save_as_mainfile(filepath=OUT+'/armchair.blend');bpy.ops.render.render(write_still=True)
# Reimport GLB to an empty scene to ensure embedded textures survive.
for o in models:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=OUT+'/armchair.glb');s.render.filepath=OUT+'/armchair-roundtrip.png';bpy.ops.render.render(write_still=True)
meta=json.load(open(OUT+'/item.json'));meta['description']='Unofficial recreation of the EKENÄSET chair in Kilanda light beige, with a rectangular dark-brown beech frame, tailored fixed upholstery and embedded woven fabric texture.';meta['validation']={'roundtrip_preview':'armchair-roundtrip.png','embedded_textures':['kilanda-basecolor.png','kilanda-normal.png','beech-basecolor.png'],'review':'review.md'};json.dump(meta,open(OUT+'/item.json','w'),indent=2)
