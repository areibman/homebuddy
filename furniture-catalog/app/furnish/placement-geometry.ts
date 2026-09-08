import catalog from '../catalog.json';
import type {HomePlan} from '../decorate/home-definitions';
import {instances,type Selection,type PlacementResult,type PlacedItem} from './selection';

type Point={x:number;z:number};
type Rect={x:number;z:number;width:number;depth:number;r:number};
function corners(b:Rect):Point[]{
 const c=Math.cos(b.r),s=Math.sin(b.r);
 return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>({x:b.x+c*x*b.width/2+s*z*b.depth/2,z:b.z-s*x*b.width/2+c*z*b.depth/2}));
}
function intersects(a:Rect,b:Rect,slack=.015){
 const aa=corners(a),bb=corners(b);
 for(const r of [a.r,b.r])for(const axis of [{x:Math.cos(r),z:-Math.sin(r)},{x:Math.sin(r),z:Math.cos(r)}]){
  const ap=aa.map(p=>p.x*axis.x+p.z*axis.z),bp=bb.map(p=>p.x*axis.x+p.z*axis.z);
  if(Math.max(...ap)<=Math.min(...bp)+slack||Math.max(...bp)<=Math.min(...ap)+slack)return false;
 }
 return true;
}
function footprint(p:PlacedItem):Rect{
 const d=catalog.find(i=>i.id===p.id)!.dimensions_m;
 return {x:p.x,z:p.z,width:d.width,depth:d.depth,r:p.r};
}
export function fixedFootprints(plan:HomePlan):Rect[]{
 return [
  ...plan.walls.map(([x,z,xx,zz])=>({x:(x+xx)/2,z:(z+zz)/2,width:Math.hypot(xx-x,zz-z)+.12,depth:.12,r:-Math.atan2(zz-z,xx-x)})),
  ...(plan.columns??[]).map(([x,z,width,depth])=>({x:x+width/2,z:z+depth/2,width,depth,r:0})),
  ...plan.fixtures.filter(f=>(f.y??0)<.1).map(f=>({x:f.x,z:f.z,width:f.width,depth:f.depth,r:f.rotation??0})),
  ...(plan.closetVolumes??[]).map(({rect:[x,z,width,depth]})=>({x:x+width/2,z:z+depth/2,width,depth,r:0})),
 ];
}
function walkingIssues(plan:HomePlan,placed:{item:PlacedItem;rect:Rect}[]):string[]{
 const rooms=(plan as HomePlan & {rooms?:{name:string;point:number[]}[]}).rooms;
 if(!plan.spawn||!rooms?.length)return [];
 const fixed=fixedFootprints({...plan,closetVolumes:[]});
 // Open doors are traversable portals, but their open leaves remain obstacles.
 for(const door of plan.doors)for(let leaf=0;leaf<(door.leaves??1);leaf++){
  const width=door.width/(door.leaves??1),r=door.rotation+(leaf?Math.PI:0)+door.swing*(leaf?-1:1);
  const x=door.x+(leaf?Math.cos(door.rotation)*door.width:0),z=door.z-(leaf?Math.sin(door.rotation)*door.width:0);
  fixed.push({x:x+Math.cos(r)*width/2,z:z-Math.sin(r)*width/2,width,depth:.04,r});
 }
 const obstacles=[...fixed,...placed.filter(p=>p.item.id!=='rug').map(p=>p.rect)].map(b=>({...b,c:Math.cos(b.r),s:Math.sin(b.r)}));
 const radius=.12,step=.08,xmin=Math.min(...plan.footprint.map(p=>p[0]))-step,zmin=Math.min(...plan.footprint.map(p=>p[1]))-step;
 const width=Math.ceil((Math.max(...plan.footprint.map(p=>p[0]))-xmin)/step)+1,depth=Math.ceil((Math.max(...plan.footprint.map(p=>p[1]))-zmin)/step)+1;
 const inside=(x:number,z:number)=>plan.floors.some(([a,b,w,d])=>x>=a&&x<=a+w&&z>=b&&z<=b+d);
 const states=new Uint8Array(width*depth),queue:number[]=[];
 function free(ix:number,iz:number){
  if(ix<0||iz<0||ix>=width||iz>=depth)return false;const index=iz*width+ix;
  if(states[index])return states[index]===1;
  const x=xmin+ix*step,z=zmin+iz*step;
  const clear=inside(x,z)&&[[radius,0],[-radius,0],[0,radius],[0,-radius]].every(([dx,dz])=>inside(x+dx,z+dz))&&!obstacles.some(b=>{
   const dx=x-b.x,dz=z-b.z,localX=dx*b.c-dz*b.s,localZ=dx*b.s+dz*b.c;
   const ax=Math.max(0,Math.abs(localX)-b.width/2),az=Math.max(0,Math.abs(localZ)-b.depth/2);
   return ax*ax+az*az<radius*radius;
  });states[index]=clear?1:2;return clear;
 }
 const sx=Math.round((plan.spawn[0]-xmin)/step),sz=Math.round((plan.spawn[1]-zmin)/step);
 if(!free(sx,sz))return ['The apartment entrance is not walkable.'];
 queue.push(sz*width+sx);states[sz*width+sx]=3;
 for(let i=0;i<queue.length;i++){const index=queue[i],x=index%width,z=Math.floor(index/width);for(const [nx,nz] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]])if(free(nx,nz)){const next=nz*width+nx;states[next]=3;queue.push(next);}}
 return rooms.filter(room=>!queue.some(index=>Math.hypot(xmin+(index%width)*step-room.point[0],zmin+Math.floor(index/width)*step-room.point[1])<.5)).map(room=>`Keep a walking path from the entrance to ${room.name}, near (${room.point.join(', ')}).`);
}
export function validatePlacementResult(raw:unknown,selection:Selection,plan:HomePlan):{result:PlacementResult;issues:string[]}{
 const value=raw as PlacementResult;
 if(!value||typeof value.summary!=='string'||value.summary.length>2000||!Array.isArray(value.placements)||!Array.isArray(value.unplaced))throw new Error('Astra returned an unreadable arrangement. Try again.');
 const expected=new Map(instances(selection).map(i=>[i.instanceId,i.id])),seen=new Set<string>(),issues:string[]=[];
 const fixed=fixedFootprints(plan),placed:{item:PlacedItem;rect:Rect}[]=[];
 const inside=(x:number,z:number)=>plan.floors.some(([a,b,w,d])=>x>=a-.001&&x<=a+w+.001&&z>=b-.001&&z<=b+d+.001);
 for(const p of value.placements){
  if(!p||expected.get(p.instanceId)!==p.id||seen.has(p.instanceId)||![p.x,p.z,p.r].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<100))throw new Error('Astra returned an invalid furniture placement. Try again.');
  seen.add(p.instanceId);const rect=footprint(p);
  // Sample the whole footprint, not only corners: floor sections can be concave.
  const nx=Math.ceil(rect.width/.15),nz=Math.ceil(rect.depth/.15),c=Math.cos(p.r),s=Math.sin(p.r);let fits=true;
  for(let x=0;x<=nx&&fits;x++)for(let z=0;z<=nz;z++){const dx=(x/nx-.5)*rect.width,dz=(z/nz-.5)*rect.depth;if(!inside(p.x+c*dx+s*dz,p.z-s*dx+c*dz)){fits=false;break;}}
  if(!fits)issues.push(`${p.instanceId} extends outside the apartment.`);
  if(fixed.some(f=>intersects(rect,f)))issues.push(`${p.instanceId} intersects a wall, fixture, column, or closet.`);
  if(p.id!=='rug'){
   for(const previous of placed)if(previous.item.id!=='rug'&&intersects(rect,previous.rect))issues.push(`${p.instanceId} overlaps ${previous.item.instanceId}.`);
   if(plan.spawn&&intersects(rect,{x:plan.spawn[0],z:plan.spawn[1],width:.65,depth:.65,r:0}))issues.push(`${p.instanceId} blocks the entrance.`);
   for(const door of plan.doors){
    const width=door.width/(door.leaves??1);
    let obstructed=false;
    for(let leaf=0;leaf<(door.leaves??1)&&!obstructed;leaf++)for(let step=0;step<=12;step++){
     const base=door.rotation+(leaf?Math.PI:0),hingeX=door.x+(leaf?Math.cos(door.rotation)*door.width:0),hingeZ=door.z-(leaf?Math.sin(door.rotation)*door.width:0);
     const r=base+door.swing*(leaf?-1:1)*step/12;
     if(intersects(rect,{x:hingeX+Math.cos(r)*width/2,z:hingeZ-Math.sin(r)*width/2,width,depth:.06,r})){obstructed=true;break;}
    }
    if(obstructed)issues.push(`${p.instanceId} blocks ${door.label??'a door'} from opening.`);
   }
  }
  placed.push({item:p,rect});
 }
 for(const p of value.unplaced){if(!p||!expected.has(p.instanceId)||seen.has(p.instanceId)||typeof p.reason!=='string'||!p.reason.trim()||p.reason.length>500)throw new Error('Astra returned an invalid unplaced item. Try again.');seen.add(p.instanceId);}
 if(seen.size!==expected.size)throw new Error('Astra did not account for every selected piece. Try again.');
 issues.push(...walkingIssues(plan,placed));
 return {result:value,issues:[...new Set(issues)]};
}
