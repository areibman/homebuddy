from pathlib import Path
import json,struct,shutil,zipfile,hashlib,ast,re
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
# Include the earlier couch collection instead of silently dropping it on sync.
couches=site.parent/'couch-collection'
references=json.loads((couches/'references.json').read_text())
manifest=json.loads((couches/'manifest.json').read_text())
source=ast.parse((couches/'build_collection.py').read_text())
configs=ast.literal_eval(next(n.value for n in source.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='configs' for t in n.targets)))
assert len(manifest)==len(references)==len(configs)
for entry,ref,config in zip(manifest,references,configs):
 slug,w,d,h,*_=config
 assert slug==entry['slug'] and ref['url']==entry['source']
 folder=couches/slug;dest=site/'public/models/couches'/slug;dest.mkdir(parents=True,exist_ok=True)
 files={}
 for key,ext in [('blend','blend'),('glb','glb'),('preview','png')]:
  asset=folder/(slug+'.'+ext);assert asset.stat().st_size>1000
  shutil.copy2(asset,dest/asset.name)
  files[key]=f'/models/couches/{slug}/{asset.name}?v='+hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
 number=re.search(r'(\d{8})/$',ref['url']).group(1)
 items.append({'id':slug,'name':ref['name']+' — '+ref['variant'],'category':'Sofas','description':ref['variant']+'. Independent simplified 3D recreation.','materials':[ref['variant'].split(', ',1)[-1]],'dimensions_m':{'width':w,'depth':d+(.62 if slug=='mannarp' else 0),'height':h},'dimensions_note':'Estimated reconstruction dimensions; verify measurements with IKEA before purchasing.','source':{'retailer':'IKEA','url':ref['url'],'photo_url':ref['images'][-1][1].replace('?f=xxs','?f=s'),'article_number':number[:3]+'.'+number[3:6]+'.'+number[6:],'checked_date':'2026-09-08'},'files':files,'provenance':'Independent simplified recreation; dimensions and details estimated from product references.'})
# Original TV assemblies share the inventory without pretending to be retail IKEA products.
tvs=site.parent/'tv-collection'
tv_items=[]
for folder in sorted(tvs.glob('tv-*')):
 if not (folder/'item.json').exists():continue
 item=json.loads((folder/'item.json').read_text());slug=item['id'];dest=site/'public/models/original'/slug;dest.mkdir(parents=True,exist_ok=True)
 item['files']={}
 for key,ext in [('blend','blend'),('glb','glb'),('preview','png')]:
  asset=folder/(slug+'.'+ext);assert asset.stat().st_size>1000
  shutil.copy2(asset,dest/asset.name)
  item['files'][key]=f'/models/original/{slug}/{asset.name}?v='+hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
 items.append(item);tv_items.append(item)
assert len({item['id'] for item in items})==len(items)
(site/'app/catalog.json').write_text(json.dumps(items,indent=2));(site/'public/catalog.json').write_text(json.dumps(items,indent=2))
readme='FORM / IKEA reference collection\n\nTwenty IKEA references plus three original Homebuddy TV assemblies. Original TVs are design assets, not retail products, and their preview images are renders. IKEA pieces include original catalog photo URLs and independent photo-based 3D recreations. Photography and product designs belong to IKEA. This catalog is not affiliated with IKEA and these models are not official manufacturer CAD.\n\nEach folder includes a Blender studio scene, furniture-only GLB model, recreation render and metadata with official product/photo links. PNG files are renders, NOT catalog photographs. Catalog photographs are loaded from IKEA in the viewer and are not included in this archive. Refer to the linked IKEA page for current product specifications.\n'
for zipname,subset in [('furniture-collection.zip',slugs),('five-new-pieces.zip',slugs[5:])]:
 with zipfile.ZipFile(site/'public'/zipname,'w',zipfile.ZIP_DEFLATED) as z:
  z.writestr('README.txt',readme)
  if (base/'RECONSTRUCTION-REVIEW.md').exists():z.write(base/'RECONSTRUCTION-REVIEW.md','RECONSTRUCTION-REVIEW.md')
  for slug in subset:
   for name in [slug+'.blend',slug+'.glb',slug+'.png','item.json','review.md','export-validation.json']:
    if (base/slug/name).exists():z.write(base/slug/name,slug+'/'+name)
with zipfile.ZipFile(site/'public/furniture-collection.zip','a',zipfile.ZIP_DEFLATED) as z:
 for entry in manifest:
  slug=entry['slug']
  for ext in ['blend','glb','png']:z.write(couches/slug/(slug+'.'+ext),'couches/'+slug+'/'+slug+'.'+ext)
 z.write(couches/'README.md','couches/README.md')
with zipfile.ZipFile(site/'public/furniture-collection.zip','a',zipfile.ZIP_DEFLATED) as z:
 for item in tv_items:
  folder=tvs/item['id']
  for ext in ['blend','glb','png']:z.write(folder/(item['id']+'.'+ext),'original/'+item['id']+'/'+item['id']+'.'+ext)
  z.write(folder/'item.json','original/'+item['id']+'/item.json')
print(f'Synchronized {len(items)} catalog models, including {len(tv_items)} original TVs.')
