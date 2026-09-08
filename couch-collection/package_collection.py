from pathlib import Path
import json,struct,zipfile
from PIL import Image,ImageDraw,ImageFont
p=Path(__file__).parent
items=json.loads((p/'manifest.json').read_text())
assert len(items)==10
sheet=Image.new('RGB',(1600,1400),'#f4f2ef');draw=ImageDraw.Draw(sheet)
try: font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',24)
except: font=ImageFont.load_default()
for i,m in enumerate(items):
 slug=m['slug'];folder=p/slug
 assert (folder/(slug+'.blend')).stat().st_size>10000
 data=(folder/(slug+'.glb')).read_bytes();magic,ver,size=struct.unpack('<4sII',data[:12]);assert magic==b'glTF' and ver==2 and size==len(data)
 chunklen,typ=struct.unpack('<II',data[12:20]);meta=json.loads(data[20:20+chunklen]);assert len(meta['meshes'])>0
 im=Image.open(folder/(slug+'.png')).convert('RGB');im.thumbnail((390,300));x=(i%4)*400;y=(i//4)*440+55
 sheet.paste(im,(x+(400-im.width)//2,y));draw.text((x+20,y+310),str(i+1).zfill(2)+'  '+m['name'],font=font,fill='#222222')
draw.text((22,14),'TEN COUCHES / Simplified IKEA-inspired 3D models',font=font,fill='#222222')
sheet=sheet.crop((0,0,1600,1340));sheet.save(p/'collection-preview.jpg',quality=92)
with zipfile.ZipFile(p.parent/'ten-couch-models.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(p.rglob('*')):
  if f.suffix in ['.blend','.glb','.png','.jpg','.md','.json']:z.write(f,Path('couch-collection')/f.relative_to(p))
print('Verified 10 Blender files, 10 valid GLB containers, 10 preview images.')
print(p.parent/'ten-couch-models.zip')
