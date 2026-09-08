import * as T from 'three';
export type LayoutTrack={object:T.Group;position:T.Vector3;rotation:number;enter?:boolean;exit?:boolean};
export function createLayoutMotion(){
 let active=false,start=0,tracks:(LayoutTrack&{from:T.Vector3;angle:number})[]=[],done=()=>{};
 function finish(){if(!active)return;for(const t of tracks){t.object.position.copy(t.position);t.object.rotation.y=t.rotation;}active=false;tracks=[];done();}
 function begin(next:LayoutTrack[],now:number,complete:()=>void,reduced=false){
  finish();start=now;done=complete;tracks=next.map(t=>({...t,from:t.object.position.clone(),angle:t.object.rotation.y}));active=true;
  if(reduced)finish();else update(now);
 }
 function update(now:number){if(!active)return;const t=T.MathUtils.clamp((now-start)/950,0,1),s=t*t*(3-2*t);
  for(const track of tracks){track.object.position.lerpVectors(track.from,track.position,s);track.object.position.y+=track.enter?14*(1-s):track.exit?14*s:Math.sin(Math.PI*s)*.65;const delta=Math.atan2(Math.sin(track.rotation-track.angle),Math.cos(track.rotation-track.angle));track.object.rotation.y=track.angle+delta*s;}
  if(t===1)finish();
 }
 return {get active(){return active;},begin,update,finish};
}
