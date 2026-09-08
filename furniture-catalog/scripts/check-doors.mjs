import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Group,Vector3} from 'three';
import {createHingedDoor} from '../app/decorate/hinged-door.ts';
import {buildArchitecture} from '../app/decorate/architecture.ts';
import {createPlayer,stepPlayer} from '../app/decorate/player.ts';
const door=createHingedDoor(new Group(),.9,Math.PI/2),parts=[...door.colliders];
const idle={x:0,z:0,yaw:0,run:false,jump:false},floor=[[-2,-2,4,4]];
const cross=()=>{const p=createPlayer(.45,.5);for(let i=0;i<120;i++)stepPlayer(p,{...idle,z:-1},1/120,door.colliders,floor);return p;};
assert(cross().z<-.4,'open doorway is traversable');
door.toggle();door.update(.1,[]);assert(door.pivot.rotation.y>0&&door.pivot.rotation.y<Math.PI/2,'animated swing');
for(let i=0;i<120;i++)door.update(1/120,[]);
assert(Math.abs(door.pivot.rotation.y)<1e-8);assert(cross().z>0,'closed leaf blocks walking');
assert(parts.every((part,i)=>part===door.colliders[i]),'collider references update in place');
door.toggle();door.update(1,[],true);assert(cross().z<-.4,'reopened doorway is traversable');
const obstacle=new Box3(new Vector3(.35,0,-.45),new Vector3(.6,1.68,-.15));
door.toggle();assert(door.update(1,[obstacle],true),'swept motion detects player/furniture obstruction');
assert(!door.colliders.some(part=>part.intersectsBox(obstacle)),'door cannot crush an obstruction');
door.update(1,[],true);assert(Math.abs(door.pivot.rotation.y-Math.PI/2)<1e-8,'blocked door reverses away');
const plan=JSON.parse(readFileSync('app/decorate/plan.json')),architecture=buildArchitecture(plan);
assert.equal(architecture.doors.length,3);
for(const door of architecture.doors){
 const before=door.colliders.map(part=>part.clone());architecture.cutaway(true);
 assert(door.colliders.every((part,i)=>part.equals(before[i])),'isometric cutaway never shortens physical doors');
 door.toggle();door.update(1,[],true);assert(Math.abs(door.pivot.rotation.y)<1e-8);
 architecture.cutaway(false);assert(door.colliders.every(part=>part.max.y>2),'walking keeps full-height collision');
}
console.log('PASS: all 3 hinged doors, animated/reversible swing, cutaway, open/closed passage, and anti-crush sweep.');
