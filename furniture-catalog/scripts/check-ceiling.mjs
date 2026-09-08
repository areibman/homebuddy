import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {createCeiling} from '../app/decorate/ceiling.ts';
const plan=JSON.parse(fs.readFileSync('app/decorate/plan.json'));
const ceiling=createCeiling(plan.footprint,plan.height);
assert.equal(ceiling.root.children.length,1);
ceiling.root.updateMatrixWorld(true);
for(const [x,z,w,d] of plan.floors){
 const ray=new T.Raycaster(new T.Vector3(x+w/2,1.6,z+d/2),new T.Vector3(0,1,0));
 const hit=ray.intersectObject(ceiling.root,true)[0];
 assert(hit,'every occupied floor section has a ceiling above it');
 assert(Math.abs(hit.point.y-plan.height)<1e-6,'underside matches room height');
}
for(const [perspective,height,visible] of [[0,15,false],[.5,6,false],[1,1.6,true],[0,15,false],[1,1.6,true],[1,3,false]]){
 ceiling.update(perspective,height);assert.equal(ceiling.root.visible,visible);
}
console.log('PASS: ceiling covers every room at the right height; FPS, cutaway, transition and reversal visibility.');
