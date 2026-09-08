export type LookDirection='up'|'down'|'left'|'right';
export function lookDelta(keys:ReadonlySet<string>,dt:number){
 return {yaw:(Number(keys.has('arrowleft'))-Number(keys.has('arrowright')))*1.6*dt,
 pitch:(Number(keys.has('arrowup'))-Number(keys.has('arrowdown')))*1.2*dt};
}
export type ObjectHint={id:string;name:string;x:number;y:number}|null;
