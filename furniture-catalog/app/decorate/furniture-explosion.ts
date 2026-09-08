import * as T from 'three';

/** A temporary inspection layout; the authored furniture transforms stay recoverable. */
export function createFurnitureExplosion(furniture:T.Group[],footprint:number[][],height:number,camera:T.OrthographicCamera,target:T.Vector3){
 const room=new T.Box3();footprint.forEach(([x,z])=>{room.expandByPoint(new T.Vector3(x,0,z));room.expandByPoint(new T.Vector3(x,height,z));});
 let expanded=false,active=false,started=0;
 let originals=new Map<T.Group,T.Vector3>();
 let tracks:{object:T.Group;from:T.Vector3;to:T.Vector3}[]=[];
 type View={position:T.Vector3;target:T.Vector3;zoom:number};
 const snapshot=():View=>({position:camera.position.clone(),target:target.clone(),zoom:camera.zoom});
 let saved:View|null=null,from=snapshot(),to=snapshot();
 function applyView(view:View){camera.position.copy(view.position);target.copy(view.target);camera.zoom=view.zoom;camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 function fit():View{
  const all=room.clone();for(const object of furniture)all.union(new T.Box3().setFromObject(object));
  const center=all.getCenter(new T.Vector3());center.y=0;
  const view={position:camera.position.clone().add(center.clone().sub(target)),target:center,zoom:1};
  const probe=camera.clone();probe.position.copy(view.position);probe.lookAt(center);probe.updateMatrixWorld(true);
  let width=0,vertical=0;
  for(const x of [all.min.x,all.max.x])for(const y of [all.min.y,all.max.y])for(const z of [all.min.z,all.max.z]){
   const p=new T.Vector3(x,y,z).applyMatrix4(probe.matrixWorldInverse);width=Math.max(width,Math.abs(p.x));vertical=Math.max(vertical,Math.abs(p.y));
  }
  // Reserve room for the toolbar and inventory, including portrait screens.
  view.zoom=Math.min((camera.right-camera.left)*.40/Math.max(width,.1),(camera.top-camera.bottom)*.32/Math.max(vertical,.1),1);
  return view;
 }
 function finish(){if(!active)return;for(const track of tracks)track.object.position.copy(track.to);applyView(to);active=false;tracks=[];if(!expanded){originals.clear();saved=null;}}
 function update(now:number){
  if(!active)return;const t=T.MathUtils.clamp((now-started)/950,0,1),s=t*t*(3-2*t);
  for(const track of tracks){track.object.position.lerpVectors(track.from,track.to,s);track.object.position.y+=Math.sin(Math.PI*s)*.7;}
  applyView({position:from.position.clone().lerp(to.position,s),target:from.target.clone().lerp(to.target,s),zoom:T.MathUtils.lerp(from.zoom,to.zoom,s)});
  if(t===1)finish();
 }
 function setExpanded(next:boolean,now:number,reduced=false){
  finish();if(next===expanded)return;from=snapshot();started=now;
  if(next){
   saved=from;originals=new Map(furniture.map(object=>[object,object.position.clone()]));
   const sizes=furniture.map(object=>new T.Box3().setFromObject(object).getSize(new T.Vector3()));
   const cellX=Math.max(1,...sizes.map(size=>size.x))+1.2,cellZ=Math.max(1,...sizes.map(size=>size.z))+1.2;
   const columns=Math.max(1,Math.ceil(Math.sqrt(furniture.length))),centerX=(room.min.x+room.max.x)/2;
   tracks=furniture.map((object,i)=>({object,from:object.position.clone(),to:new T.Vector3(centerX+((i%columns)-(columns-1)/2)*cellX,.01,room.max.z+1.5+cellZ/2+Math.floor(i/columns)*cellZ)}));
   for(const track of tracks)track.object.position.copy(track.to);
   to=fit();for(const track of tracks)track.object.position.copy(track.from);
  }else{
   tracks=furniture.flatMap(object=>{const position=originals.get(object);return position?[{object,from:object.position.clone(),to:position.clone()}]:[];});
   to=saved??from;
  }
  expanded=next;active=true;if(reduced)finish();else update(now);
 }
 function restore(){if(expanded)setExpanded(false,0,true);else finish();}
 function resize(){if(!expanded)return;finish();applyView(fit());}
 return {get expanded(){return expanded;},get active(){return active;},setExpanded,update,finish,restore,resize};
}
