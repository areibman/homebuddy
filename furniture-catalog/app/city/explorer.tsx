"use client";
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,House,MapPin,List,Minus,Plus,RotateCcw,X,LockKeyhole} from 'lucide-react';
import City from './city';
import Link from 'next/link';
import Image from 'next/image';
import homes from './homes.json';
import {isPlayable,playableHomes} from './playable';
import './city.css';
import UploadSpace from '../imports/upload-space';
export type Home=typeof homes[number];
const filters=['All homes','Studios','1–2 beds','3+ beds'];
const stats=(h:Home)=>`${h.beds===0?'Studio':h.beds+' beds'} · ${h.sqft?h.sqft.toLocaleString()+' sq ft':'Area not listed'}`;
export default function CityExplorer(){
 const [filter,setFilter]=useState(0),[list,setList]=useState(true),[zoom,setZoom]=useState(13),[reset,setReset]=useState(0),[ready,setReady]=useState(false);
 const visible=useMemo(()=>homes.filter(h=>filter===0||filter===1&&h.beds===0||filter===2&&h.beds>0&&h.beds<3||filter===3&&h.beds>=3).sort((a,b)=>Number(isPlayable(b))-Number(isPlayable(a))),[filter]);
 const playable=visible.filter(isPlayable);
 useEffect(()=>{
  type ModelContext={registerTool:(tool:{name:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown},options:{signal:AbortSignal})=>void|Promise<void>};
  const context=(document as Document&{modelContext?:ModelContext}).modelContext;if(!context)return;
  const controller=new AbortController();
  const tools=[{name:'list_homes',description:'List homes and whether their 3D interior is playable.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>homes.map(h=>({id:h.id,name:h.name,playable:isPlayable(h)}))},{name:'open_home',description:'Enter a completed playable 3D home.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false},execute:(input:unknown)=>{const home=homes.find(h=>h.id===(input as {id?:string})?.id);if(!home||!isPlayable(home))throw new Error('This home does not have a playable interior yet.');window.location.assign(playableHomes[home.id].path);return {id:home.id,status:'opening'};}}];
  for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:controller.signal})).catch(()=>{});}catch{}}
  return()=>controller.abort();
 },[]);
 return <main className="city-explorer">
  <header className="topbar"><Link href="/" className="brand"><House size={22}/>homebuddy<span>.</span></Link><nav aria-label="Homebuddy"><span className="top-location"><MapPin size={15}/>San Francisco, CA</span><Link href="/catalog">Furniture library <ArrowUpRight size={15}/></Link><button className="browse-button" aria-expanded={list} aria-controls="home-list" onClick={()=>setList(!list)}><List size={17}/>{list?'Hide homes':'Browse homes'}</button></nav></header>
  <City homes={visible} zoom={zoom} reset={reset} onReady={()=>setReady(true)} onZoom={setZoom}/>
  <section className="city-heading"><h1>Explore San Francisco<span>.</span></h1><p>Choose a playable home to walk inside and decorate.</p><fieldset className="filters" aria-label="Bedrooms">{filters.map((f,i)=><button key={f} aria-pressed={filter===i} onClick={()=>setFilter(i)}>{f}</button>)}</fieldset><output className="home-count"><span className="status-dot"/>{playable.length} playable · {visible.length-playable.length} unavailable</output>{!playable.length&&<p className="empty-state">No playable homes match this filter. <button onClick={()=>setFilter(0)}>Show all homes</button></p>}<UploadSpace/></section>
  {!ready&&<output className="map-loading">Loading street map…</output>}
  {list&&<aside className="home-list" id="home-list" aria-label="Homes"><div className="list-head"><h2>Homes</h2><button className="icon" aria-label="Close home list" onClick={()=>setList(false)}><X size={18}/></button></div>{visible.map(h=>{const available=isPlayable(h);const content=<><Image src={h.images[0]} alt="" width={60} height={72} unoptimized/><span><small>{available?playableHomes[h.id].address:h.area}</small><strong>{h.name}</strong><em>{stats(h)}</em><span className={'home-format '+(available?'available':'')}>{available?'Explore home →':'Unavailable · No playable interior'}</span></span>{available?<ArrowUpRight size={18}/>:<LockKeyhole size={16}/>}</>;return available?<Link key={h.id} className="list-home" href={playableHomes[h.id].path}>{content}</Link>:<button key={h.id} className="list-home" disabled>{content}</button>;})}</aside>}
  <div className="map-controls"><button aria-label="Zoom map in" onClick={()=>setZoom(Math.min(19,(zoom)+1))} disabled={zoom===19}><Plus/></button><button aria-label="Zoom map out" onClick={()=>setZoom(Math.max(11,zoom-1))} disabled={zoom===11}><Minus/></button><button aria-label="Reset map view" onClick={()=>{setZoom(13);setReset(v=>v+1);}}><RotateCcw size={19}/></button></div>
  <footer className="map-footer"><span><span className="status-dot"/> Playable homes only on map</span><span>Drag to pan · Scroll or pinch to zoom</span></footer>
 </main>;
}
