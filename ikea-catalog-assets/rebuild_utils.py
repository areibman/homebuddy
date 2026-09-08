import bpy,math,os,json
from mathutils import Vector

def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def material(name,c,rough=.75):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*(linear(v) for v in c),1);p.inputs['Roughness'].default_value=rough;m.diffuse_color=p.inputs['Base Color'].default_value;return m

def textured(name,path,kind,rough=.8):
 m=material(name,(.8,.8,.8),rough);nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes.get('Principled BSDF')
 tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(os.path.join(path,kind+'-color.png'));tex.image.pack();links.new(tex.outputs['Color'],p.inputs['Base Color'])
 n=nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(os.path.join(path,kind+'-normal.png'));n.image.colorspace_settings.name='Non-Color';n.image.pack();norm=nodes.new('ShaderNodeNormalMap');norm.inputs['Strength'].default_value=.25;links.new(n.outputs['Color'],norm.inputs['Color']);links.new(norm.outputs['Normal'],p.inputs['Normal']);return m

def uv(o,scale=.3):
 me=o.data;layer=me.uv_layers.new(name='Physical texture coordinates') if not me.uv_layers else me.uv_layers.active
 for poly in me.polygons:
  axis=max(range(3),key=lambda i:abs(poly.normal[i]))
  axes=([1,2],[0,2],[0,1])[axis]
  for li in poly.loop_indices:
   co=me.vertices[me.loops[li].vertex_index].co;layer.data[li].uv=(co[axes[0]]/scale,co[axes[1]]/scale)

def box(name,loc,dims,r,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if r:
  mod=o.modifiers.new('Soft edges','BEVEL');mod.width=r;mod.segments=5;bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in o.data.polygons:f.use_smooth=True
 o.modifiers.new('Face normals','WEIGHTED_NORMAL');o.data.materials.append(mat);uv(o);return o

def curve(name,pts,r,mat,closed=False):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=2;sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 sp.use_cyclic_u=closed;o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);cu.materials.append(mat);return o

def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def finish(out,slug,models,camera,target,scale):
 scene=bpy.context.scene;col=bpy.data.collections.new('Furniture | editable components');scene.collection.children.link(col)
 for o in models:
  for c in list(o.users_collection):c.objects.unlink(o)
  col.objects.link(o)
 bpy.ops.object.select_all(action='DESELECT')
 for o in models:o.select_set(True)
 bpy.context.view_layer.objects.active=models[0];bpy.ops.object.convert(target='MESH');bpy.context.view_layer.update()
 if slug=='sofa':
  pts=[o.matrix_world@v.co for o in col.objects for v in o.data.vertices];mins=[min(p[i] for p in pts) for i in range(3)];ranges=[max(p[i] for p in pts)-mins[i] for i in range(3)];factors=[d/r for d,r in zip((2.28,.95,.83),ranges)]
  for o in col.objects:
   o.location=Vector([o.location[i]*factors[i] for i in range(3)]);o.scale=Vector([o.scale[i]*factors[i] for i in range(3)])
  bpy.context.view_layer.update()
 bpy.ops.export_scene.gltf(filepath=os.path.join(out,slug+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
 # Exact white background, neutral soft illumination, physically coherent PBR.
 white=material('Studio white',(1,1,1),.85)
 bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.name='Studio floor';bpy.context.object.data.materials.append(white)
 scene.world=bpy.data.worlds.new('Neutral studio');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(1,1,1,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.7
 for loc,power,size in [((-3,-4,6),400,5),((4,-1,3),100,4)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,target)
 bpy.ops.object.camera_add(location=camera);cam=bpy.context.object;aim(cam,target);cam.data.type='ORTHO';cam.data.ortho_scale=scale;scene.camera=cam
 scene.render.engine='CYCLES';scene.cycles.samples=12;scene.render.threads_mode='FIXED';scene.render.threads=2;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
 scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(out,slug+'.png')
 for screen in bpy.data.screens:
  for area in screen.areas:
   if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.overlay.show_overlays=False
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,slug+'.blend'))
 if os.environ.get('MODEL_EXPORT_ONLY'):return
 bpy.ops.render.render(write_still=True)
 # Render the actual delivered GLB using identical studio after replacing native geometry.
 for o in list(col.objects):bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.import_scene.gltf(filepath=os.path.join(out,slug+'.glb'));scene.render.filepath=os.path.join(out,'roundtrip.png');bpy.ops.render.render(write_still=True)
 print('REBUILT',slug,flush=True)
