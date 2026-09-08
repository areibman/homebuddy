import bpy, math, os
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
sofa = bpy.data.collections.new('KIVIK | editable sofa parts')
scene.collection.children.link(sofa)
studio = bpy.data.collections.new('Studio | lighting and backdrop')
scene.collection.children.link(studio)

def move(obj, col):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    col.objects.link(obj)

def material(name, color, rough=0.8):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough
    return m

fabric=material('Gunnared beige | procedural woven melange',(0.58,0.52,0.42))
n=fabric.node_tree.nodes; l=fabric.node_tree.links; p=n.get('Principled BSDF')
p.inputs['Sheen Weight'].default_value=.28
tex=n.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value=480; tex.inputs['Detail'].default_value=2
coord=n.new('ShaderNodeTexCoord'); l.new(coord.outputs['Generated'],tex.inputs['Vector'])
r=n.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].position=.15; r.color_ramp.elements[0].color=(.39,.345,.28,1); r.color_ramp.elements[1].position=.85; r.color_ramp.elements[1].color=(.66,.60,.50,1)
l.new(tex.outputs['Fac'],r.inputs[0]); l.new(r.outputs[0],p.inputs['Base Color'])
b=n.new('ShaderNodeBump'); b.inputs['Strength'].default_value=.22; b.inputs['Distance'].default_value=.00065
l.new(tex.outputs['Fac'],b.inputs['Height']); l.new(b.outputs[0],p.inputs['Normal'])
seam=material('Upholstery seam | beige thread',(.40,.35,.28))
feet=material('Recessed dark feet',(.025,.021,.018))

def box(name,loc,dims,rad,mat=fabric,puff=False):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    be=o.modifiers.new('Soft upholstered edges','BEVEL'); be.width=rad; be.segments=6
    bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=be.name)
    if puff:
        sub=o.modifiers.new('Cushion surface','SUBSURF'); sub.subdivision_type='SIMPLE'; sub.levels=3
        bpy.ops.object.modifier_apply(modifier=sub.name)
        for v in o.data.vertices:
            x,y,z=v.co; a,b,c=[d/2 for d in dims]
            if abs(z)>c*.7:
                v.co.z += math.copysign(.013*(max(0,1-(x/a)**2))*max(0,1-(y/b)**2),z)
    for f in o.data.polygons: f.use_smooth=True
    no=o.modifiers.new('Weighted soft normals','WEIGHTED_NORMAL'); no.keep_sharp=True
    o.data.materials.append(mat); move(o,sofa); return o

def piping(name,w,h,r,loc,rotation=(0,0,0),plane='XY'):
    pts=[]
    for cx,cy,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for j in range(13):
            a=math.radians(start+j*90/12); x=cx+r*math.cos(a); y=cy+r*math.sin(a)
            pts.append((x,y,0) if plane=='XY' else (x,0,y))
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'; cu.bevel_depth=.0013; cu.bevel_resolution=3
    sp=cu.splines.new('POLY'); sp.points.add(len(pts)-1)
    for p,co in zip(sp.points,pts): p.co=(*co,1)
    sp.use_cyclic_u=True; o=bpy.data.objects.new(name,cu); sofa.objects.link(o); o.location=loc; o.rotation_euler=rotation; cu.materials.append(seam)
    return o

box('01 | upholstered lower seat frame',(0,-.025,.185),(1.80,.88,.29),.025)
box('02 | rear upholstered support',(0,.371,.452),(1.80,.208,.715),.035)
for side,x in [('Left',-1.02),('Right',1.02)]:
    box(side+' | broad low arm',(x,0,.284),(.24,.95,.488),.024)
    # Fine sewn outline at the front of each arm cover.
    piping(side+' | arm front seam',.211,.456,.021,(x,-.4752,.284),plane='XZ')
for i,x in enumerate([-.45,.45],1):
    box(str(i)+' | loose seat cushion',(x,-.124,.383),(.890,.690,.139),.043,puff=True)
    piping(str(i)+' | seat upper seam',.85,.654,.046,(x,-.124,.426))
    piping(str(i)+' | seat lower seam',.85,.654,.046,(x,-.124,.337))
    o=box(str(i)+' | loose back cushion',(x,.238,.632),(.893,.204,.395),.046,puff=True)
    o.rotation_euler.x=math.radians(-10)
    # Piping follows the forward face of the tilted back cushion.
    local=Vector((0,-.093,0)); local.rotate(o.rotation_euler)
    piping(str(i)+' | back cushion seam',.848,.350,.041,Vector(o.location)+local,tuple(o.rotation_euler),plane='XZ')
for x in [-.99,.99]:
    for y in [-.35,.35]: box('Hidden support foot',(x,y,.026),(.085,.085,.052),.009,feet)

ground=material('Warm porcelain studio',(.73,.715,.68))
bpy.ops.mesh.primitive_plane_add(size=200); o=bpy.context.object; o.name='Studio floor'; o.data.materials.append(ground); move(o,studio)
def aim(o,point): o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()
def light(name,loc,power,size):
    bpy.ops.object.light_add(type='AREA',location=loc); o=bpy.context.object; o.name=name; o.data.energy=power; o.data.shape='DISK'; o.data.size=size; aim(o,(0,0,.4)); move(o,studio)
light('Key | large softbox',(-3,-4,5),450,4)
light('Fill | softbox',(4,-1,3),240,3)
light('Rim | overhead',(0,3,4),350,3)
bpy.ops.object.camera_add(location=(3.25,-5.1,2.5)); cam=bpy.context.object; cam.name='Camera | three quarter'; aim(cam,(0,0,.4)); cam.data.type='ORTHO'; cam.data.ortho_scale=3.45; scene.camera=cam; move(cam,studio)
scene.render.engine='CYCLES'; scene.cycles.samples=48; scene.cycles.use_denoising=True
scene.world.color=(.3,.3,.3)
scene.render.resolution_x=1500; scene.render.resolution_y=1100; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'; scene.render.filepath=os.path.join(OUT,'kivik-preview.png')
scene['Reference']='https://www.ikea.com/us/en/p/kivik-sofa-gunnared-beige-s89499703/'
scene['Model notes']='Visual reconstruction from IKEA photos; approximate details. Overall nominal dimensions: 2.28 x 0.95 x 0.83 m. Seat height 0.45 m.'
readme=bpy.data.texts.new('READ ME | model provenance'); readme.write(scene['Reference']+'\n'+scene['Model notes']+'\nAll sofa parts remain separately editable. Studio is in a separate collection. Procedural fabric requires no external images.')
bpy.ops.object.select_all(action='DESELECT')
for o in sofa.objects: o.select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects.get('01 | upholstered lower seat frame')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.overlay.show_overlays=False
            area.spaces.active.shading.color_type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'kivik-sofa.blend'))
bpy.ops.render.render(write_still=True)
print('COMPLETE:',os.path.join(OUT,'kivik-sofa.blend'))
