import {AlertCircle,ArrowRight,Check,LoaderCircle} from 'lucide-react';
import {useEffect,useRef} from 'react';
import type {PlacementResult} from './selection';

export type ArrangementJob={token?:string;status:string;model?:string;attempt?:number;result?:PlacementResult;error?:string;issues?:string[];retryable?:boolean;checkedAt?:number};
export const isPending=(job:ArrangementJob|null)=>Boolean(job&&['submitting','queued','in_progress','revising','needs_revision'].includes(job.status));
const duration=(seconds:number)=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;

export function ArrangementStatus({job,count,elapsed,connectionError,cancelling,onCancel,onRetry,onExplore}:{job:ArrangementJob;count:number;elapsed:number;connectionError:string;cancelling:boolean;onCancel:()=>void;onRetry:()=>void;onExplore:()=>void}){
 const panel=useRef<HTMLElement>(null),attention=isPending(job)?'working':job.status;
 useEffect(()=>{panel.current?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[attention]);
 const failed=job.status==='failed',complete=job.status==='completed',cancelled=job.status==='cancelled',submitting=job.status==='submitting',unconfirmed=job.status==='unconfirmed';
 const revising=job.status==='needs_revision'||(job.attempt??0)>0;
 const title=failed?'Arrangement failed':unconfirmed?'Request status unknown':complete?'Your Astra arrangement is ready':cancelled?'Arrangement cancelled':connectionError?'Connection interrupted — reconnecting':cancelling?'Cancelling arrangement…':submitting?'Sending your furniture to OpenAI…':job.status==='queued'?'OpenAI received your request':revising?'Astra is refining the layout':'Astra is arranging your home';
 const description=failed?(job.error??'The arrangement could not be completed.'):complete?`${job.result?.placements.length??0} of ${count} pieces placed. Layout checks passed. You can compare Astra’s arrangement with both presets.`:cancelled?'Your furniture selection is saved. You can try again whenever you’re ready.':connectionError?'We haven’t received a fresh status yet. Your request may still be running; we’ll keep checking.':submitting?'Waiting for OpenAI to acknowledge the request.':revising?'Checking furniture against walls, doors, and walking paths, then correcting anything that does not fit.':'OpenAI confirms the request is active. A full apartment can take several minutes; you can refresh this page without starting over.';
 const age=job.checkedAt?Math.max(0,Math.floor((Date.now()-job.checkedAt)/1000)):null;
 return <section ref={panel} className={'arrangement-status '+(failed?'is-failed':complete?'is-complete':cancelled?'is-cancelled':connectionError||unconfirmed?'is-reconnecting':'is-running')} role={failed||unconfirmed?'alert':'status'} aria-label="Astra request status">
  <div className="arrangement-status-icon">{failed||unconfirmed?<AlertCircle size={26}/>:complete||cancelled?<Check size={26}/>:<LoaderCircle className="furnish-spinner" size={26}/>}</div>
  <div className="arrangement-status-copy"><h2>{title}</h2><p>{unconfirmed?`${job.error??'OpenAI did not acknowledge the request.'} It may still be running. Starting another request could create a second arrangement.`:description}</p>
   {isPending(job)&&<div className="arrangement-live-meta" aria-live="off"><strong>{duration(elapsed)} elapsed</strong><span>{age===null?'Not yet acknowledged by OpenAI':`Last confirmed by OpenAI ${age<2?'just now':`${age}s ago`}`}</span></div>}
   {failed&&<small>Your selection is saved. No failed layout has been applied.</small>}
  </div>
  <div className="arrangement-status-actions">{complete?<button className="furnish-primary" onClick={onExplore}>View arrangement <ArrowRight size={17}/></button>:failed||cancelled||unconfirmed?<button className="furnish-primary" onClick={onRetry}>{unconfirmed?'Start another request':'Try again'} <ArrowRight size={17}/></button>:job.token?<button className="arrangement-cancel" disabled={cancelling} onClick={onCancel}>{cancelling?'Cancelling…':'Cancel request'}</button>:null}</div>
 </section>;
}
