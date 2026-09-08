'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {ArrowLeft,ArrowRight,Box,Check,LoaderCircle,Minus,Plus,Sparkles} from 'lucide-react';
import catalog from '../catalog.json';
import {homeDefinitions} from '../decorate/home-definitions';
import {RoomEditor} from '../decorate/page';
import {instances,MAX_PIECES,priceFor,selectionFromLayout,selectionTotal,usd,type Selection,type PlacementResult} from './selection';
import './furnish.css';

type Job={token?:string;status:string;model?:string;attempt?:number;result?:PlacementResult;error?:string;issues?:string[];retryable?:boolean};
const STORAGE='homebuddy-furnish-15-v1',home=homeDefinitions['15'];
const presets=home.plan.layouts!;
const pending=(job:Job|null)=>Boolean(job&&['submitting','queued','in_progress','revising','needs_revision'].includes(job.status));
class ArrangementError extends Error {constructor(message:string,readonly retryable=false){super(message);}}
async function call(body:unknown):Promise<Job>{
 const response=await fetch('/api/placements',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json() as Job;if(!response.ok)throw new ArrangementError(data.error??'The arrangement request failed.',data.retryable);return data;
}
function FurnitureDemo(){
 const [selection,setSelection]=useState<Selection>([]),[preset,setPreset]=useState('custom'),[category,setCategory]=useState('All');
 const [job,setJob]=useState<Job|null>(null),[started,setStarted]=useState(0),[elapsed,setElapsed]=useState(0),[error,setError]=useState('');
 const [configured,setConfigured]=useState<boolean|null>(null),[hydrated,setHydrated]=useState(false),[exploring,setExploring]=useState(false),[cancelling,setCancelling]=useState(false);
 const requestBusy=useRef(false),total=selectionTotal(selection),busy=pending(job);
 useEffect(()=>{
  try{const saved=JSON.parse(localStorage.getItem(STORAGE)??'null');if(saved&&Array.isArray(saved.selection)&&saved.selection.every((s:{id:string;quantity:number})=>catalog.some(i=>i.id===s.id)&&Number.isInteger(s.quantity)&&s.quantity>0&&s.quantity<=10)&&selectionTotal(saved.selection).count<=MAX_PIECES){setSelection(saved.selection);setPreset(saved.preset??'custom');setStarted(saved.started??0);if(saved.job?.token)setJob(saved.job);}}
  catch{}setHydrated(true);
  fetch('/api/placements').then(r=>r.json() as Promise<{configured:boolean}>).then(data=>setConfigured(Boolean(data.configured))).catch(()=>setConfigured(null));
 },[]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem(STORAGE,JSON.stringify({selection,preset,job,started}));}catch{}},[selection,preset,job,started,hydrated]);
 useEffect(()=>{if(!busy)return;const tick=()=>setElapsed(Math.floor((Date.now()-started)/1000));tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[busy,started]);
 useEffect(()=>{
  if(!job?.token||!['queued','in_progress','needs_revision'].includes(job.status))return;
  let disposed=false,timer:ReturnType<typeof setTimeout>;let failures=0;
  async function poll(){
   if(requestBusy.current){timer=setTimeout(poll,1000);return;}
   requestBusy.current=true;
   try{
    const revise=job!.status==='needs_revision';
    if(revise&&(job!.attempt??0)>=2){if(!disposed)setJob({...job!,status:'failed',error:'A few pieces still do not fit. Adjust your selection and try again.'});return;}
    const next=await call({action:revise?'revise':'status',token:job!.token});
    if(!disposed){setError('');setJob(next);if(['queued','in_progress'].includes(next.status)&&next.token===job!.token&&next.status===job!.status)timer=setTimeout(poll,3000);}
   }catch(e){if(!disposed){if(e instanceof ArrangementError&&!e.retryable)setJob({...job!,status:'failed',error:e.message});else{setError('Connection interrupted. Reconnecting to your saved request…');timer=setTimeout(poll,Math.min(15000,3000*++failures));}}}
   finally{requestBusy.current=false;}
  }
  timer=setTimeout(poll,job.status==='needs_revision'?100:2500);
  return()=>{disposed=true;clearTimeout(timer);};
 },[job?.token,job?.status,job?.attempt]);
 const arrangedHome=useMemo(()=>job?.result?{...home,plan:{...home.plan,furniture:job.result.placements,layouts:[{id:'astra',name:'Your Astra arrangement',furniture:job.result.placements}],design:{name:'Your Astra arrangement',description:job.result.summary}}}:home,[job?.result]);
 function update(id:string,delta:number){
  if(busy)return;setPreset('custom');setJob(null);setError('');
  setSelection(current=>{const quantity=current.find(s=>s.id===id)?.quantity??0,next=Math.min(10,Math.max(0,quantity+delta));if(delta>0&&selectionTotal(current).count>=MAX_PIECES)return current;return [...current.filter(s=>s.id!==id),...(next?[{id,quantity:next}]:[])];});
 }
 function choosePreset(index:number|null){if(busy)return;setSelection(index===null?[]:selectionFromLayout(presets[index].furniture));setPreset(index===null?'custom':presets[index].id);setJob(null);setError('');}
 async function arrange(){
  if(requestBusy.current||busy||!total.count)return;requestBusy.current=true;setError('');setStarted(Date.now());setJob({status:'submitting'});
  try{setJob(await call({action:'create',homeId:'15',selection}));}
  catch(e){setJob(null);setError(e instanceof Error?e.message:'Could not connect to OpenAI. Please try again.');}
  finally{requestBusy.current=false;}
 }
 async function cancel(){
  if(!job?.token||requestBusy.current)return;requestBusy.current=true;setCancelling(true);
  try{setJob(await call({action:'cancel',token:job.token}));setError('');}
  catch(e){setError(e instanceof Error?e.message:'Cancellation could not be confirmed.');}
  finally{requestBusy.current=false;setCancelling(false);}
 }
 const result=job?.status==='completed'?job.result:undefined;
 if(exploring&&result)return <RoomEditor home={arrangedHome} furnishing={{total:usd(total.amount),unpriced:total.unpriced,onEdit:()=>setExploring(false)}}/>;
 const categories=['All',...new Set(catalog.map(item=>item.category))];
 const shown=catalog.filter(item=>category==='All'||item.category===category);
 return <main className="furnish-page">
  <nav className="furnish-nav"><Link className="furnish-brand" href="/"><Box size={23}/>homebuddy<span>.</span></Link><Link href="/"><ArrowLeft size={16}/> Back to map</Link></nav>
  <div className="furnish-body">
   <section className="furnish-heading"><div><p className="furnish-eyebrow">333 BUSH STREET · #4101</p><h1>Make yourself at home.</h1><p>Pick your furniture. We’ll find its place.</p></div><div className="furnish-property"><img src={home.listing.photos[0].src} alt="333 Bush Street apartment interior"/><span><strong>San Francisco</strong><small>2 bedrooms · 1,250 sq ft</small></span></div></section>
   <ol className="furnish-steps" aria-label="Furnishing progress"><li className={!busy&&!result?'current':'done'}><span>{busy||result?<Check size={14}/>:1}</span>Choose furniture</li><li className={busy?'current':result?'done':''}><span>{result?<Check size={14}/>:2}</span>Arrange with Astra</li><li className={result?'current':''}><span>3</span>Explore your home</li></ol>
   <div className="furnish-workspace"><section className="furnish-selection" aria-label="Choose furniture">
    <div className="furnish-section-title"><h2>Your starting point</h2><span>Every collection is editable</span></div>
    <div className="furnish-presets"><button disabled={busy||!hydrated} aria-pressed={preset==='custom'} onClick={()=>choosePreset(null)}><span className="preset-icon"><Plus size={22}/></span><strong>Choose my own</strong><small>Build a selection from the catalog</small></button>{presets.map((p,i)=><button key={p.id} disabled={busy||!hydrated} aria-pressed={preset===p.id} onClick={()=>choosePreset(i)}><span className="preset-icon"><Sparkles size={22}/></span><strong>{p.name}</strong><small>{p.furniture.length} pre-selected pieces · {i===0?'A home for gathering':'A quieter city retreat'}</small></button>)}</div>
    <div className="furnish-section-title"><h2>The furniture catalog</h2><span>{catalog.length} pieces to explore</span></div>
    <div className="furnish-filters" aria-label="Furniture category">{categories.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    <div className="furnish-grid">{shown.map(item=>{const quantity=selection.find(s=>s.id===item.id)?.quantity??0,price=priceFor(item.id);return <article className={'furnish-card '+(quantity?'selected':'')} key={item.id}><div className="furnish-photo"><img src={item.files.preview} alt={item.name} loading="lazy"/>{quantity>0&&<span className="furnish-selected"><Check size={13}/>{quantity} selected</span>}</div><div className="furnish-card-copy"><small>{item.category}</small><h3>{item.name.split(/ — |, /)[0]}</h3><p>{Math.round(item.dimensions_m.width*100)} × {Math.round(item.dimensions_m.depth*100)} cm</p><div className="furnish-card-bottom"><strong>{price?usd(price.amount):'Not priced'}</strong><div className="furnish-quantity"><button aria-label={'Remove one '+item.name} disabled={busy||!quantity||!hydrated} onClick={()=>update(item.id,-1)}><Minus size={15}/></button><output aria-label={item.name+' quantity'}>{quantity}</output><button aria-label={'Add one '+item.name} disabled={busy||quantity===10||total.count>=MAX_PIECES||!hydrated} onClick={()=>update(item.id,1)}><Plus size={15}/></button></div></div>{!price&&<small>{item.source.retailer==='Homebuddy'?'Original design · excluded from total':'Price unavailable · excluded from total'}</small>}</div></article>;})}</div>
   </section>
   <aside className="furnish-cart" aria-label="Your furniture selection"><div className="furnish-cart-title"><h2>Your selection</h2><span>{total.count} {total.count===1?'piece':'pieces'}</span></div>
    {!total.count?<p className="furnish-empty">Choose a collection or add pieces from the catalog to start your home.</p>:<ul className="furnish-cart-lines">{selection.map(line=>{const item=catalog.find(i=>i.id===line.id)!,price=priceFor(line.id);return <li key={line.id}><span><b>{line.quantity} ×</b> {item.name.split(/ — |, /)[0]}</span><strong>{price?usd(price.amount*line.quantity):'Not priced'}</strong></li>;})}</ul>}
    <div className="furnish-total" aria-live="polite"><span>{total.unpriced?'Priced furniture subtotal':'Furniture total'}</span><strong>{usd(total.amount)}</strong></div><p className="furnish-price-note">USD · Catalog prices. Tax and delivery extra.{total.unpriced>0&&<> {total.unpriced} unpriced {total.unpriced===1?'piece is':'pieces are'} excluded; this is a partial total.</>}</p>
    {busy?<div className="furnish-progress" role="status"><LoaderCircle className="furnish-spinner" size={25}/><h3>{job?.status==='submitting'?'Sending your selection…':job?.status==='queued'?'Your arrangement is queued':(job?.attempt??0)>0||job?.status==='needs_revision'?'Refining the fit…':'Astra is arranging your home'}</h3><p>{job?.status==='needs_revision'||(job?.attempt??0)>0?'Adjusting furniture to clear walls, doors, and other pieces.':'Working through the floor plan, furniture dimensions, and room layout. This can take several minutes.'}</p><span className="furnish-elapsed">{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')} elapsed</span>{job?.token&&<><small>You can refresh this page and we’ll reconnect.</small><button className="furnish-text-button" disabled={cancelling} onClick={cancel}>{cancelling?'Cancelling…':'Cancel arrangement'}</button></>}</div>:result?<div className="furnish-complete"><span><Check size={18}/> Your arrangement is ready</span><p>{result.summary}</p>{result.unplaced.length>0&&<div className="furnish-unplaced"><strong>{result.unplaced.length} pieces could not be placed</strong><ul>{result.unplaced.map(p=><li key={p.instanceId}>{catalog.find(i=>i.id===instances(selection).find(s=>s.instanceId===p.instanceId)?.id)?.name.split(/ — |, /)[0]}: {p.reason}</li>)}</ul><p>The subtotal above includes your full selection.</p></div>}<button className="furnish-primary" onClick={()=>setExploring(true)}>Explore your furnished home <ArrowRight size={18}/></button><button className="furnish-text-button" onClick={arrange}>Try another arrangement</button></div>:<><button className="furnish-primary" disabled={!hydrated||!total.count||configured===false} onClick={arrange}><Sparkles size={18}/>Arrange with Astra <ArrowRight size={18}/></button><p className="furnish-ai-note">GPT-6 Astra places your selected pieces in the apartment. Then walk in and make it yours.</p></>}
    {(error||(!busy&&job?.error))&&<p className="furnish-error" role="alert">{error||job?.error}</p>}
    {configured===false&&<p className="furnish-error" role="alert">OpenAI isn’t connected yet. Add OPENAI_API_KEY to the server environment to enable arranging.</p>}
    {job?.status==='cancelled'&&<p role="status">Arrangement cancelled. Your selection is saved.</p>}
    <Link className="furnish-existing" href="/decorate?home=15">Explore an existing arrangement <ArrowRight size={14}/></Link>
   </aside></div>
  </div>
 </main>;
}
export default function Furnish(){const query=useSearchParams();if(query.get('home')&&query.get('home')!=='15')return <main className="furnish-page" style={{padding:40}}><h1>Choose Bush Street for this demo.</h1><Link href="/">Back to map</Link></main>;return <FurnitureDemo/>;}
