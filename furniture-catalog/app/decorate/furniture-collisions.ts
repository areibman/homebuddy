import {Box3,Group,Mesh} from 'three';

/** Preserve separate mattress, seat, back, and leg surfaces instead of one tall block. */
export function createFurnitureCollisions(){
 const cache=new WeakMap<Group,{transform:number[];boxes:Box3[]}>();
 return (group:Group)=>{
  group.updateMatrixWorld(true);
  const transform=group.matrixWorld.elements,previous=cache.get(group);
  if(previous&&transform.every((value,index)=>value===previous.transform[index]))return previous.boxes;
  const boxes:Box3[]=[];
  group.traverse(object=>{
   if(!(object instanceof Mesh))return;
   object.geometry.computeBoundingBox();
   if(object.geometry.boundingBox)boxes.push(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  cache.set(group,{transform:[...transform],boxes});
  return boxes;
 };
}
