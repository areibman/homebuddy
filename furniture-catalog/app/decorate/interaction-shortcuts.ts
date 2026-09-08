export type InteractionAction='inventory'|'details'|'remove'|'place'|'cancel'|'dismiss'|null;
export function interactionAction(key:string,placing:boolean,selected:boolean):InteractionAction{
 const k=key.toLowerCase();
 if(k==='e')return 'inventory';
 if(k==='escape')return placing?'cancel':selected?'dismiss':null;
 if(k==='enter'&&placing)return 'place';
 if((k==='delete'||k==='backspace')&&selected&&!placing)return 'remove';
 return null;
}
export function rightClickAction(placing:boolean,selected:boolean):InteractionAction{return placing||selected?'details':null;}
export function rotationDelta(keys:ReadonlySet<string>,dt:number){
 return (Number(keys.has('r'))-Number(keys.has('q')))*Math.PI/2*dt*(keys.has('shift')?.25:1);
}
