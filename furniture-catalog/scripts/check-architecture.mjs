import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {buildArchitecture} from '../app/decorate/architecture.ts';
const plan=JSON.parse(fs.readFileSync('app/decorate/plan.json'));
const a=buildArchitecture(plan);a.root.updateMatrixWorld(true);
for(const w of plan.windows){
 const [x,z,xx,zz]=plan.walls[w.wall],length=Math.hypot(xx-x,zz-z),dx=(xx-x)/length,dz=(zz-z)/length;
 const center=new T.Vector3(x+dx*(w.start+w.width*.25),w.sill+w.height*.5,z+dz*(w.start+w.width*.25)),normal=new T.Vector3(-dz,0,dx);
 const ray=new T.Raycaster(center.clone().addScaledVector(normal,-.5),normal,0,1);
 assert.equal(ray.intersectObjects(a.wallMeshes).length,0,'window must be an actual wall opening');
 assert(a.colliders.some(b=>b.containsPoint(center)),'glass must block walking through exterior');
 ray.ray.origin.y=.3;assert(ray.intersectObjects(a.wallMeshes).length>0,'wall remains solid below sill');
}
const glazing=[];a.root.traverse(o=>{if(o.name==='Window glazing')glazing.push(o);if(o.isMesh){o.geometry.computeBoundingBox();assert(!o.geometry.boundingBox.isEmpty());}});
a.cutaway(true);assert(glazing.every(o=>o.visible),'windows remain visible in isometric mode');
a.cutaway(false);assert(a.wallMeshes.every(o=>o.visible&&o.scale.y===1),'walk mode restores all full-height wall sections');
assert(a.root.getObjectByName('Round laundry door rim'));
assert(a.root.getObjectByName('Recessed basin'));
assert(a.root.getObjectByName('Closed toilet lid'));
assert(a.root.getObjectByName('Burner'));
console.log(`PASS: ${plan.windows.length} real window openings, exterior collision, cutaway restoration, detailed fixtures.`);
