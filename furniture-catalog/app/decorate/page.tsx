'use client';
import {useEffect,useRef,useState} from 'react';
import {Box,Footprints,Layers,Scan,SquareArrowOutUpRight,X,ArrowUpRight,PackageOpen} from 'lucide-react';
import items from './items.json';
import prices from './prices.json';
import './room.css';
import {LookPad} from './look-pad';
import {Keycap,MouseGlyph} from './input-glyph';
import {PlacementPopover} from './object-popover';
import type {ObjectHint} from './look-input';

type Overlay='inventory'|'details'|'plan'|null;
const priceFor=(id:string)=>prices.find(p=>p.id===id);
const money=(id:string)=>{const price=priceFor(id);return price?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:price.amount%1===0?0:2}).format(price.amount):'See IKEA for price';};
function CatalogPhoto({item,link=false}:{item:(typeof items)[number];link?:boolean}){
 const [failed,setFailed]=useState(false);
 return failed?<div className="photo-unavailable">Photo unavailable{link&&<a href={item.source.url} target="_blank" rel="noreferrer">View photo on IKEA ↗</a>}</div>:<img src={item.source.photo_url} alt={item.name+' — IKEA catalog photo'} onError={()=>setFailed(true)}/>;
}
export default function Decorate(){
 const dialog=useRef<HTMLDialogElement>(null),host=useRef<HTMLDivElement>(null),api=useRef<any>(null);
 const [mode,setMode]=useState('iso'),[status,setStatus]=useState('Loading your home…'),[count,setCount]=useState(0),[active,setActive]=useState(''),[playing,setPlaying]=useState(false),[hint,setHint]=useState<ObjectHint>(null),[ready,setReady]=useState(false),[valid,setValid]=useState(false);
 const [motion,setMotion]=useState<'assembly'|'camera'|null>(null),[overlay,setOverlay]=useState<Overlay>(null),[detail,setDetail]=useState<{id:string;placed:boolean}|null>(null),[fromInventory,setFromInventory]=useState(false);
 useEffect(()=>{let disposed=false;let cleanup:(()=>void)|undefined;
  import('./scene').then(async({mountRoom})=>{if(!host.current||disposed)return;const result=await mountRoom(host.current,{status:setStatus,count:setCount,active:setActive,playing:setPlaying,hint:setHint,motion:setMotion,placement:setValid,inventory:()=>{setFromInventory(false);setOverlay('inventory');},details:(id:string,placed:boolean)=>{setDetail({id,placed});setFromInventory(false);setOverlay('details');}});if(disposed)result.dispose();else{api.current=result;cleanup=result.dispose;setReady(true);}}).catch(()=>setStatus('The room could not load. Reload to try again.'));
  return()=>{disposed=true;cleanup?.();};
 },[]);
 useEffect(()=>{if(!status||!ready)return;const timer=setTimeout(()=>setStatus(''),3500);return()=>clearTimeout(timer);},[status,ready]);
 useEffect(()=>{if(overlay&&!dialog.current?.open)dialog.current?.showModal();else if(!overlay&&dialog.current?.open)dialog.current.close();},[overlay]);
 const close=()=>{dialog.current?.close();setOverlay(null);setFromInventory(false);api.current?.setOverlay(false);};
 const back=()=>{if(overlay==='details'&&fromInventory){setOverlay('inventory');setFromInventory(false);}else close();};
 const choose=(id:string)=>{close();api.current?.choose(id);};
 const change=(next:string)=>{if(!api.current)return;setMode(next);api.current.mode(next);};
 const item=items.find(item=>item.id===detail?.id),price=item?priceFor(item.id):undefined;
 return <div className={'decorator '+(mode==='fps'?'is-walking':'')}>
  <nav className="room-nav"><a className="homebuddy-brand" href="/"><Box size={21}/><b>homebuddy</b></a><div className="project-location"><span>Spera</span><span className="nav-slash">/</span><strong>Plan E</strong><span className="location-city">San Francisco</span></div><a className="library-link" href="/catalog">Furniture library <SquareArrowOutUpRight size={14}/></a></nav>
  <div className="room-layout"><section className="room-stage" aria-label="Apartment editor" aria-busy={!ready||motion!==null}>
   <div ref={host} className="room-canvas"/>
   <div className="scene-label"><span className="live-dot"/>1 bedroom<span className="label-divider"/>503 sq ft</div>
   <div className="view-tools"><div className="camera-toggle" aria-label="Camera view"><button disabled={!ready||motion!==null} aria-pressed={mode==='iso'} onClick={()=>change('iso')}><Layers size={15}/>Isometric</button><button disabled={!ready||motion!==null} aria-pressed={mode==='fps'} onClick={()=>change('fps')}><Footprints size={15}/>Walk</button></div><button className="original-plan-button" disabled={!ready||motion!==null} onClick={()=>{api.current?.setOverlay(true);setOverlay('plan');}} aria-label="Original floor plan" title="Original floor plan"><Scan size={18}/></button></div>
   {mode==='fps'&&!motion&&!overlay&&<><div className="crosshair" aria-hidden="true"/><LookPad hold={(direction,pressed)=>api.current?.look(direction,pressed)} nudge={direction=>api.current?.lookStep(direction)}/>{!playing&&!active&&<button className="walk-button" onClick={()=>api.current?.walk()}><MouseGlyph/>Mouse look</button>}</>}
   {status&&<div className="room-status" role="status">{status}</div>}
   {!overlay&&<><button className="inventory-trigger" disabled={!ready||motion!==null} onClick={()=>api.current?.openInventory()} aria-keyshortcuts="E"><span className="inventory-trigger-icon"><PackageOpen size={22}/></span><span><strong>Inventory</strong><small>{count} pieces in room</small></span><Keycap>E</Keycap></button>
   {!active&&<div className="control-legend" aria-label="View controls"><span><MouseGlyph/><span>Move piece</span></span><span><MouseGlyph button="right"/><span>Details</span></span><span className="legend-divider"/>{mode==='iso'?<><span><MouseGlyph/><span>Drag to orbit</span></span><span><MouseGlyph button="wheel"/><span>Zoom</span></span></>:<><span><Keycap>WASD</Keycap><span>Move</span></span><span><Keycap>↑↓←→</Keycap><span>Look</span></span><span><Keycap>space</Keycap><span>Jump</span></span></>}</div>}
   {active&&<PlacementPopover id={active} hint={hint} valid={valid} place={()=>api.current?.place()} rotate={(direction,pressed)=>api.current?.rotate(direction,pressed)} details={()=>api.current?.details()} cancel={()=>api.current?.cancel()}/>}</>}
  </section></div>
  <dialog ref={dialog} className={'editor-dialog '+(overlay==='inventory'?'inventory-dialog':overlay==='details'?'details-dialog':'original-plan-dialog')} aria-labelledby="editor-dialog-title" onCancel={e=>{e.preventDefault();back();}} onClick={e=>{if(e.target===e.currentTarget)back();}} onKeyDown={e=>{if(e.key.toLowerCase()==='e'&&!e.repeat){e.preventDefault();e.stopPropagation();if(overlay==='inventory')close();else if(overlay==='details'){api.current?.cancel();setFromInventory(false);setOverlay('inventory');}}}}>
   <header><div><span className="room-kicker">{overlay==='inventory'?'IKEA COLLECTION':overlay==='details'?'PRODUCT DETAILS':'SPERA · PLAN E'}</span><h1 id="editor-dialog-title">{overlay==='inventory'?'Your inventory':overlay==='details'?item?.name:'Original floor plan'}</h1></div><button className="dialog-close" autoFocus onClick={back} aria-label={fromInventory?'Back to inventory':'Close dialog'}><X size={19}/><Keycap>esc</Keycap></button></header>
   {overlay==='inventory'&&<><div className="inventory-intro"><p>Choose a piece. Make it feel like home.</p><span>{items.length} pieces <span>·</span> {count} in room</span></div><div className="inventory-grid">{items.map(item=><button key={item.id} className="inventory-slot" aria-label={'Place '+item.name} onClick={()=>choose(item.id)} onContextMenu={e=>{e.preventDefault();setDetail({id:item.id,placed:false});setFromInventory(true);setOverlay('details');}}><div className="inventory-photo"><CatalogPhoto key={item.id} item={item}/><span className="slot-add">+</span></div><span className="inventory-item-name">{item.name.split(/ — | —|, /)[0]}</span><span className="inventory-item-meta"><span>{item.category}</span><b>{money(item.id)}</b></span></button>)}</div><footer><span><MouseGlyph/> Equip</span><span><MouseGlyph button="right"/> Details</span><span className="inventory-close-hint"><Keycap>E</Keycap> Back to room</span></footer></>}
   {overlay==='details'&&item&&<><div className="product-detail-body"><div className="product-photo"><CatalogPhoto key={item.id} item={item} link/><span>IKEA catalog photo</span></div><div className="product-copy"><div className="product-brand">IKEA <span>{item.source.article_number}</span></div><div className="product-price">{money(item.id)}<small>USD</small></div>{price?.note&&<p className="product-note">{price.note}</p>}<dl className="product-dimensions">{(['width','depth','height'] as const).map(key=><div key={key}><dt>{key}</dt><dd>{Math.round(item.dimensions_m[key]*100)}<span> cm</span></dd></div>)}</dl><p className="price-date">US catalog price · Checked {price?.checked_date??item.source.checked_date}. Tax and delivery extra.</p><a className="ikea-product-link" href={item.source.url} target="_blank" rel="noreferrer">View on IKEA <ArrowUpRight size={16}/></a><p className="model-note">Room models are unofficial 3D recreations.</p></div></div><footer><button className="detail-primary" onClick={()=>choose(item.id)}>{detail?.placed?'Place another':'Place in room'}</button>{detail?.placed&&<button className="detail-remove" onClick={()=>{api.current?.cancel();api.current?.remove();close();}}>Remove from room</button>}</footer></>}
   {overlay==='plan'&&<><div className="original-plan-image"><img src="/plans/spera-plan-e.jpg" alt="Original Spera Plan E one-bedroom apartment layout and dimensions"/></div><footer><a href="/plans/spera-plan-e.jpg" target="_blank" rel="noreferrer">Full-size image ↗</a><a href="/plans/spera-furnished.blend" download>Blender scene ↓</a></footer></>}
  </dialog>
 </div>;
}
