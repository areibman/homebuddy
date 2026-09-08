import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import {buildArchitecture} from '../app/decorate/architecture.ts';
const p=JSON.parse(fs.readFileSync('app/decorate/homes/bush-4101/plan.json')),items=JSON.parse(fs.readFileSync('app/catalog.json'));
let failures=[];
for(const layout of p.layouts){const a=buildArchitecture(p),obs=[...a.fixtureColliders];for(const f of layout.furniture){if(f.id==='rug')continue;const d=items.find(i=>i.id===f.id).dimensions_m;const b=new T.Box3(new T.Vector3(-d.width/2,.02,-d.depth/2),new T.Vector3(d.width/2,d.height,d.depth/2));obs.push(b.applyMatrix4(new T.Matrix4().makeRotationY(f.r).setPosition(f.x,0,f.z)));}
 for(const [i,d] of a.doors.entries()){d.toggle();const close=d.update(1,obs,true);d.toggle();const open=d.update(1,obs,true);if(close||open)failures.push(`${layout.id} ${p.doors[d.pivot.userData.openingIndex]?.label} blocked: close=${close}, open=${open}`);}}
assert.deepEqual(failures,[]);console.log('PASS: all 11 doors close and reopen through their full swing in both arrangements.');
