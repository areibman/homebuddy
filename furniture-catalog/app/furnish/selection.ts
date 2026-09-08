import catalog from '../catalog.json';
import prices from '../decorate/prices.json';
import type {FurniturePlacement} from '../decorate/home-definitions';

export type Selection = {id:string;quantity:number}[];
export type PlacedItem = FurniturePlacement & {instanceId:string};
export type PlacementResult = {summary:string;placements:PlacedItem[];unplaced:{instanceId:string;reason:string}[]};
export const MAX_PIECES=40;
export const priceFor=(id:string)=>prices.find(price=>price.id===id);
export const usd=(amount:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(amount);
export function selectionFromLayout(layout:FurniturePlacement[]):Selection {
 const quantities=new Map<string,number>();
 for(const item of layout)quantities.set(item.id,(quantities.get(item.id)??0)+1);
 return Array.from(quantities,([id,quantity])=>({id,quantity}));
}
export function selectionTotal(selection:Selection){
 let cents=0,count=0,unpriced=0;
 for(const line of selection){const price=priceFor(line.id);count+=line.quantity;if(price)cents+=Math.round(price.amount*100)*line.quantity;else unpriced+=line.quantity;}
 return {amount:cents/100,count,unpriced};
}
export function validateSelection(value:unknown):Selection {
 if(!Array.isArray(value)||!value.length||value.length>catalog.length)throw new Error('Choose at least one piece of furniture.');
 const seen=new Set<string>();let total=0;
 for(const line of value){
  if(!line||typeof line.id!=='string'||!catalog.some(i=>i.id===line.id)||seen.has(line.id)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>10)throw new Error('The furniture selection is invalid.');
  seen.add(line.id);total+=line.quantity;
 }
 if(total>MAX_PIECES)throw new Error(`Choose up to ${MAX_PIECES} pieces for one arrangement.`);
 return value.map(({id,quantity})=>({id,quantity}));
}
export function instances(selection:Selection){
 return selection.flatMap(({id,quantity})=>Array.from({length:quantity},(_,index)=>({instanceId:`${id}:${index+1}`,id})));
}
