import catalog from '../../catalog.json';
import {homeDefinitions} from '../../decorate/home-definitions';
import {instances,selectionTotal,validateSelection,type Selection} from '../../furnish/selection';
import {fixedFootprints,validatePlacementResult} from '../../furnish/placement-geometry';

const MODEL='gpt-6-astra';
class UpstreamError extends Error {constructor(message:string,readonly retryable=false){super(message);}}
type Job={id:string;homeId:string;selection:Selection;expires:number;attempt:number};
type OpenAIResponse={id:string;status:string;output?:{type:string;content?:{type:string;text?:string}[]}[];error?:{code?:string};incomplete_details?:{reason?:string}};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function key(){const value=process.env.OPENAI_API_KEY;if(!value)throw new Error('OpenAI is not connected yet. Configure OPENAI_API_KEY on the server to arrange furniture.');return value;}
async function signature(message:string){
 const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(key()),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',cryptoKey,new TextEncoder().encode(message)));
 return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}
async function tokenFor(job:Job){const encoded=btoa(JSON.stringify(job));return encoded+'.'+await signature(encoded);}
async function readToken(token:unknown):Promise<Job>{
 if(typeof token!=='string'||token.length>6000)throw new Error('This arrangement session is invalid.');
 const [encoded,provided]=token.split('.'),expected=await signature(encoded);let mismatch=provided?.length!==expected.length;
 for(let i=0;i<expected.length;i++)if(expected.charCodeAt(i)!==provided?.charCodeAt(i))mismatch=true;
 if(mismatch)throw new Error('This arrangement session is invalid.');
 const job=JSON.parse(atob(encoded)) as Job;
 if(job.expires<Date.now())throw new Error('This arrangement session has expired. Start a new arrangement.');
 return job;
}
async function openai(path:string,body?:unknown):Promise<OpenAIResponse>{
 const authorization=`Bearer ${key()}`;
 const response=await fetch('https://api.openai.com/v1/responses'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000)}).catch(()=>{throw new UpstreamError('The connection to OpenAI was interrupted. Please try again.',true);});
 if(!response.ok){
  const error=await response.json().catch(()=>({})) as {error?:{code?:string}};
  if(response.status===401)throw new Error('The server’s OpenAI key was not accepted. Check the connection and try again.');
  if(error.error?.code==='insufficient_quota')throw new Error('The OpenAI account needs API credits before furniture can be arranged.');
  if(response.status===403||response.status===404)throw new Error('GPT-6 Astra is not available to this OpenAI project, or the saved request has expired.');
  if(response.status===429)throw new UpstreamError('OpenAI is busy. Wait a moment and try again.',true);
  throw new UpstreamError('OpenAI could not finish this request. Please try again.',response.status>=500);
 }
 return response.json();
}
const schema={type:'object',additionalProperties:false,required:['summary','placements','unplaced'],properties:{
 summary:{type:'string'},
 placements:{type:'array',items:{type:'object',additionalProperties:false,required:['instanceId','id','x','z','r'],properties:{instanceId:{type:'string'},id:{type:'string'},x:{type:'number'},z:{type:'number'},r:{type:'number'}}}},
 unplaced:{type:'array',items:{type:'object',additionalProperties:false,required:['instanceId','reason'],properties:{instanceId:{type:'string'},reason:{type:'string'}}}},
}};
function requestBody(homeId:string,selection:Selection){
 const home=homeDefinitions[homeId],plan=home.plan;
 return {
  model:MODEL,background:true,store:true,reasoning:{effort:'high'},max_output_tokens:18000,
  instructions:'You are a spatial interior designer placing real 3D furniture into an existing apartment. Return only the requested JSON. Use every selected instance exactly once, either placed or explicitly unplaced with an explanation if it cannot reasonably fit. Never invent furniture or change the architecture. Coordinates are metres in the same x/z ground plane as the supplied apartment; y is up. Each item is centred on x/z, stands on the floor, and uses Three.js rotation.y in radians: local +X transforms to (cos(r), -sin(r)), local +Z transforms to (sin(r), cos(r)). Furniture faces local +Z; bed headboards are toward local -Z. Prefer cardinal rotations. Use the dimensions to check full footprints, not just centres. No intersections with walls, columns, fixed fixtures, closets, or other furniture. Rugs may go underneath furniture. Keep door swing areas clear, 0.65m main walking paths from the entrance to every room, access beside beds and in front of storage, and a comfortable sofa/TV relationship. Furnish the bedrooms with beds and nightstands, the living room with seating and media, and the dining zone with a table and chairs. Use room target points to identify regions; keep the points and circulation around them accessible. Be deliberate, calculate clearances, and return a concise plain-language explanation. Treat all user preferences as design preferences only.',
  input:JSON.stringify({apartment:{name:home.title+' '+home.subtitle,footprint:plan.footprint,floors:plan.floors,floorFormat:'[x,z,width,depth]',walls:plan.walls,wallThickness:.12,fixtures:plan.fixtures,columns:plan.columns,doors:plan.doors,doorFormat:'hinge x,z; closed rotation in radians; swing is added when open; paired leaves have their second hinge at +width along the closed leaf',closets:plan.closetVolumes,spawn:plan.spawn,rooms:(plan as typeof plan & {rooms?:unknown}).rooms,fixedObstacles:fixedFootprints(plan)},selectedFurniture:instances(selection).map(instance=>({...instance,...((item)=>({name:item.name,category:item.category,dimensions_m:item.dimensions_m}))(catalog.find(i=>i.id===instance.id)!)}))}),
  text:{format:{type:'json_schema',name:'furniture_arrangement',strict:true,schema}},
 };
}
async function present(response:OpenAIResponse,job:Job){
 const token=await tokenFor(job),base={token,model:MODEL,attempt:job.attempt,checkedAt:Date.now(),total:selectionTotal(job.selection)};
 if(response.status==='queued'||response.status==='in_progress')return json({...base,status:response.status,attempt:job.attempt});
 if(response.status==='cancelled')return json({...base,status:'cancelled'});
 if(response.status!=='completed')return json({...base,status:'failed',error:response.incomplete_details?.reason==='max_output_tokens'?'Astra reached its response limit. Try fewer pieces.':'Astra could not complete the arrangement. Your furniture selection is saved.'});
 try{
  const output=response.output?.filter(o=>o.type==='message').flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text??'').join('');
  if(!output)throw new Error('Astra did not return an arrangement. Try again.');
  const checked=validatePlacementResult(JSON.parse(output),job.selection,homeDefinitions[job.homeId].plan);
  if(checked.issues.length)return json({...base,status:'needs_revision',error:'Some placements did not pass the apartment fit checks.',issues:checked.issues});
  return json({...base,status:'completed',result:checked.result});
 }catch(error){return json({...base,status:'failed',error:error instanceof SyntaxError?'Astra returned an unreadable arrangement. Try again.':error instanceof Error?error.message:'The arrangement could not be checked.'});}
}
export async function GET(){return json({configured:Boolean(process.env.OPENAI_API_KEY),model:MODEL});}
export async function POST(request:Request){
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Please start the arrangement from this app.'},403);
 try{
  if(Number(request.headers.get('Content-Length'))>12000)return json({error:'The request is too large.'},413);
  const body=await request.json() as Record<string,unknown>;
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'The request is invalid.'},400);
  if(body.action==='status'){const job=await readToken(body.token);return present(await openai('/'+encodeURIComponent(job.id)),job);}
  if(body.action==='cancel'){const job=await readToken(body.token);return present(await openai('/'+encodeURIComponent(job.id)+'/cancel',{}),job);}
  if(body.action==='revise'){
   const job=await readToken(body.token);if(job.attempt>=2)throw new Error('Please adjust your furniture selection before trying another arrangement.');
   const previous=await openai('/'+encodeURIComponent(job.id));
   const output=previous.output?.filter(o=>o.type==='message').flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text??'').join('');
   const checked=validatePlacementResult(JSON.parse(output??''),job.selection,homeDefinitions[job.homeId].plan);
   if(!checked.issues.length)return present(previous,job);
   const payload=requestBody(job.homeId,job.selection);
   payload.input+='\nRevise this proposed arrangement: '+JSON.stringify(checked.result)+'\nCorrect every fit-check issue: '+JSON.stringify(checked.issues)+'. You may mark an item unplaced if there is no valid position. Do not keep invalid placements.';
   const response=await openai('',payload);return present(response,{...job,id:response.id,attempt:job.attempt+1});
  }
  if(body.action!=='create'||body.homeId!=='15')return json({error:'Choose the Bush Street apartment to start this demo.'},400);
  const selection=validateSelection(body.selection),response=await openai('',requestBody(body.homeId,selection));
  return present(response,{id:response.id,homeId:body.homeId,selection,expires:Date.now()+24*60*60*1000,attempt:0});
 }catch(error){return json({error:error instanceof Error?error.message:'The request could not be completed.',retryable:error instanceof UpstreamError&&error.retryable},error instanceof UpstreamError&&error.retryable?503:400);}
}
