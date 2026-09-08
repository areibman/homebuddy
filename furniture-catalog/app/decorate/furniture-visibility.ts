import * as T from 'three';

/** Temporary parents animate furniture without changing its saved placement. */
export function createFurnitureVisibility(furniture:T.Group[]){
 let shown=true,active=false,started=0;
 let tracks:{object:T.Group;parent:T.Object3D;wrapper:T.Group}[]=[];
 function finish(visible=shown){
  for(const {object,parent,wrapper} of tracks){parent.add(object);object.visible=visible;wrapper.removeFromParent();}
  tracks=[];active=false;shown=visible;
  furniture.forEach(object=>{object.visible=visible;});
 }
 function setVisible(visible:boolean,now:number,reduced=false){
  finish(shown);shown=visible;started=now;
  tracks=furniture.map(object=>{const parent=object.parent!;const wrapper=new T.Group();wrapper.name='Furniture visibility motion';parent.add(wrapper);wrapper.add(object);object.visible=true;return {object,parent,wrapper};});
  active=tracks.length>0;if(reduced||!active)finish(visible);else update(now);
 }
 function update(now:number){
  if(!active)return;let done=true;
  tracks.forEach(({wrapper},index)=>{
   const t=T.MathUtils.clamp((now-started-index*25)/750,0,1);done&&=t===1;
   const eased=t*t*(3-2*t);wrapper.position.y=40*(shown?1-eased:eased);
  });
  if(done)finish();
 }
 return {get active(){return active;},get shown(){return shown;},setVisible,update,restore(){finish(true);}};
}
