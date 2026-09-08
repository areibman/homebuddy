import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildArchitecture} from '../app/decorate/architecture.ts';
import {blocked,createPlayer} from '../app/decorate/player.ts';
const p=JSON.parse(fs.readFileSync('app/decorate/homes/bush-4101/plan.json')),catalog=JSON.parse(fs.readFileSync('app/catalog.json'));
const architecture=buildArchitecture(p),inside=(x,z)=>p.floors.some(([a,b,w,d])=>x>=a-1e-4&&x<=a+w+1e-4&&z>=b-1e-4&&z<=b+d+1e-4);
// Closed closet doors are usable portals; open them before checking room reachability.
for(const d of architecture.doors)if(d.action==='Open door'){d.toggle();d.update(1,architecture.fixtureColliders,true);}
let issues=[];
for(const layout of p.layouts){
 const furniture=layout.furniture.map(f=>{const item=catalog.find(i=>i.id===f.id);assert(item&&fs.existsSync('public'+item.files.glb.split('?')[0]));const d=item.dimensions_m,w=Math.abs(Math.cos(f.r))*d.width+Math.abs(Math.sin(f.r))*d.depth,h=Math.abs(Math.sin(f.r))*d.width+Math.abs(Math.cos(f.r))*d.depth;return {id:f.id,b:new T.Box3(new T.Vector3(f.x-w/2,.02,f.z-h/2),new T.Vector3(f.x+w/2,d.height,f.z+h/2))};});
 for(const [i,f] of furniture.entries()){
  const b=f.b; if(![[b.min.x,b.min.z],[b.max.x,b.min.z],[b.min.x,b.max.z],[b.max.x,b.max.z]].every(([x,z])=>inside(x,z)))issues.push(`${layout.id} #${i} ${f.id} outside floor`);
  if(architecture.colliders.some(v=>v.intersectsBox(b.clone().expandByScalar(-.015))))issues.push(`${layout.id} #${i} ${f.id} intersects fixed geometry`);
  if(f.id!=='rug')for(let j=0;j<i;j++)if(furniture[j].id!=='rug'&&furniture[j].b.intersectsBox(b.clone().expandByScalar(-.015)))issues.push(`${layout.id} #${i} ${f.id} overlaps #${j} ${furniture[j].id}`);
 }
 const obstacles=[...architecture.colliders,...furniture.filter(f=>f.id!=='rug').map(f=>f.b)];
 const step=.08,start=p.spawn.map(n=>Math.round(n/step)),queue=[start],seen=new Set([start.join(',')]);
 const isBlocked=(x,z)=>blocked(createPlayer(x,z),x,z,obstacles,p.floors);
 if(isBlocked(...p.spawn))issues.push('Spawn obstructed');
 for(let n=0;n<queue.length;n++){const [x,z]=queue[n];for(const [a,b] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]]){const k=[a,b].join(',');if(!seen.has(k)&&!isBlocked(a*step,b*step)){seen.add(k);queue.push([a,b]);}}}
 for(const room of p.rooms){const [x,z]=room.point.map(n=>Math.round(n/step));if(!seen.has([x,z].join(',')))issues.push(`${layout.id}: ${room.name} unreachable`);}
 console.log(`${layout.name}: ${furniture.length} pieces, ${seen.size} reachable walking cells`);
}
const types=new Set(p.fixtures.map(f=>f.type));for(const t of ['stove','refrigerator','laundry','dishwasher','sink','vanity','toilet','shower'])assert(types.has(t));
assert.equal(p.fixtures.filter(f=>f.type==='toilet').length,2);assert.equal(p.windows.length,6);
console.log(issues);assert.equal(issues.length,0);
console.log('PASS: both layouts fit, all rooms reachable, both bathrooms and kitchen/laundry complete.');
