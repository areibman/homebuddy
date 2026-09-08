import {Group,Mesh,Scene} from 'three';

/** Move transactions leave the original transform intact until a valid drop. */
export function createFurnitureCarry(scene:Scene,templates:Map<string,Group>,add:(id:string,x:number,z:number,angle:number)=>Group|undefined){
 let preview:Group|null=null,source:Group|null=null;
 function cancel(){
  if(source)source.visible=true;
  if(preview){scene.remove(preview);preview.traverse(o=>{if(o instanceof Mesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});}
  preview=null;source=null;
 }
 function begin(id:string,object:Group|null=null){
  cancel();const template=templates.get(id);if(!template)return false;
  preview=template.clone(true);source=object;
  preview.traverse(o=>{if(o instanceof Mesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.transparent=true;m.opacity=.65;});o.castShadow=false;}});
  if(source){preview.position.copy(source.position);preview.rotation.copy(source.rotation);source.visible=false;}else preview.visible=false;
  scene.add(preview);return true;
 }
 function place(valid:boolean){
  if(!preview||!preview.visible||!valid)return null;
  const result=source??add(preview.userData.id,preview.position.x,preview.position.z,preview.rotation.y);
  if(source){source.position.copy(preview.position);source.rotation.copy(preview.rotation);}
  cancel();return result??null;
 }
 return {get preview(){return preview;},get source(){return source;},begin,cancel,place};
}
