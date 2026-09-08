import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildArchitecture} from '../app/decorate/architecture.ts';
import {createPlayer,stepPlayer,blocked,onFloor,PLAYER} from '../app/decorate/player.ts';
const floor=[[0,0,6,10]],idle={x:0,z:0,yaw:0,run:false,jump:false};
const box=(x,y,z,a,b,c)=>({min:{x,y,z},max:{x:a,y:b,z:c}});
const step=(p,input={},obstacles=[],floors=floor,n=1)=>{for(let i=0;i<n;i++)stepPlayer(p,{...idle,...input},1/120,obstacles,floors);};
// The original shrunken-rectangle test blocked every shared floor seam.
const seam=[[0,0,3,3],[0,3,3,3]];const p=createPlayer(1.5,2.7);step(p,{z:1},[],seam,50);assert(p.z>3.3,'must cross connected floor rectangles');assert(onFloor(1.5,3,seam));assert(!onFloor(.05,3,seam),'outer footprint remains contained');
// A round 24 cm collider clears a 30 cm opening and slides along walls.
const doorway=[box(0,0,2,1.35,2.7,2.12),box(1.65,0,2,3,2.7,2.12)];const door=createPlayer(1.5,1.5);step(door,{z:1,run:true},doorway,floor,60);assert(door.z>2.4,'narrow doorway passage');
const wall=[box(0,0,2,6,2.7,2.12)];const stop=createPlayer(3,1);step(stop,{z:1,run:true},wall,floor,240);assert(stop.z<=2-PLAYER.radius+.001,'sprint cannot tunnel through walls');
const slide=createPlayer(1,1.75);step(slide,{x:1,z:1},wall,floor,100);assert(slide.x>2&&slide.z<2,'slide along wall');
const jumper=createPlayer(3,4);step(jumper,{jump:true});let peak=0;for(let i=0;i<180;i++){step(jumper);peak=Math.max(peak,jumper.y);}assert(peak>.65&&peak<.9,'jump arc');assert.equal(jumper.y,0);assert(jumper.grounded,'lands on floor');
const air=createPlayer(3,4);step(air,{jump:true});step(air,{},[],floor,20);const vy=air.vy;step(air,{jump:true});assert(air.vy<vy,'no double jump');
const ceiling=createPlayer(3,4);for(let i=0;i<120;i++)stepPlayer(ceiling,{...idle,jump:i===0},1/120,[],floor,2);assert(ceiling.y+PLAYER.height<=2,'head collision');
const landing=createPlayer(3,4);landing.y=1.1;landing.grounded=false;step(landing,{},[box(2,0,3,4,.5,5)],floor,120);assert.equal(landing.y,.5,'land on low furniture');assert(landing.grounded);
const run=createPlayer(1,1),walk=createPlayer(1,1);step(run,{z:1,run:true},[],floor,120);step(walk,{z:1},[],floor,120);assert(run.z>walk.z+1,'sprint faster than walk');
const plan=JSON.parse(fs.readFileSync('app/decorate/plan.json'));const items=JSON.parse(fs.readFileSync('app/decorate/items.json'));
const obstacles=[...buildArchitecture(plan).colliders,...plan.furniture.filter(f=>f.id!=='rug').map(f=>{const d=items.find(i=>i.id===f.id).dimensions_m;const w=Math.abs(Math.cos(f.r))*d.width+Math.abs(Math.sin(f.r))*d.depth,h=Math.abs(Math.sin(f.r))*d.width+Math.abs(Math.cos(f.r))*d.depth;return box(f.x-w/2,.01,f.z-h/2,f.x+w/2,d.height+.01,f.z+h/2);})];
const player=createPlayer(),queue=[[57,71]],seen=new Set(['57,71']);assert(!blocked(player,player.x,player.z,obstacles,plan.floors));
for(let n=0;n<queue.length;n++){const [x,z]=queue[n];for(const [a,b] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]]){const k=[a,b].join(',');if(!seen.has(k)&&!blocked(player,a/10,b/10,obstacles,plan.floors)){seen.add(k);queue.push([a,b]);}}}
for(const [name,x,z] of [['bedroom',25,29],['living',15,57],['bathroom',45,54]])assert(seen.has([x,z].join(',')),`${name} reachable using actual player collision`);
console.log('PASS: floor seams, narrow doorways, sprint collision, wall sliding, jump/landing, no double jump, ceiling, furniture landing, and all furnished rooms reachable.');
