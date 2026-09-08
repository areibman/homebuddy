'use client';
import {useRef} from 'react';
import {Keycap,MouseGlyph} from './input-glyph';
import type {ObjectHint} from './look-input';
import items from '../catalog.json';
import {Trash2} from 'lucide-react';
function RotationButton({direction,rotate,quarterTurn=false}:{direction:'q'|'r';rotate:(direction:'q'|'r',quarterTurn?:boolean)=>void;quarterTurn?:boolean}){
 return <button aria-label={'Rotate '+(direction==='q'?'left':'right')+(quarterTurn?' 90 degrees':' 15 degrees')} aria-keyshortcuts={(quarterTurn?'Shift+':'')+direction.toUpperCase()} title={quarterTurn?'Snap to next 90° angle · Shift+R':'Rotate 15° · Shift for 90°'}
 onPointerDown={e=>e.preventDefault()}
 onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.stopPropagation();if(e.repeat)e.preventDefault();}}}
 onClick={e=>rotate(direction,quarterTurn||e.shiftKey)}>{quarterTurn?<Keycap>90°</Keycap>:<><Keycap>{direction.toUpperCase()}</Keycap><span>{direction==='q'?'↶':'↷'}</span></>}</button>;
}
export function PlacementPopover({id,hint,valid,place,rotate,details,remove,cancel}:{id:string;hint:ObjectHint;valid:boolean;place:()=>void;rotate:(direction:'q'|'r',quarterTurn?:boolean)=>void;details:()=>void;remove:()=>void;cancel:()=>void}){
 const item=items.find(item=>item.id===id);
 // Keep actions reachable while the carried object follows the cursor.
 const anchor=useRef<ObjectHint>(null);
 if(!anchor.current&&hint)anchor.current=hint;
 const position=anchor.current;
 return <div className={'placement-popover '+(position?'is-anchored':'')} style={position?{left:`min(${position.x}px, max(12px, calc(100% - 292px)))`,top:`min(${position.y}px, max(12px, calc(100% - 190px)))`}:undefined} role="group" aria-label="Furniture in hand" onContextMenu={e=>{e.preventDefault();details();}}>
  <div className="placement-name"><img src={item?.files.preview} alt=""/><div><strong>{item?.name}</strong><small className={valid?'':'is-blocked'}>{valid?'Ready to place':'Find a clear floor area'}</small></div><button aria-label="Cancel placement" title="Cancel · Escape" onClick={cancel}><Keycap>esc</Keycap></button></div>
  <div className="placement-actions"><button disabled={!valid} aria-label="Place furniture" onClick={place}><MouseGlyph/><span>Place</span></button><button aria-label="Furniture details" onClick={details}><MouseGlyph button="right"/><span>Details</span></button><button className="placement-delete" aria-label="Delete furniture" aria-keyshortcuts="Delete Backspace" title="Delete furniture · Delete / Backspace" onClick={remove}><Trash2 size={16}/><span>Delete</span></button></div>
  <div className="rotation-controls"><span>Rotate <small>15°</small></span><RotationButton direction="q" rotate={rotate}/><RotationButton direction="r" rotate={rotate}/><RotationButton direction="r" rotate={rotate} quarterTurn/></div>
 </div>;
}
