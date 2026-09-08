import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildArchitecture} from '../app/decorate/architecture.ts';
const p=JSON.parse(fs.readFileSync('app/decorate/homes/bush-4101/plan.json')),a=buildArchitecture(p);
assert.equal(p.fixtures.filter(f=>f.type==='shelving').length,0,'closets must not use bookcase geometry');
assert.equal(p.fixtures.filter(f=>f.type==='closet-interior').length,4);
const frame=a.root.children.find(o=>o.name==='Double door frame'&&o.userData.label==='Bedroom double doors');
assert(frame);let glazing=0;frame.traverse(o=>{if(o.name==='Frosted door glass')glazing++;});assert.equal(glazing,2,'two frosted glazed panels match the listing');const j=frame.children.filter(o=>o.name==='Door jamb');assert.equal(j.length,2,'only outer jambs, no middle post');
const spec=p.doors.find(d=>d.label==='Bedroom double doors');assert.equal(frame.position.z,Math.round((827-453)/78*1e5)/1e5,'doorway aligned to closet front, not its back');
const pair=a.doors.filter(d=>d.pivot.parent.parent===frame);assert.equal(pair.length,2);
for(const d of pair){d.toggle();d.update(1,[],true);}
a.root.updateMatrixWorld(true);
const leaves=pair.map(d=>new T.Box3().setFromObject(d.pivot.getObjectByName('Painted door leaf'))).sort((a,b)=>a.min.x-b.min.x);
assert(Math.abs(leaves[1].min.x-leaves[0].max.x)<.012,'paired leaves meet at the center');
assert(Math.abs(leaves[0].min.z-leaves[1].min.z)<1e-5,'closed leaves align in one plane');
const closetDoors=a.doors.filter(d=>p.doors[d.pivot.userData.openingIndex]?.initialOpen===false);assert.equal(closetDoors.length,5);assert(closetDoors.every(d=>d.action==='Open door'),'closet doors start closed');
a.cutaway(true);a.root.updateMatrixWorld(true);
const enclosures=a.root.getObjectByName('Closet enclosures');assert(enclosures.visible);assert.equal(enclosures.children.length,4);
for(const volume of enclosures.children){const b=new T.Box3().setFromObject(volume);assert(b.max.y>2.6);assert(volume.children.some(o=>o.name==='Closet ceiling'));}
for(const d of [...pair,...closetDoors])assert(new T.Box3().setFromObject(d.pivot).max.y>2,'door leaves remain full height in cutaway');
a.cutaway(false);assert(!enclosures.visible,'full-height walls replace cutaway enclosure overlays');
console.log('PASS: four enclosed closets, five closed closet leaves, correctly positioned double doorway, no middle jamb, aligned leaves, and full-height fronts in isometric.');
