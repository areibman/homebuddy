import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const catalog=JSON.parse(fs.readFileSync('app/catalog.json'));
const couches=JSON.parse(fs.readFileSync('../couch-collection/manifest.json'));
assert.equal(catalog.length,23);
assert.equal(new Set(catalog.map(item=>item.id)).size,23);
assert.deepEqual(catalog,JSON.parse(fs.readFileSync('public/catalog.json')));
for(const couch of couches){
 const item=catalog.find(item=>item.id===couch.slug);assert(item,`${couch.name} remains available`);
 for(const url of Object.values(item.files))assert(fs.existsSync('public'+url.split('?')[0]));
 const bytes=fs.readFileSync('public'+item.files.glb.split('?')[0]);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const bounds=new T.Box3().setFromObject(gltf.scene);const size=bounds.getSize(new T.Vector3());
 assert([size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0),`${item.id} loads with usable dimensions`);
}
const tvs=catalog.filter(item=>item.category==='TVs & media');
assert.equal(tvs.length,3);
assert.equal(catalog.filter(item=>item.source.retailer==='IKEA').length,20);
for(const item of tvs){
 assert.equal(item.source.retailer,'Homebuddy');
 assert.equal(item.source.photo_url,'');
 assert.equal(item.source.url,'');
 for(const url of Object.values(item.files))assert(fs.existsSync('public'+url.split('?')[0]));
 const bytes=fs.readFileSync('public'+item.files.glb.split('?')[0]);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const bounds=new T.Box3().setFromObject(gltf.scene),size=bounds.getSize(new T.Vector3());
 for(const [axis,key] of [['x','width'],['y','height'],['z','depth']])assert(Math.abs(size[axis]-item.dimensions_m[key])<.001,`${item.id} ${key} matches physical geometry`);
 gltf.scene.traverse(object=>assert(!object.isCamera&&!object.isLight,`${item.id} exports furniture only`));
}
for(const file of ['page.tsx','scene.ts','object-popover.tsx','floor-plan-editor.tsx'])assert(fs.readFileSync('app/decorate/'+file,'utf8').includes("from '../catalog.json'"));
console.log('PASS: 23 catalog entries, 10 restored couches, 3 correctly scaled original TVs, download assets, and shared inventory source.');
