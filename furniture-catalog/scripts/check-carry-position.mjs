import assert from 'node:assert/strict';
import {Ray,Vector3} from 'three';
import {CARRY_REACH,clampCarryReach,nearbyCarryPosition,createDragAnchor,dragCarryPosition} from '../app/decorate/carry-position.ts';

const origin=new Vector3(5,1.55,7),forward=new Vector3(0,0,-1);
const distance=p=>Math.hypot(p.x-origin.x,p.z-origin.z);
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
for(const pitch of [-1,-.1,-.000001,0,.000001,.1,1]){
 const ray=new Ray(origin,new Vector3(0,pitch,-1).normalize());
 const point=nearbyCarryPosition(ray,origin,forward,100);
 assert(Number.isFinite(point.x)&&Number.isFinite(point.z));
 assert(distance(point)<=CARRY_REACH.max+1e-8);
 assert(distance(point)>=CARRY_REACH.min-1e-8);
 close(point.y,.015);
}
for(const pitch of [-.000001,0,.000001]){
 const point=nearbyCarryPosition(new Ray(origin,new Vector3(0,pitch,-1).normalize()),origin,forward,CARRY_REACH.default);
 close(distance(point),CARRY_REACH.default);
}
close(clampCarryReach(100),2.25);close(clampCarryReach(.1),.8);
const down=nearbyCarryPosition(new Ray(origin,new Vector3(0,-1,0)),origin,forward,1.65);
close(distance(down),.8);assert(down.z<origin.z,'vertical aiming retains camera heading');
const translated=origin.clone().add(new Vector3(2,0,3));
const moving=nearbyCarryPosition(new Ray(translated,forward),translated,forward,1.65);
close(moving.x,translated.x);close(moving.z,translated.z-1.65);

const item=new Vector3(2,.01,3),surface=new Vector3(2.3,1.2,3.2);
const ray=new Ray(new Vector3(13,15,18),surface.clone().sub(new Vector3(13,15,18)).normalize());
const anchor=createDragAnchor(ray,item,surface.y);
const picked=dragCarryPosition(ray,anchor);
close(picked.x,item.x);close(picked.z,item.z);
const drag=new Ray(ray.origin.clone().add(new Vector3(.2,0,-.3)),ray.direction);
const moved=dragCarryPosition(drag,anchor);
close(moved.x,item.x+.2);close(moved.z,item.z-.3);
assert.equal(dragCarryPosition(new Ray(ray.origin,new Vector3(1,0,0)),anchor),null);
console.log('PASS: bounded first-person reach, horizon continuity, vertical aim, player movement, and no-jump isometric pickup/drag.');
