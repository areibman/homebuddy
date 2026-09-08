import json,struct,numpy as np
from pathlib import Path
for slug in ['armchair','bookshelf']:
 root=Path(__file__).parent.parent/slug;b=(root/(slug+'.glb')).read_bytes();magic,version,length=struct.unpack_from('<4sII',b);assert magic==b'glTF' and version==2 and length==len(b);n,t=struct.unpack_from('<II',b,12);j=json.loads(b[20:20+n]);pts=[]
 def mat(node):
  if 'matrix' in node:return np.array(node['matrix']).reshape(4,4).T
  x,y,z,w=node.get('rotation',[0,0,0,1]);r=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),0],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),0],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y),0],[0,0,0,1.]])
  r[:3,:3]=r[:3,:3]@np.diag(node.get('scale',[1,1,1]));r[:3,3]=node.get('translation',[0,0,0]);return r
 def visit(i,parent):
  node=j['nodes'][i];m=parent@mat(node)
  if 'mesh' in node:
   for p in j['meshes'][node['mesh']]['primitives']:
    a=j['accessors'][p['attributes']['POSITION']]
    view=j['bufferViews'][a['bufferView']];off=20+n+8+view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',12)
    for vi in range(a['count']):
     xyz=struct.unpack_from('<fff',b,off+vi*stride);pts.append((m@np.array([*xyz,1]))[:3])
  for child in node.get('children',[]):visit(child,m)
 for i in j['scenes'][j.get('scene',0)]['nodes']:visit(i,np.eye(4))
 pts=np.array(pts);dims=pts.max(0)-pts.min(0);expected=[.64,.76,.78] if slug=='armchair' else [.80,2.02,.28];assert np.allclose(dims,expected,atol=.002),(dims,expected)
 assert not j.get('cameras');assert not j.get('extensions',{}).get('KHR_lights_punctual');assert all('bufferView' in im for im in j.get('images',[]))
 result={'envelope_m':{'width':round(dims[0],4),'depth':round(dims[2],4),'height':round(dims[1],4)},'mesh_count':len(j['meshes']),'embedded_image_count':len(j.get('images',[])),'bytes':len(b),'studio_objects':False}
 (root/'glb-validation.json').write_text(json.dumps(result,indent=2));print(slug,result)
