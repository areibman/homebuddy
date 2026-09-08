"""Generate a neutral, directional studio environment; no catalog pixels are edited."""
import math
from pathlib import Path
w,h=512,256
lights=[((-.50,.65,.57),2.5,8),((.70,.35,.62),.8,7)]
lights=[(tuple(a/math.sqrt(sum(b*b for b in v)) for a in v),p,n) for v,p,n in lights]
out=bytearray(f'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {h} +X {w}\n'.encode())
for y in range(h):
 phi=(y+.5)/h*math.pi
 for x in range(w):
  theta=(x+.5)/w*2*math.pi-math.pi;d=(math.sin(phi)*math.cos(theta),math.cos(phi),math.sin(phi)*math.sin(theta))
  value=.65+sum(p*max(0,sum(a*b for a,b in zip(d,v)))**n for v,p,n in lights)
  mant,exponent=math.frexp(value);byte=int(mant*256);out.extend((byte,byte,byte,exponent+128))
(Path(__file__).resolve().parent.parent/'public/environments/catalog-studio-final.hdr').write_bytes(out)
