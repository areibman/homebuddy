from pathlib import Path
import json,struct,math,hashlib
ROOT=Path(__file__).parent
I=[[float(i==j) for j in range(4)] for i in range(4)]
def mul(a,b):return [[sum(a[i][k]*b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
def matrix(n):
 if 'matrix' in n:return [[n['matrix'][j*4+i] for j in range(4)] for i in range(4)]
 x,y,z,w=n.get('rotation',[0,0,0,1]);r=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),0],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),0],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y),0],[0,0,0,1]]
 for i in range(3):
  for j in range(3):r[i][j]*=n.get('scale',[1,1,1])[j]
  r[i][3]=n.get('translation',[0,0,0])[i]
 return r
results=[]
for slug in ['sofa','armchair','bed','dining-table','rug','dresser','bookshelf','nightstand','coffee-table','floor-lamp']:
 p=ROOT/slug;data=(p/(slug+'.glb')).read_bytes();assert struct.unpack_from('<4sII',data)==(b'glTF',2,len(data));n=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+n]);bin_start=28+n;points=[]
 def visit(index,parent):
  node=g['nodes'][index];m=mul(parent,matrix(node))
  if 'mesh' in node:
   for primitive in g['meshes'][node['mesh']]['primitives']:
    a=g['accessors'][primitive['attributes']['POSITION']];v=g['bufferViews'][a['bufferView']];off=bin_start+v.get('byteOffset',0)+a.get('byteOffset',0)
    for j in range(a['count']):
     q=(*struct.unpack_from('<fff',data,off+j*v.get('byteStride',12)),1);points.append([sum(m[i][k]*q[k] for k in range(4)) for i in range(3)])
  for i in node.get('children',[]):visit(i,m)
 for i in g['scenes'][g.get('scene',0)]['nodes']:visit(i,I)
 dims=[max(v[i] for v in points)-min(v[i] for v in points) for i in range(3)];d={'width':dims[0],'depth':dims[2],'height':dims[1]};meta=json.loads((p/'item.json').read_text());expected=meta['dimensions_m']
 for key in ['height'] if slug=='floor-lamp' else ['width','depth','height']:assert abs(d[key]-expected[key])<.003,(slug,key,d[key],expected[key])
 assert not g.get('cameras') and not g.get('extensions',{}).get('KHR_lights_punctual')
 assert all('bufferView' in im for im in g.get('images',[]))
 for mat in g.get('materials',[]):
  pbr=mat.get('pbrMetallicRoughness',{});assert 'baseColorFactor' in pbr or 'baseColorTexture' in pbr,(slug,'missing PBR color',mat.get('name'))
 result={'id':slug,'sha256':hashlib.sha256(data).hexdigest(),'geometry_dimensions_m':{k:round(v,5) for k,v in d.items()},'published_dimensions_pass':True,'embedded_images':len(g.get('images',[])),'materials':len(g.get('materials',[])),'occlusion_materials':sum('occlusionTexture' in m for m in g.get('materials',[])),'bytes':len(data)}
 if slug=='floor-lamp':result['dimension_note']='Published width/depth describe tripod base diameter. GLB rectangle includes loose power cable.'
 (p/'export-validation.json').write_text(json.dumps(result,indent=2));results.append(result)
(ROOT/'collection-validation.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
