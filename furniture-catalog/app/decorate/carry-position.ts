import {Plane,Ray,Vector3} from 'three';

export const CARRY_REACH={min:.8,default:1.65,max:2.25};
const up=new Vector3(0,1,0),floor=new Plane(up,-.015);
export const clampCarryReach=(distance:number)=>Math.max(CARRY_REACH.min,Math.min(CARRY_REACH.max,distance));

export function nearbyCarryPosition(ray:Ray,origin:Vector3,forward:Vector3,reach:number,target=new Vector3()){
 const hit=ray.intersectPlane(floor,target);
 const distance=clampCarryReach(Math.min(hit?Math.hypot(hit.x-origin.x,hit.z-origin.z):reach,reach));
 target.set(ray.direction.x,0,ray.direction.z);
 if(target.lengthSq()<1e-6)target.set(forward.x,0,forward.z);
 if(target.lengthSq()<1e-6)target.set(0,0,-1);
 return target.normalize().multiplyScalar(distance).add(origin).setY(.015);
}

export function createDragAnchor(ray:Ray,position?:Vector3,surfaceHeight=.015){
 const plane=new Plane(up,-surfaceHeight),offset=new Vector3();
 const point=ray.intersectPlane(plane,new Vector3());
 if(position&&point)offset.copy(position).sub(point).setY(0);
 return {plane,offset};
}

// Keep the clicked surface point under the cursor instead of projecting a tall item onto distant floor.
export function dragCarryPosition(ray:Ray,anchor:ReturnType<typeof createDragAnchor>,target=new Vector3()){
 const point=ray.intersectPlane(anchor.plane,target);
 return point?point.add(anchor.offset).setY(.015):null;
}
