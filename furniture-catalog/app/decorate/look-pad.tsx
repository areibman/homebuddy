'use client';
import {useRef} from 'react';
import type {LookDirection} from './look-input';
export function LookPad({hold,nudge}:{hold:(direction:LookDirection,pressed:boolean)=>void;nudge:(direction:LookDirection)=>void}){
 const pressedAt=useRef<Partial<Record<LookDirection,number>>>({});
 return <div className="look-pad" role="group" aria-label="Look around"><span>LOOK</span>{(['up','left','down','right'] as const).map(direction=><button key={direction} className={'look-'+direction} aria-label={'Look '+direction} title={'Look '+direction+' · Arrow '+direction}
 onPointerDown={e=>{e.preventDefault();pressedAt.current[direction]=performance.now();e.currentTarget.setPointerCapture(e.pointerId);hold(direction,true);}}
 onPointerUp={e=>{hold(direction,false);const started=pressedAt.current[direction];delete pressedAt.current[direction];if(started!==undefined&&performance.now()-started<150)nudge(direction);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
 onPointerCancel={()=>hold(direction,false)} onLostPointerCapture={()=>hold(direction,false)}
 onClick={e=>{if(e.detail===0)nudge(direction);}}>{({up:'↑',left:'←',down:'↓',right:'→'})[direction]}</button>)}</div>;
}
