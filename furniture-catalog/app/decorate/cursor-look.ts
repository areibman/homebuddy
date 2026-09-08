/** Uncaptured cursor look for embedded browsers without Pointer Lock. */
export function createCursorLook(){
 let previous:{x:number;y:number}|null=null,edge=0;
 return {
  reset(){previous=null;edge=0;},
  move(x:number,y:number,left:number,width:number){
   const dx=previous?x-previous.x:0,dy=previous?y-previous.y:0;previous={x,y};
   const nx=(x-left)/width*2-1;
   edge=Math.abs(nx)>.85?Math.sign(nx)*(Math.abs(nx)-.85)/.15:0;
   return {dx,dy};
  },
  turn(dt:number){return edge*1.5*dt;},
 };
}
