export type InteractionAction='inventory'|'details'|'remove'|'place'|'cancel'|'dismiss'|null;
export function interactionAction(key:string,placing:boolean,selected:boolean,hovered=false):InteractionAction{
 const k=key.toLowerCase();
 if(k==='e')return 'inventory';
 if(k==='escape')return placing?'cancel':selected?'dismiss':null;
 if(k==='enter'&&placing)return 'place';
 if((k==='delete'||k==='backspace')&&(placing||selected||hovered))return 'remove';
 return null;
}
export function rightClickAction(placing:boolean,selected:boolean):InteractionAction{return placing||selected?'details':null;}
/** Snap to the next world-aligned 15° or 90° stop, including imported off-grid angles. */
export function snappedRotation(angle:number,direction:'q'|'r',quarterTurn=false){
 const divisions=quarterTurn?4:24,step=Math.PI*2/divisions;
 let ticks=angle/step;
 if(Math.abs(ticks-Math.round(ticks))<1e-4)ticks=Math.round(ticks);
 const next=direction==='r'?Math.floor(ticks)+1:Math.ceil(ticks)-1;
 return ((next%divisions)+divisions)%divisions*step;
}
