import fs from 'node:fs';
import {buildArchitecture} from '../app/decorate/architecture.ts';
import assert from 'node:assert/strict';
const p=JSON.parse(fs.readFileSync('app/decorate/plan.json'));const items=JSON.parse(fs.readFileSync('app/catalog.json'));
const inside=(x,z)=>p.floors.some(([a,b,w,d])=>x>=a&&x<=a+w&&z>=b&&z<=b+d);
const overlap=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
const fixed=buildArchitecture(p).colliders.map(b=>[b.min.x,b.min.z,b.max.x,b.max.z]);
const furniture=p.furniture.map(f=>{const i=items.find(i=>i.id===f.id);assert(fs.existsSync('public'+i.files.glb.split('?')[0]));assert(fs.existsSync('public'+i.files.preview.split('?')[0]));const d=i.dimensions_m;const w=Math.abs(Math.cos(f.r))*d.width+Math.abs(Math.sin(f.r))*d.depth;const h=Math.abs(Math.sin(f.r))*d.width+Math.abs(Math.cos(f.r))*d.depth;return {id:f.id,b:[f.x-w/2,f.z-h/2,f.x+w/2,f.z+h/2]};});
for(const f of furniture){const [a,b,c,d]=f.b;assert([[a,b],[c,b],[a,d],[c,d]].every(([x,z])=>inside(x,z)),`${f.id} outside floor`);assert(!fixed.some(v=>overlap(f.b,v)),`${f.id} intersects fixed geometry`);if(f.id!=='rug')assert(!furniture.some(v=>v!==f&&v.id!=='rug'&&overlap(f.b,v.b)),`${f.id} overlaps furniture`);}
const blocked=(x,z)=>!inside(x,z)||fixed.concat(furniture.filter(f=>f.id!=='rug').map(f=>f.b)).some(b=>overlap([x-.16,z-.16,x+.16,z+.16],b));
const start=[57,71],queue=[start],seen=new Set([start.join(',')]);assert(!blocked(5.7,7.1),'spawn blocked');
for(let n=0;n<queue.length;n++){const [x,z]=queue[n];for(const [a,b] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]]){const k=[a,b].join(',');if(!seen.has(k)&&!blocked(a/10,b/10)){seen.add(k);queue.push([a,b]);}}}
for(const [name,x,z] of [['bedroom',25,29],['living',15,57],['bathroom',45,54]])assert(seen.has([x,z].join(',')),`${name} unreachable`);
console.log(`PASS: ${furniture.length} furnished pieces, no wall/furniture overlaps; bedroom, living room and bathroom reachable from spawn.`);
