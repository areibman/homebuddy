'use client';
import {useEffect,useRef,useState} from 'react';
import {Box,Footprints,Layers,SquareArrowOutUpRight,X,ArrowUpRight,PackageOpen,Images,DoorOpen,Expand,Shrink} from 'lucide-react';
import {ListingPhotos} from './listing-photos';
import items from '../catalog.json';
import prices from './prices.json';
import './room.css';
import {LightingControl} from './lighting-control';
import {isLightingChoice,type LightingChoice} from './lighting-presets';
import {LookPad} from './look-pad';
import {Keycap,MouseGlyph} from './input-glyph';
import {PlacementPopover} from './object-popover';
import {FurnitureHoverLabel,type FurnitureHover} from './furniture-hover-label';
import type {ObjectHint} from './look-input';
import homes from '../city/homes.json';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {homeDefinitions,type HomeDefinition} from './home-definitions';
import {isPlayable} from '../city/playable';

type Overlay='inventory'|'details'|'photos'|null;
const priceFor=(id:string)=>prices.find(p=>p.id===id);
const money=(id:string)=>{const price=priceFor(id);return price?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:price.amount%1===0?0:2}).format(price.amount):items.find(item=>item.id===id)?.source.retailer==='Homebuddy'?'Original design':'See IKEA for price';};
function CatalogPhoto({item,link=false}:{item:(typeof items)[number];link?:boolean}){
 const [failed,setFailed]=useState(false);
 if(!item.source.photo_url)return <img src={item.files.preview} alt={item.name+' — original 3D design preview'}/>;
 return failed?<div className="photo-unavailable">Photo unavailable{link&&<a href={item.source.url} target="_blank" rel="noreferrer">View photo on IKEA ↗</a>}</div>:<img src={item.source.photo_url} alt={item.name+' — IKEA catalog photo'} onError={()=>setFailed(true)}/>;
}
export function RoomEditor({home=homeDefinitions['13'],layoutIndex=0,furnishing}:{home?:HomeDefinition;layoutIndex?:number;furnishing?:{total:string;unpriced:number;onEdit:()=>void}}){
 const [lighting,setLighting]=useState<LightingChoice>('auto'),lightingRef=useRef<LightingChoice>('auto');
 const [furnitureExploded,setFurnitureExploded]=useState(false);
 const [hover,setHover]=useState<FurnitureHover>(null);
 const [furnitureVisible,setFurnitureVisible]=useState(true),[selectedLayout,setSelectedLayout]=useState(layoutIndex);
 const dialog=useRef<HTMLDialogElement>(null),host=useRef<HTMLDivElement>(null),api=useRef<any>(null);
 const [mode,setMode]=useState('iso'),[status,setStatus]=useState('Loading your home…'),[count,setCount]=useState(0),[active,setActive]=useState(''),[playing,setPlaying]=useState(false),[hint,setHint]=useState<ObjectHint>(null),[ready,setReady]=useState(false),[valid,setValid]=useState(false);
 const [motion,setMotion]=useState<'assembly'|'camera'|'furniture'|null>(null),[overlay,setOverlay]=useState<Overlay>(null),[detail,setDetail]=useState<{id:string;placed:boolean}|null>(null),[fromInventory,setFromInventory]=useState(false);
 const [door,setDoor]=useState<{index:number;label:string}|null>(null);
 useEffect(()=>{let disposed=false;let cleanup:(()=>void)|undefined;
  try{const saved=localStorage.getItem('homebuddy-lighting');if(isLightingChoice(saved))lightingRef.current=saved;}catch{}
  import('./scene').then(async({mountRoom})=>{if(!host.current||disposed)return;setLighting(lightingRef.current);const result=await mountRoom(host.current,{hover:setHover,furnitureExploded:setFurnitureExploded,furnitureVisible:setFurnitureVisible,status:setStatus,count:setCount,active:setActive,playing:setPlaying,hint:setHint,motion:setMotion,placement:setValid,door:setDoor,inventory:()=>{setFromInventory(false);setOverlay('inventory');},details:(id:string,placed:boolean)=>{setDetail({id,placed});setFromInventory(false);setOverlay('details');}},home,layoutIndex,lightingRef.current);if(disposed)result.dispose();else{api.current=result;cleanup=result.dispose;setReady(true);}}).catch(()=>setStatus('The room could not load. Reload to try again.'));
  return()=>{disposed=true;cleanup?.();};
 },[home,layoutIndex]);
 useEffect(()=>{if(!status||!ready)return;const timer=setTimeout(()=>setStatus(''),3500);return()=>clearTimeout(timer);},[status,ready]);
 useEffect(()=>{if(overlay&&!dialog.current?.open)dialog.current?.showModal();else if(!overlay&&dialog.current?.open)dialog.current.close();},[overlay]);
 const close=()=>{dialog.current?.close();setOverlay(null);setFromInventory(false);api.current?.setOverlay(false);};
 const back=()=>{if(overlay==='details'&&fromInventory){setOverlay('inventory');setFromInventory(false);}else close();};
 const choose=(id:string)=>{close();api.current?.choose(id);};
 const change=(next:string)=>{if(!api.current)return;setMode(next);api.current.mode(next);};
 const item=items.find(item=>item.id===detail?.id),price=item?priceFor(item.id):undefined;
 const hoveredItem=items.find(item=>item.id===hover?.id);
 return <div className={'decorator '+(mode==='fps'?'is-walking':'')}>
  <nav className="room-nav"><a className="homebuddy-brand" href="/"><Box size={21}/><b>homebuddy</b></a><div className="project-location"><span>{home.title}</span><span className="nav-slash">/</span><strong>{home.subtitle}</strong><span className="location-city">San Francisco</span></div>{furnishing?<div className="furnishing-budget"><span><strong>{furnishing.total}</strong><small>Selected furniture{furnishing.unpriced?' · partial subtotal':''}</small></span><button onClick={furnishing.onEdit}>Edit selection</button></div>:<a className="library-link" href="/catalog">Furniture library <SquareArrowOutUpRight size={14}/></a>}</nav>
  <div className="room-layout"><section className="room-stage" aria-label="Apartment editor" aria-busy={!ready||motion!==null}>
   <div ref={host} className="room-canvas"/>
   {mode==='iso'&&!active&&!motion&&!overlay&&hover&&hoveredItem&&<FurnitureHoverLabel hover={hover} name={hoveredItem.name.split(/ — |, /)[0]} price={money(hoveredItem.id)}/>}
   <div className="scene-label" title={home.plan.design?.description}><span className="live-dot"/>{home.plan.design?.name&&<><strong>{home.plan.layouts?.[selectedLayout]?.name??home.plan.design.name}</strong><span className="label-divider"/></>}{home.beds} {home.beds===1?'bedroom':'bedrooms'}<span className="label-divider"/>{home.sqft.toLocaleString()} sq ft</div>
   <LightingControl value={lighting} disabled={!ready||motion!==null} onOpenChange={open=>api.current?.setOverlay(open)} onChange={next=>{setLighting(next);lightingRef.current=next;api.current?.setLighting(next);try{localStorage.setItem('homebuddy-lighting',next);}catch{}}}/>
   <div className="view-tools">{mode==='iso'&&<button className="listing-photos-button furniture-explode-toggle" type="button" aria-pressed={furnitureExploded} disabled={!ready||motion!==null||(count===0&&!furnitureExploded)} onClick={()=>api.current?.toggleExplosion()}>{furnitureExploded?<Shrink size={17}/>:<Expand size={17}/>}<span>{furnitureExploded?'Return furniture':'Explode furniture'}</span></button>}{mode==='iso'&&home.plan.layouts&&<div className="camera-toggle" aria-label="Furniture arrangement">{home.plan.layouts.map((layout,i)=><button type="button" disabled={!ready||motion!==null} aria-pressed={i===selectedLayout} key={layout.id} onClick={()=>{if(api.current?.changeLayout(i))setSelectedLayout(i);}}>{layout.name}</button>)}</div>}{mode==='iso'&&<button className="listing-photos-button furniture-visibility-toggle" type="button" role="switch" aria-checked={furnitureVisible} disabled={!ready||motion!==null} aria-label="Show furniture" onClick={()=>api.current?.toggleFurniture()}><PackageOpen size={17}/><span>Furniture</span><span className="furniture-switch-track" aria-hidden="true"><span/></span><span>{furnitureVisible?'Shown':'Hidden'}</span></button>}<div className="camera-toggle" aria-label="Camera view"><button disabled={!ready||motion==='assembly'||motion==='furniture'} aria-pressed={mode==='iso'} onClick={()=>change('iso')}><Layers size={15}/>Isometric</button><button disabled={!ready||motion==='assembly'||motion==='furniture'} aria-pressed={mode==='fps'} onClick={()=>change('fps')}><Footprints size={15}/>Walk</button></div><button className="listing-photos-button" aria-label="Photos and floor plan" disabled={!ready||motion!==null} onClick={()=>{api.current?.setOverlay(true);setOverlay('photos');}}><Images size={17}/><span>Photos & floor plan</span></button></div>
   {mode==='fps'&&!motion&&!overlay&&<><div className="crosshair" aria-hidden="true"/><LookPad hold={(direction,pressed)=>api.current?.look(direction,pressed)} nudge={direction=>api.current?.lookStep(direction)}/>{!active&&<button className="walk-button" onClick={()=>api.current?.walk()}><MouseGlyph/>{playing?'Mouse look · Esc releases cursor':'Mouse look'}</button>}</>}
   {status&&<div className="room-status" role="status">{status}</div>}
   {door&&!overlay&&!active&&<button className="door-action" aria-keyshortcuts="F" onClick={()=>api.current?.interactDoor(door.index)}><DoorOpen size={18}/>{door.label}<Keycap>F</Keycap></button>}
   {!overlay&&<><button className="inventory-trigger" disabled={!ready||motion!==null} onClick={()=>api.current?.openInventory()} aria-keyshortcuts="E"><span className="inventory-trigger-icon"><PackageOpen size={22}/></span><span><strong>Inventory</strong><small>{count} pieces in room</small></span><Keycap>E</Keycap></button>
   {!active&&<div className="control-legend" aria-label="View controls"><span><MouseGlyph/><span>{furnitureExploded?'Inspect piece':'Move piece'}</span></span><span><MouseGlyph button="right"/><span>Details</span></span><span className="legend-divider"/>{mode==='iso'?<><span><MouseGlyph/><span>Drag to orbit</span></span><span><MouseGlyph button="wheel"/><span>Zoom</span></span></>:<><span><Keycap>WASD</Keycap><span>Move</span></span><span><Keycap>↑↓←→</Keycap><span>Look</span></span><span><Keycap>space</Keycap><span>Jump</span></span></>}</div>}
   {active&&<PlacementPopover id={active} hint={hint} valid={valid} place={()=>api.current?.place()} rotate={(direction,quarterTurn)=>api.current?.rotate(direction,quarterTurn)} details={()=>api.current?.details()} remove={()=>api.current?.remove()} cancel={()=>api.current?.cancel()}/>}</>}
  </section></div>
  <dialog ref={dialog} className={'editor-dialog '+(overlay==='inventory'?'inventory-dialog':overlay==='details'?'details-dialog':'listing-photos-dialog')} aria-labelledby="editor-dialog-title" onCancel={e=>{e.preventDefault();back();}} onClick={e=>{if(e.target===e.currentTarget)back();}} onKeyDown={e=>{if(e.key.toLowerCase()==='e'&&!e.repeat){e.preventDefault();e.stopPropagation();if(overlay==='inventory')close();else if(overlay==='details'){api.current?.cancel();setFromInventory(false);setOverlay('inventory');}}}}>
   <header><div><span className="room-kicker">{overlay==='inventory'?'FURNITURE COLLECTION':overlay==='details'?'PRODUCT DETAILS':home.title+' · '+home.subtitle}</span><h1 id="editor-dialog-title">{overlay==='inventory'?'Your inventory':overlay==='details'?item?.name:'Photos & floor plan'}</h1></div><button className="dialog-close" autoFocus onClick={back} aria-label={fromInventory?'Back to inventory':'Close dialog'}><X size={19}/><Keycap>esc</Keycap></button></header>
   {overlay==='inventory'&&<><div className="inventory-intro"><p>Choose a piece. Make it feel like home.</p><span>{items.length} pieces <span>·</span> {count} in room</span></div><div className="inventory-grid">{items.map(item=><button key={item.id} className="inventory-slot" aria-label={'Place '+item.name} onClick={()=>choose(item.id)} onContextMenu={e=>{e.preventDefault();setDetail({id:item.id,placed:false});setFromInventory(true);setOverlay('details');}}><div className="inventory-photo"><CatalogPhoto key={item.id} item={item}/><span className="slot-add">+</span></div><span className="inventory-item-name">{item.name.split(/ — | —|, /)[0]}</span><span className="inventory-item-meta"><span>{item.category}</span><b>{money(item.id)}</b></span></button>)}</div><footer><span><MouseGlyph/> Equip</span><span><MouseGlyph button="right"/> Details</span><span className="inventory-close-hint"><Keycap>E</Keycap> Back to room</span></footer></>}
   {overlay==='details'&&item&&<><div className="product-detail-body"><div className="product-photo"><CatalogPhoto key={item.id} item={item} link/><span>{item.source.photo_url?'IKEA catalog photo':'Original 3D design · rendered preview'}</span></div><div className="product-copy"><div className="product-brand">{item.source.retailer} <span>{item.source.article_number}</span></div><div className="product-price">{money(item.id)}{price&&<small>USD</small>}</div>{price?.note&&<p className="product-note">{price.note}</p>}<dl className="product-dimensions">{(['width','depth','height'] as const).map(key=><div key={key}><dt>{key}</dt><dd>{Math.round(item.dimensions_m[key]*100)}<span> cm</span></dd></div>)}</dl>{item.source.url?<><p className="price-date">{price?'US catalog price · Checked '+price.checked_date+'. Tax and delivery extra.':'Check current pricing on IKEA.'}</p><a className="ikea-product-link" href={item.source.url} target="_blank" rel="noreferrer">View on {item.source.retailer} <ArrowUpRight size={16}/></a></>:<p className="price-date">Original Homebuddy asset. No retail price; ready to place in your room.</p>}<p className="model-note">{item.dimensions_note??'Room models are unofficial 3D recreations.'}</p></div></div><footer><button className="detail-primary" onClick={()=>choose(item.id)}>{detail?.placed?'Place another':'Place in room'}</button>{detail?.placed&&<button className="detail-remove" onClick={()=>{api.current?.remove();close();}}>Remove from room</button>}</footer></>}
   {overlay==='photos'&&<ListingPhotos home={home} layoutIndex={selectedLayout}/>}

  </dialog>
 </div>;
}

export default function Decorate(){
 const query=useSearchParams();
 const selection={id:query.get('home')??'13',page:Number(query.get('plan')??0)};
 const home=homes.find(h=>h.id===selection.id);
 if(!home)return <main style={{padding:32}}><h1>Home not found</h1><Link href="/">Choose a floor plan</Link></main>;
 if(!isPlayable(home))return <main style={{padding:32}}><h1>This home isn’t playable yet</h1><p>Its explorable interior is not available.</p><Link href="/">Choose a playable home</Link></main>;
 const definition=homeDefinitions[home.id];const layoutIndex=Math.max(0,Math.min((definition.plan.layouts?.length??1)-1,Number(query.get('layout'))||0));
 return <RoomEditor key={home.id} home={definition} layoutIndex={layoutIndex}/>;
}
