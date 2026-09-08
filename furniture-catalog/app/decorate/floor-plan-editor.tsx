'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type {Home} from '../city/explorer';
import items from './items.json';
import './floor-plan-editor.css';

type Piece={key:number;id:string;x:number;y:number;rotation:number};
export default function FloorPlanEditor({home,initialPage}:{home:Home;initialPage:number}){
 const [page,setPage]=useState(Number.isInteger(initialPage)&&initialPage>=0&&initialPage<home.images.length?initialPage:0);
 const [layouts,setLayouts]=useState<Record<number,Piece[]>>({});
 const [selected,setSelected]=useState<number|null>(null),[width,setWidth]=useState(15),[zoom,setZoom]=useState(1),[ratio,setRatio]=useState(1),[loaded,setLoaded]=useState(false);
 const stage=useRef<HTMLDivElement>(null),sequence=useRef(0),drag=useRef<{key:number;dx:number;dy:number}|null>(null);
 const pieces=layouts[page]??[];
 const update=(fn:(pieces:Piece[])=>Piece[])=>setLayouts(current=>({...current,[page]:fn(current[page]??[])}));
 const change=(key:number,values:Partial<Piece>)=>update(current=>current.map(p=>p.key===key?{...p,...values}:p));
 const current=pieces.find(p=>p.key===selected);
 return <main className="plan-editor">
  <nav className="plan-editor-nav"><Link href="/">← Choose a home</Link><strong>{home.name}</strong><Link href="/catalog">Furniture library ↗</Link></nav>
  <div className="plan-editor-layout"><section className="plan-workspace" aria-label="Floor-plan decorator">
   <header><div><h1>Decorate your floor plan</h1><p>Place furniture, drag to move, and rotate to try a layout.</p></div><label>Floor plan <select value={page} onChange={e=>{setPage(Number(e.target.value));setSelected(null);setLoaded(false);}}>{home.images.map((_,i)=><option key={i} value={i}>Plan {i+1}</option>)}</select></label></header>
   <div className="plan-adjustments"><label>Image width (meters) <input aria-label="Image width in meters" type="number" min="1" max="100" step="0.5" value={width} onChange={e=>setWidth(Math.max(1,Math.min(100,Number(e.target.value)||1)))}/></label><span>Set the scale using the printed dimensions, including image margins.</span><label>Zoom <select value={zoom} onChange={e=>setZoom(Number(e.target.value))}><option value={1}>100%</option><option value={1.5}>150%</option><option value={2}>200%</option></select></label></div>
   <div className="plan-editor-scroll"><div className="plan-sheet" ref={stage} style={{width:`${zoom*100}%`}} onPointerMove={e=>{const moving=drag.current;if(!moving||!stage.current)return;const rect=stage.current.getBoundingClientRect();change(moving.key,{x:Math.max(0,Math.min(100,(e.clientX-rect.left)/rect.width*100-moving.dx)),y:Math.max(0,Math.min(100,(e.clientY-rect.top)/rect.height*100-moving.dy))});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
    <Image unoptimized width={1600} height={1600} className="plan-background" src={home.images[page]} alt={`Floor plan ${page+1} of ${home.name}`} draggable={false} onLoad={e=>{setRatio(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight);setLoaded(true);}}/>
    {loaded&&pieces.map(piece=>{const item=items.find(i=>i.id===piece.id)!;return <button key={piece.key} className={'plan-piece '+(selected===piece.key?'selected':'')} aria-label={`${item.name}, placed furniture. Arrow keys move; R rotates; Delete removes.`} style={{left:piece.x+'%',top:piece.y+'%',width:item.dimensions_m.width/width*100+'%',height:item.dimensions_m.depth/width*ratio*100+'%',transform:`translate(-50%,-50%) rotate(${piece.rotation}deg)`}} onClick={()=>setSelected(piece.key)} onPointerDown={e=>{e.preventDefault();setSelected(piece.key);e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);const rect=stage.current!.getBoundingClientRect();drag.current={key:piece.key,dx:(e.clientX-rect.left)/rect.width*100-piece.x,dy:(e.clientY-rect.top)/rect.height*100-piece.y};}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','r','R','Delete','Backspace'].includes(e.key)){e.preventDefault();if(e.key==='Delete'||e.key==='Backspace'){update(current=>current.filter(p=>p.key!==piece.key));setSelected(null);}else if(e.key.toLowerCase()==='r')change(piece.key,{rotation:(piece.rotation+45)%360});else change(piece.key,{x:Math.max(0,Math.min(100,piece.x+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0))),y:Math.max(0,Math.min(100,piece.y+(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)))});}}}><span>{item.category}</span></button>;})}
   </div></div>
   <footer className="plan-selection">{current?<><strong>{items.find(i=>i.id===current.id)?.name}</strong><button onClick={()=>change(current.key,{rotation:(current.rotation+45)%360})}>Rotate 45°</button><button onClick={()=>{update(p=>p.filter(v=>v.key!==current.key));setSelected(null);}}>Remove</button></>:<span>{pieces.length} pieces · Select a piece to rotate or remove it.</span>}<a href={home.images[page]} target="_blank" rel="noreferrer">Original plan ↗</a></footer>
  </section><aside className="plan-inventory"><h2>Furniture</h2><p>Click a piece to add its footprint to the plan. This is a 2D layout; wall clearance is checked visually.</p><div>{items.map(item=><button disabled={!loaded} key={item.id} onClick={()=>{const key=++sequence.current;update(p=>[...p,{key,id:item.id,x:50,y:50,rotation:0}]);setSelected(key);}}><Image unoptimized width={120} height={90} src={item.files.preview} alt=""/><strong>{item.name.split(' — ')[0]}</strong><small>{item.dimensions_m.width} × {item.dimensions_m.depth} m</small><span aria-hidden="true">+</span></button>)}</div></aside></div>
 </main>;
}
