import numpy as np
from PIL import Image
from pathlib import Path
p=Path(__file__).parent;rng=np.random.default_rng(9305);n=1024
Y,X=np.mgrid[:n,:n]/n
# Woven yarn structure with irregular yarn pigmentation. Tile represents 10 cm.
f=128;u=X*f;v=Y*f;ix=u.astype(int);iy=v.astype(int);fu=u%1;fv=v%1
warp=np.sin(np.pi*fu)**.5;weft=np.sin(np.pi*fv)**.5
sel=(ix+iy)%2;h=np.where(sel==0,.72*warp+.14*weft,.72*weft+.14*warp)
row=rng.normal(0,.007,(f,));col=rng.normal(0,.007,(f,))
noise=rng.normal(0,.012,(n,n));variation=(h-.55)*.09+row[iy]+col[ix]+noise
rgb=np.clip(np.array([.67,.628,.585])[None,None,:]+variation[:,:,None],0,1)
Image.fromarray((rgb*255).astype('uint8')).save(p/'kilanda-basecolor.png')
dy,dx=np.gradient(h+noise);norm=np.stack([-dx*1.0,-dy*1.0,np.ones_like(h)],-1);norm/=np.linalg.norm(norm,axis=-1)[:,:,None]
Image.fromarray(((norm*.5+.5)*255).astype('uint8')).save(p/'kilanda-normal.png')
# Stained beech: thin continuous longitudinal grain, not noisy blotches.
grain=np.sin(2*np.pi*(X*86+.5*np.sin(Y*7)+.15*np.sin(Y*23)))
grain2=np.sin(2*np.pi*(X*251+.4*np.sin(Y*11)))
variation=.006*grain+.003*grain2+rng.normal(0,.002,(n,n))
wood=np.clip(np.array([.12,.065,.045])[None,None,:]+variation[:,:,None],0,1)
Image.fromarray((wood*255).astype('uint8')).save(p/'beech-basecolor.png')
