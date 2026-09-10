'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Upload,FileImage,Film,FileText,X,LoaderCircle,ArrowUpRight} from 'lucide-react';
import {Dialog,DialogTrigger,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import './uploads.css';
import Link from 'next/link';

type Job={id:string;name:string;status:'saving'|'queued'|'running'|'validating'|'completed'|'failed';error?:string;assetCount?:number};
const accept='.png,.jpg,.jpeg,.webp,.pdf,.mp4,.mov,.webm';
const limit=50*1024*1024;
const labels:Record<Job['status'],string>={saving:'Saving references',queued:'Waiting to generate',running:'Creating your 3D assets',validating:'Checking generated assets',completed:'Saved to your catalog',failed:'Generation failed'};
export default function UploadSpace(){
 const [open,setOpen]=useState(false),[files,setFiles]=useState<File[]>([]),[name,setName]=useState(''),[notes,setNotes]=useState(''),[error,setError]=useState(''),[connection,setConnection]=useState(''),[jobs,setJobs]=useState<Job[]>([]),[configured,setConfigured]=useState(false),[submitting,setSubmitting]=useState(false),[dragging,setDragging]=useState(false);
 const input=useRef<HTMLInputElement>(null),busy=useRef(false),requestKey=useRef<string|null>(null);
 const refresh=useCallback(async()=>{
  try{const response=await fetch('/api/imports',{cache:'no-store',signal:AbortSignal.timeout(15000)});const data=await response.json() as {error?:string;jobs:Job[]};if(!response.ok)throw new Error(data.error||'Could not connect to generation.');setConfigured(true);setConnection('');setJobs(data.jobs);return true;}
  catch(err){setConfigured(false);setConnection(err instanceof Error?err.message:'Could not connect to generation.');return false;}
 },[]);
 const hasActiveJobs=jobs.some(j=>['queued','running','validating'].includes(j.status));
 useEffect(()=>{const timer=setTimeout(()=>void refresh(),0);return()=>clearTimeout(timer);},[refresh]);
 useEffect(()=>{if(!open&&!hasActiveJobs)return;const initial=setTimeout(()=>void refresh(),0);const timer=setInterval(()=>void refresh(),4000);return()=>{clearTimeout(initial);clearInterval(timer);};},[open,refresh,hasActiveJobs]);
 function addFiles(incoming:File[]){
  if(busy.current)return;
  setError('');
  const merged=[...files];for(const file of incoming)if(!merged.some(f=>f.name===file.name&&f.size===file.size&&f.lastModified===file.lastModified))merged.push(file);
  if(merged.length>20){setError('Choose up to 20 files.');return;}
  if(merged.some(f=>!f.size||!accept.split(',').some(ext=>f.name.toLowerCase().endsWith(ext)))){setError('Use non-empty PNG, JPG, WebP, PDF, MP4, MOV, or WebM files.');return;}
  if(merged.reduce((sum,f)=>sum+f.size,0)>limit){setError('Keep each upload under 50 MB in total.');return;}
  requestKey.current=null;setFiles(merged);
 }
 async function submit(event:React.SyntheticEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current)return;
  if(!files.length||!name.trim()){setError('Add a project name and at least one floor plan, photo, or video.');return;}
  busy.current=true;setSubmitting(true);setError('');
  // Reuse after a lost response: a retry cannot start a second paid generation.
  const fingerprint=JSON.stringify({name:name.trim(),notes,files:files.map(f=>[f.name,f.size,f.lastModified])});
  try{const saved=JSON.parse(sessionStorage.getItem('homebuddy-pending-upload')||'null') as {key:string;fingerprint:string}|null;if(saved?.fingerprint===fingerprint)requestKey.current=saved.key;}catch{}
  requestKey.current??=crypto.randomUUID();
  try{sessionStorage.setItem('homebuddy-pending-upload',JSON.stringify({key:requestKey.current,fingerprint}));}catch{}
  const body=new FormData();body.set('name',name.trim());body.set('notes',notes);for(const file of files)body.append('files',file);
  try{
   const response=await fetch('/api/imports',{method:'POST',headers:{'Idempotency-Key':requestKey.current},body});const data=await response.json() as Job & {error?:string};
   if(!response.ok)throw new Error(data.error||'Upload could not be accepted.');
   setJobs(previous=>[data,...previous.filter(j=>j.id!==data.id)]);setFiles([]);setName('');setNotes('');requestKey.current=null;try{sessionStorage.removeItem('homebuddy-pending-upload');}catch{}void refresh();
  }catch(err){setError(err instanceof Error?err.message:'Connection interrupted. Try again to check this same upload.');}
  finally{busy.current=false;setSubmitting(false);}
 }
 const active=jobs.filter(j=>['queued','running','validating'].includes(j.status)).length;
 return <Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger className="upload-space-trigger"><Upload size={17}/><span>Upload your space</span>{active>0&&<span className="upload-active-count">{active}</span>}</DialogTrigger>
  <DialogContent className="upload-space-dialog">
   <DialogTitle className="upload-space-title">Bring your own space.</DialogTitle>
   <DialogDescription className="upload-space-description">Add a floor plan, photos, or a walkthrough video. We’ll turn your references into 3D assets and save them to your catalog.</DialogDescription>
   <form onSubmit={submit} className="upload-space-form">
    <label htmlFor="space-name">Project name<input id="space-name" placeholder="My apartment" value={name} maxLength={100} disabled={submitting} onChange={e=>{setName(e.target.value);requestKey.current=null;}}/></label>
    <div className={'upload-dropzone '+(dragging?'dragging':'')} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);addFiles(Array.from(e.dataTransfer.files));}}>
     <div className="upload-file-icons" aria-hidden="true"><FileText/><FileImage/><Film/></div>
     <button type="button" disabled={submitting} onClick={()=>input.current?.click()}>Choose files</button><span>or drop them here</span>
     <p>PNG, JPG, WebP, PDF, MP4, MOV, WebM<br/>Up to 20 files · 50 MB total</p>
     <input ref={input} aria-label="Floor plans, photos, and videos" type="file" accept={accept} multiple disabled={submitting} hidden onChange={e=>{addFiles(Array.from(e.target.files||[]));e.target.value='';}}/>
    </div>
    {files.length>0&&<ul className="upload-files">{files.map((file,index)=><li key={file.name+file.lastModified}><span>{file.name}<small>{(file.size/1024/1024).toFixed(1)} MB</small></span><button type="button" aria-label={'Remove '+file.name} disabled={submitting} onClick={()=>{setFiles(files.filter((_,i)=>i!==index));requestKey.current=null;}}><X size={16}/></button></li>)}</ul>}
    <label htmlFor="space-notes">What should we know? <span className="upload-optional">Optional</span><textarea id="space-notes" rows={2} maxLength={2000} placeholder="Room dimensions, furniture to recreate, or details to preserve…" value={notes} disabled={submitting} onChange={e=>{setNotes(e.target.value);requestKey.current=null;}}/></label>
    {error&&<p className="upload-error" role="alert">{error}</p>}
    {connection&&<output className="upload-error">{connection} <button type="button" onClick={()=>void refresh()}>Reconnect</button></output>}
    <button className="upload-submit" type="submit" disabled={submitting||!configured}>{submitting?<><LoaderCircle className="upload-spin" size={17}/>Uploading references…</>:<><Upload size={17}/>Generate assets</>}</button>
    <p className="upload-caption">Generation can take several minutes. You can close this window; progress is saved.</p>
   </form>
   {jobs.length>0&&<section className="upload-jobs" aria-label="Your uploads"><h3>Your uploads</h3><div aria-live="polite">{jobs.map(job=><article key={job.id}><div><strong>{job.name}</strong><span>{labels[job.status]}{job.status==='completed'?` · ${job.assetCount} asset${job.assetCount===1?'':'s'}`:''}</span>{job.error&&<p>{job.error}</p>}</div>{job.status==='completed'?<Link href={'/catalog?import='+job.id}>View assets <ArrowUpRight size={15}/></Link>:job.status!=='failed'&&<LoaderCircle size={18} className="upload-spin"/>}</article>)}</div></section>}
  </DialogContent>
 </Dialog>;
}
