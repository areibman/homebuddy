from pathlib import Path
import json,struct,shutil,zipfile,hashlib
site=Path(__file__).resolve().parent.parent
base=site.parent/'ikea-catalog-assets'
slugs=['sofa','armchair','bed','dining-table','rug','dresser','bookshelf','nightstand','coffee-table','floor-lamp']
items=[]
for slug in slugs:
 p=base/slug;item=json.loads((p/'item.json').read_text());assert item['source']['photo_url'].startswith('https://www.ikea.com/')
 assert item['source']['url'].startswith('https://www.ikea.com/');assert item['source']['article_number']
 for ext in ['blend','glb','png']:
  f=p/(slug+'.'+ext);assert f.stat().st_size>1000
  if ext=='glb':
   data=f.read_bytes();assert struct.unpack('<4sII',data[:12])==(b'glTF',2,len(data));n=struct.unpack('<I',data[12:16])[0];doc=json.loads(data[20:20+n]);assert doc.get('meshes') and not doc.get('cameras')
  dest=site/'public/models/ikea'/slug;dest.mkdir(exist_ok=True,parents=True);shutil.copy2(f,dest/f.name)
 item['id']=slug;item['files']={k:f'/models/ikea/{slug}/{slug}.{v}?v='+hashlib.sha256((p/(slug+'.'+v)).read_bytes()).hexdigest()[:12] for k,v in [('blend','blend'),('glb','glb'),('preview','png')]}
 if 'dimension_note' in item and 'dimensions_note' not in item:item['dimensions_note']=item['dimension_note']
 items.append(item)
(site/'app/catalog.json').write_text(json.dumps(items,indent=2));(site/'public/catalog.json').write_text(json.dumps(items,indent=2))
readme='FORM / IKEA reference collection\n\nTen real IKEA product references with original catalog photo URLs and independent photo-based 3D recreations. Photography and product designs belong to IKEA. This catalog is not affiliated with IKEA and these models are not official manufacturer CAD.\n\nEach folder includes a Blender studio scene, furniture-only GLB model, recreation render and metadata with official product/photo links. PNG files are renders, NOT catalog photographs. Catalog photographs are loaded from IKEA in the viewer and are not included in this archive. Refer to the linked IKEA page for current product specifications.\n'
for zipname,subset in [('furniture-collection.zip',slugs),('five-new-pieces.zip',slugs[5:])]:
 with zipfile.ZipFile(site/'public'/zipname,'w',zipfile.ZIP_DEFLATED) as z:
  z.writestr('README.txt',readme)
  if (base/'RECONSTRUCTION-REVIEW.md').exists():z.write(base/'RECONSTRUCTION-REVIEW.md','RECONSTRUCTION-REVIEW.md')
  for slug in subset:
   for name in [slug+'.blend',slug+'.glb',slug+'.png','item.json','review.md','export-validation.json']:
    if (base/slug/name).exists():z.write(base/slug/name,slug+'/'+name)
print('Synchronized 10 verified IKEA product references, photo URLs, and 3D recreations.')
