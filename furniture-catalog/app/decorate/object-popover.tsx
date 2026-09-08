'use client';
import {useRef} from 'react';
import {Keycap,MouseGlyph} from './input-glyph';
import type {ObjectHint} from './look-input';
import items from './items.json';
import {Trash2} from 'lucide-react';
function RotationButton({direction,rotate}:{direction:'q'|'r';rotate:(direction:'q'|'r',pressed:boolean)=>void}){
 return <button aria-label={'Hold to rotate '+(direction==='q'?'left':'right')} aria-keyshortcuts={direction.toUpperCase()} title="Hold to rotate · Shift for precision"
 onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);rotate(direction,true);}}
 onPointerUp={()=>rotate(direction,false)} onPointerCancel={()=>rotate(direction,false)} onLostPointerCapture={()=>rotate(direction,false)} onBlur={()=>rotate(direction,false)}
 onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();rotate(direction,true);}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();rotate(direction,false);}}}><Keycap>{direction.toUpperCase()}</Keycap><span>{direction==='q'?'↶':'↷'}</span></button>;
}
export function PlacementPopover({id,hint,valid,place,rotate,details,remove,cancel}:{id:string;hint:ObjectHint;valid:boolean;place:()=>void;rotate:(direction:'q'|'r',pressed:boolean)=>void;details:()=>void;remove:()=>void;cancel:()=>void}){
 const item=items.find(item=>item.id===id);
 // Keep actions reachable while the carried object follows the cursor.
 const anchor=useRef<ObjectHint>(null);
 if(!anchor.current&&hint)anchor.current=hint;
 const position=anchor.current;
 return <div className={'placement-popover '+(position?'is-anchored':'')} style={position?{left:`min(${position.x}px, max(12px, calc(100% - 292px)))`,top:`min(${position.y}px, max(12px, calc(100% - 190px)))`}:undefined} role="group" aria-label="Furniture in hand" onContextMenu={e=>{e.preventDefault();details();}}>
  <div className="placement-name"><img src={item?.files.preview} alt=""/><div><strong>{item?.name}</strong><small className={valid?'':'is-blocked'}>{valid?'Ready to place':'Find a clear floor area'}</small></div><button aria-label="Cancel placement" title="Cancel · Escape" onClick={cancel}><Keycap>esc</Keycap></button></div>
  <div className="placement-actions"><button disabled={!valid} aria-label="Place furniture" onClick={place}><MouseGlyph/><span>Place</span></button><button aria-label="Furniture details" onClick={details}><MouseGlyph button="right"/><span>Details</span></button><button className="placement-delete" aria-label="Delete furniture" aria-keyshortcuts="Delete Backspace" title="Delete furniture · Delete / Backspace" onClick={remove}><Trash2 size={16}/><span>Delete</span></button></div>
  <div className="rotation-controls"><span>Rotate <small>hold</small></span><RotationButton direction="q" rotate={rotate}/><RotationButton direction="r" rotate={rotate}/></div>
 </div>;
}
