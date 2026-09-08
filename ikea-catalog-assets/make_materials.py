from PIL import Image
import math, random
from pathlib import Path
p=Path(__file__).parent
random.seed(42)
for slug,kind in [('sofa','fabric'),('floor-lamp','ash'),('floor-lamp','shade')]:
 size=512; im=Image.new('RGB',(size,size));normal=Image.new('RGB',(size,size))
 colors=[];normals=[]
 for y in range(size):
  for x in range(size):
   if kind=='ash':
    grain=math.sin(x*.17+3*math.sin(y*.005)+.6*math.sin(y*.021))
    pores=max(0,math.sin(x*.51+2.1*math.sin(y*.007)))**18
    jitter=random.gauss(0,.8);v=grain*3.5-pores*9+jitter
    rgb=[202+v,171+v,133+v*.8]
    normals.append((128+int(grain*3),128,254))
   else:
    thread=math.sin(x*math.pi/2)*math.cos(y*math.pi/2)
    v=random.gauss(0,3 if kind=='fabric' else .8)+thread*3
    rgb=[210+v,207+v,196+v] if kind=='fabric' else [237+v,237+v,231+v]
    normals.append((128+int(math.cos(x*math.pi/2)*10),128+int(math.sin(y*math.pi/2)*10),253))
   colors.append(tuple(max(0,min(255,round(c))) for c in rgb))
 im.putdata(colors);im.save(p/slug/(kind+'-color.png'))
 normal.putdata(normals);normal.save(p/slug/(kind+'-normal.png'))
