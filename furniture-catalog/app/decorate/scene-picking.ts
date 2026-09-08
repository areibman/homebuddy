import type {Group,Mesh,Raycaster,Object3D} from 'three';
export function isVisible(object:Object3D):boolean{for(let parent:Object3D|null=object;parent;parent=parent.parent)if(!parent.visible)return false;return true;}
/** Resolve only visible furniture, never objects hidden behind room geometry. */
export function pickFurniture(ray:Raycaster,furniture:Group[],blockers:Mesh[]):Group|null{
 const hit=ray.intersectObjects(furniture,true).find(hit=>isVisible(hit.object));if(!hit)return null;
 const obstruction=ray.intersectObjects(blockers.filter(isVisible),false)[0];if(obstruction&&obstruction.distance<hit.distance)return null;
 let object=hit.object;
 while(object.parent&&!furniture.includes(object as Group))object=object.parent;
 return furniture.includes(object as Group)?object as Group:null;
}
