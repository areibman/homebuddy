import {Box3,Group,Vector3} from 'three';

export function createHingedDoor(pivot:Group,width:number,swing:number){
 let target=swing;
 const parts=Array.from({length:12},(_,i)=>new Box3(new Vector3(.0225+i*(width-.045)/12,.015,-.0175),new Vector3(.0225+(i+1)*(width-.045)/12,2.085,.0175)));
 const colliders=parts.map(part=>part.clone());
 function sync(){pivot.updateWorldMatrix(true,false);parts.forEach((part,i)=>colliders[i].copy(part).applyMatrix4(pivot.matrixWorld));}
 pivot.rotation.y=swing;sync();
 return {
  pivot,colliders,
  get action(){return Math.abs(target)>.001?'Close door':'Open door';},
  get moving(){return Math.abs(target-pivot.rotation.y)>.00001;},
  toggle(){target=Math.abs(target)>.001?0:swing;},
  update(dt:number,obstacles:Box3[],instant=false){
   const distance=target-pivot.rotation.y;
   if(Math.abs(distance)<.00001)return false;
   const delta=Math.sign(distance)*Math.min(Math.abs(distance),instant?Math.PI:Math.max(0,dt)*Math.PI*1.4);
   const steps=Math.max(1,Math.ceil(Math.abs(delta)/.025));
   // Small swept steps prevent a fast door from passing through the player or furniture.
   for(let i=0;i<steps;i++){
    const before=pivot.rotation.y;pivot.rotation.y+=delta/steps;sync();
    if(colliders.some(part=>obstacles.some(obstacle=>part.intersectsBox(obstacle)))){
     pivot.rotation.y=before;sync();target=Math.abs(target)>.001?0:swing;
     return true;
    }
   }
   return false;
  },
 };
}
