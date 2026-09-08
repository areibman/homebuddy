import os,shutil,json,urllib.request,numpy as np
from PIL import Image
ROOT='/Users/hyperbox/homebuddy/ikea-catalog-assets'
notes={
'dining-table':'Previous render had no visible ash grain, a uniformly beige top, overly angular legs and an elevated viewpoint. Reference shows pale ash with darker longitudinal grain, rounded tapered birch legs, a thin top lip and a broad underside chamfer. Revised UV textures, leg rounding/splay, chamfer profile and low product camera. Internal mounting geometry and wood grain specimen remain estimated.',
'coffee-table':'Previous render looked grey and matte against a grey floor; viewpoint too high. Reference has a satin white finish, 50mm top and square legs, thin shelf at approximately 170mm above floor. Revised satin roughness, neutral white paint (sRGB converted to linear), reference-like low camera and white background. Shelf exact height and construction joints estimated from photo.',
'rug':'Previous rug was pale, grid-like and dominated by decimated geometry. Reference has tightly looped, mottled brown jute with dark gaps and slight edge irregularity. Replaced strands with UV mapped thin geometry, source-derived reference photo used as the jute base-color texture, and a fine tangent-space weave normal. Reference image is evenly lit but includes some baked weave shading; normal depth remains approximate.'}
for s,n in notes.items():
 p=ROOT+'/'+s;os.makedirs(p+'/backup-before-fidelity',exist_ok=True);os.makedirs(p+'/textures',exist_ok=True)
 for ext in ['blend','glb','png']:
  shutil.copy2(p+'/'+s+'.'+ext,p+'/backup-before-fidelity/'+s+'.'+ext)
 open(p+'/review.md','w').write('# Photo comparison and correction\n\n'+n+'\n\nOfficial reference: '+json.load(open(p+'/item.json'))['source']['photo_url']+'\n\nPublished overall dimensions preserved; this remains an unofficial visual reconstruction, not IKEA CAD.\n')
# Original image is retained as an actual UV material source, not as a replacement catalog photo.
u=json.load(open(ROOT+'/rug/item.json'))['source']['photo_url'];urllib.request.urlretrieve(u,ROOT+'/rug/textures/jute-reference.jpg')
N=1024;y,x=np.mgrid[0:N,0:N]/N
# Fine woven normals: roughly 240×340 loops across full rug, subtle tangential relief.
h=(.4+.6*np.sin(2*np.pi*x*240)**2)*(.4+.6*np.sin(2*np.pi*y*340)**2)
dy,dx=np.gradient(h);nx=-dx*.8;ny=-dy*.8;nz=np.ones_like(nx);l=np.sqrt(nx*nx+ny*ny+nz*nz)
n=np.stack([nx/l*.5+.5,ny/l*.5+.5,nz/l*.5+.5],-1)
Image.fromarray(np.uint8(n*255)).save(ROOT+'/rug/textures/jute-normal.png')
# Authored ash color image. Grain is longitudinal with broad cathedral patterns and fine pores.
N=1536;y,x=np.mgrid[0:N,0:N]/N;rng=np.random.default_rng(48)
warp=x+.012*np.sin(y*8)+.008*np.sin(y*19+x*9)
for kx,ky in [(.27,.35),(.69,.73)]:warp+=.023*np.exp(-((x-kx)/.065)**2)*np.exp(-((y-ky)/.24)**2)*np.sin((y-ky)*9)
grain=(np.sin(warp*650)+np.sin(warp*1400+y*8)*.3)*.008
broad=.075*np.exp(-((x-.28-.012*np.sin(y*9))/.068)**2)+.055*np.exp(-((x-.72-.018*np.sin(y*6))/.055)**2)
cat=.014*np.sin(np.sqrt(((x-.32)*2.5)**2+((y-.4)*.36)**2)*240)
noise=rng.normal(0,.004,(N,N));color=np.stack([.91-broad+grain+cat+noise,.84-broad+grain+cat+noise,.72-broad*.8+grain+cat+noise],-1)
Image.fromarray(np.uint8(np.clip(color,0,1)*255)).save(ROOT+'/dining-table/textures/ash-color.jpg',quality=92)
