import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {buildArchitecture} from '../app/decorate/architecture.ts';
const plan=JSON.parse(fs.readFileSync('app/decorate/plan.json'));
const a=buildArchitecture(plan);a.root.updateMatrixWorld(true);
for(const f of plan.fixtures.filter(f=>f.type==='sink'||f.type==='vanity')){
 const g=a.root.children.find(g=>g.name===f.type);
 // Sample the whole counter, including the former square-cutout/oval-bowl corner gaps.
 for(let x=-f.width*.46;x<f.width*.47;x+=.025)for(let z=-f.depth*.46;z<f.depth*.47;z+=.025){
  const origin=new T.Vector3(x,f.height+.1,z).applyMatrix4(g.matrixWorld);const ray=new T.Raycaster(origin,new T.Vector3(0,-1,0),0,.30);
  assert(ray.intersectObject(g,true).length,`${f.type}: exposed hole at ${x},${z}`);
 }
}
const stove=a.root.children.find(g=>g.name==='stove');const bounds=name=>new T.Box3().setFromObject(stove.getObjectByName(name));
assert(bounds('Oven body').min.y<.001,'oven must rest on floor');
assert(bounds('Cooktop').min.y<=bounds('Oven body').max.y,'cooktop must touch oven');
a.cutaway(true);a.root.updateMatrixWorld(true);
for(const g of a.root.children.filter(g=>g.name==='Door frame'))g.traverse(o=>{if(o.isMesh&&o.visible)assert(new T.Box3().setFromObject(o).max.y<=.621,'door follows wall cutaway height');});
assert.equal(stove.getObjectByName('Wall mounted range hood').visible,false);
const ray=new T.Raycaster(new T.Vector3(3.15,3,8.08),new T.Vector3(0,-1,0));
const meshes=[];stove.traverse(o=>{if(o.isMesh)meshes.push(o);});
assert(ray.intersectObjects(meshes,false).every(hit=>hit.point.y<1),'hidden hood must not intercept furniture selection');
a.cutaway(false);assert(stove.getObjectByName('Wall mounted range hood').visible);
assert(a.root.children.filter(g=>g.name==='Door frame').every(g=>g.getObjectByName('Door lintel').visible));
console.log('PASS: closed sink surfaces, grounded oven/cooktop, consistent door cutaways, hidden fixture picking, full-height restoration.');
