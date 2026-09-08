'use client';
import {Keycap,MouseGlyph} from './input-glyph';
import type {ObjectHint} from './look-input';
import items from './items.json';
function RotationButton({direction,rotate}:{direction:'q'|'r';rotate:(direction:'q'|'r',pressed:boolean)=>void}){
 return <button aria-label={'Hold to rotate '+(direction==='q'?'left':'right')} aria-keyshortcuts={direction.toUpperCase()} title="Hold to rotate · Shift for precision"
 onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);rotate(direction,true);}}
 onPointerUp={()=>rotate(direction,false)} onPointerCancel={()=>rotate(direction,false)} onLostPointerCapture={()=>rotate(direction,false)} onBlur={()=>rotate(direction,false)}
 onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();rotate(direction,true);}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();rotate(direction,false);}}}><Keycap>{direction.toUpperCase()}</Keycap><span>{direction==='q'?'↶':'↷'}</span></button>;
}
export function PlacementPopover({id,hint,valid,place,rotate,details,cancel}:{id:string;hint:ObjectHint;valid:boolean;place:()=>void;rotate:(direction:'q'|'r',pressed:boolean)=>void;details:()=>void;cancel:()=>void}){
 const item=items.find(item=>item.id===id);
 return <div className={'placement-popover '+(hint?'is-anchored':'')} style={hint?{left:hint.x,top:hint.y}:undefined} role="group" aria-label="Furniture in hand" onContextMenu={e=>{e.preventDefault();details();}}>
  <div className="placement-name"><img src={item?.files.preview} alt=""/><div><strong>{item?.name}</strong><small className={valid?'':'is-blocked'}>{valid?'Ready to place':'Find a clear floor area'}</small></div><button aria-label="Cancel placement" title="Cancel · Escape" onClick={cancel}><Keycap>esc</Keycap></button></div>
  <div className="placement-actions"><button disabled={!valid} aria-label="Place furniture" onClick={place}><MouseGlyph/><span>Place</span></button><button aria-label="Furniture details" onClick={details}><MouseGlyph button="right"/><span>Details</span></button></div>
  <div className="rotation-controls"><span>Rotate <small>hold</small></span><RotationButton direction="q" rotate={rotate}/><RotationButton direction="r" rotate={rotate}/></div>
 </div>;
}
