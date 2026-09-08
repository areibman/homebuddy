import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {createLayoutMotion} from '../app/decorate/layout-motion.ts';
const plan=JSON.parse(fs.readFileSync('app/decorate/homes/bush-4101/plan.json'));
const scene=new T.Scene(),objects=plan.layouts[0].furniture.map(p=>{const o=new T.Group();o.position.set(p.x,.01,p.z);o.rotation.y=p.r;scene.add(o);return o;});
const motion=createLayoutMotion();let completed=0;
for(const [index,now] of [[1,0],[0,1000]]){
 const tracks=plan.layouts[index].furniture.map((p,i)=>({object:objects[i],position:new T.Vector3(p.x,.01,p.z),rotation:p.r}));
 motion.begin(tracks,now,()=>completed++);motion.update(now+400);assert(motion.active);assert(objects.some(o=>o.position.y>.1));
 motion.update(now+950);assert(!motion.active);
 tracks.forEach(t=>{assert(t.object.position.equals(t.position));assert.equal(t.object.rotation.y,t.rotation);assert.equal(t.object.parent,scene);});
}
assert.equal(completed,2);motion.begin([{object:objects[0],position:new T.Vector3(1,.01,1),rotation:0}],2000,()=>completed++,true);assert(!motion.active);assert.equal(completed,3);
const source=fs.readFileSync('app/decorate/page.tsx','utf8');assert(!source.includes("href={'/decorate?home='"),'layout controls must not navigate');assert(source.includes('role="switch"'));
console.log('PASS: Gather/Retreat animate existing objects both ways, exact endpoints, reduced motion, and non-navigating controls.');
