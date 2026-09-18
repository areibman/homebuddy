import {homeDefinitions} from '../../decorate/home-definitions';
import {seedCatalog} from '../../catalog/items';
import {instances,selectionTotal,validateSelection,type Selection} from '../../furnish/selection';
import {fixedFootprints,validatePlacementResult} from '../../furnish/placement-geometry';
import type {HomePlan} from '../../decorate/home-definitions';
import type {ConvexHttpClient} from 'convex/browser';
import {bearerToken,convexFor,HttpError,json} from '@/lib/server/convex';

const MODEL='gpt-6-astra';
class UpstreamError extends Error {constructor(message:string,readonly retryable=false){super(message);}}
type Job={id:string;arrangementId:string;homeId:string;selection:Selection;attempt:number};
type OpenAIResponse={id:string;status:string;output?:{type:string;content?:{type:string;text?:string}[]}[];error?:{code?:string};incomplete_details?:{reason?:string}};
type CatalogItem={id:string;name:string;category:string;dimensions_m:{width:number;depth:number;height:number}};
type Walkable={title:string;subtitle:string;plan:HomePlan};
function key(){const value=process.env.OPENAI_API_KEY;if(!value)throw new Error('OpenAI is not connected yet. Configure OPENAI_API_KEY on the server to arrange furniture.');return value;}
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
async function loadCatalog(client:ConvexHttpClient){
 const {api}=await import('../../../convex/_generated/api');
 const live=await client.query(api.catalog.list,{}).catch(()=>[] as CatalogItem[]);
 return live.length?live:seedCatalog;
}
async function loadHome(client:ConvexHttpClient,ref:string):Promise<Walkable|null>{
 const {api}=await import('../../../convex/_generated/api');
 const interior=await client.query(api.interiors.get,{ref}).catch(()=>null);
 if(interior?.status==='ready'&&interior.plan)return {title:interior.title,subtitle:interior.subtitle,plan:interior.plan as HomePlan};
 const sample=homeDefinitions[ref];
 return sample?{title:sample.title,subtitle:sample.subtitle,plan:sample.plan}:null;
}
const schema={type:'object',additionalProperties:false,required:['summary','placements','unplaced'],properties:{
 summary:{type:'string'},
 placements:{type:'array',items:{type:'object',additionalProperties:false,required:['instanceId','id','x','z','r'],properties:{instanceId:{type:'string'},id:{type:'string'},x:{type:'number'},z:{type:'number'},r:{type:'number'}}}},
 unplaced:{type:'array',items:{type:'object',additionalProperties:false,required:['instanceId','reason'],properties:{instanceId:{type:'string'},reason:{type:'string'}}}},
}};
function requestBody(home:Walkable,selection:Selection,catalog:CatalogItem[]){
 const plan=home.plan;
 return {
  model:MODEL,background:true,store:true,reasoning:{effort:'high'},max_output_tokens:18000,
  instructions:'You are a spatial interior designer placing real 3D furniture into an existing apartment. Return only the requested JSON. Use every selected instance exactly once, either placed or explicitly unplaced with an explanation if it cannot reasonably fit. Never invent furniture or change the architecture. Coordinates are metres in the same x/z ground plane as the supplied apartment; y is up. Each item is centred on x/z, stands on the floor, and uses Three.js rotation.y in radians: local +X transforms to (cos(r), -sin(r)), local +Z transforms to (sin(r), cos(r)). Furniture faces local +Z; bed headboards are toward local -Z. Prefer cardinal rotations. Use the dimensions to check full footprints, not just centres. No intersections with walls, columns, fixed fixtures, closets, or other furniture. Rugs may go underneath furniture. Keep door swing areas clear, 0.65m main walking paths from the entrance to every room, access beside beds and in front of storage, and a comfortable sofa/TV relationship. Furnish the bedrooms with beds and nightstands, the living room with seating and media, and the dining zone with a table and chairs. Use room target points to identify regions; keep the points and circulation around them accessible. Be deliberate, calculate clearances, and return a concise plain-language explanation. Treat all user preferences as design preferences only.',
  input:JSON.stringify({apartment:{name:home.title+' '+home.subtitle,footprint:plan.footprint,floors:plan.floors,floorFormat:'[x,z,width,depth]',walls:plan.walls,wallThickness:.12,fixtures:plan.fixtures,columns:plan.columns,doors:plan.doors,doorFormat:'hinge x,z; closed rotation in radians; swing is added when open; paired leaves have their second hinge at +width along the closed leaf',closets:plan.closetVolumes,spawn:plan.spawn,rooms:(plan as typeof plan & {rooms?:unknown}).rooms,fixedObstacles:fixedFootprints(plan)},selectedFurniture:instances(selection).map(instance=>({...instance,...((item)=>({name:item.name,category:item.category,dimensions_m:item.dimensions_m}))(catalog.find(i=>i.id===instance.id)!)}))}),
  text:{format:{type:'json_schema',name:'furniture_arrangement',strict:true,schema}},
 };
}
async function persist(client:ConvexHttpClient,job:Job,status:string,extra:Record<string,unknown>={}){
 const {api}=await import('../../../convex/_generated/api');
 await client.mutation(api.arrangements.saveLayout,{arrangementId:job.arrangementId as never,openaiResponseId:job.id,layoutStatus:status,selection:job.selection,attempt:job.attempt,...extra}).catch(()=>{});
}
async function present(response:OpenAIResponse,job:Job,home:Walkable,catalog:CatalogItem[],client:ConvexHttpClient){
 const base={arrangementId:job.arrangementId,model:MODEL,attempt:job.attempt,checkedAt:Date.now(),total:selectionTotal(job.selection)};
 if(response.status==='queued'||response.status==='in_progress'){await persist(client,job,response.status);return json({...base,status:response.status});}
 if(response.status==='cancelled'){await persist(client,job,'cancelled');return json({...base,status:'cancelled'});}
 if(response.status!=='completed'){
  const error=response.incomplete_details?.reason==='max_output_tokens'?'Astra reached its response limit. Try fewer pieces.':'Astra could not complete the arrangement. Your furniture selection is saved.';
  await persist(client,job,'failed',{summary:error});
  return json({...base,status:'failed',error});
 }
 try{
  const output=response.output?.filter(o=>o.type==='message').flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text??'').join('');
  if(!output)throw new Error('Astra did not return an arrangement. Try again.');
  const checked=validatePlacementResult(JSON.parse(output),job.selection,home.plan,catalog);
  if(checked.issues.length){await persist(client,job,'needs_revision',{issues:checked.issues,summary:'Some placements did not pass the apartment fit checks.'});return json({...base,status:'needs_revision',error:'Some placements did not pass the apartment fit checks.',issues:checked.issues});}
  await persist(client,job,'completed',{placements:checked.result.placements,unplaced:checked.result.unplaced,summary:checked.result.summary});
  return json({...base,status:'completed',result:checked.result});
 }catch(error){
  const message=error instanceof SyntaxError?'Astra returned an unreadable arrangement. Try again.':error instanceof Error?error.message:'The arrangement could not be checked.';
  await persist(client,job,'failed',{summary:message});
  return json({...base,status:'failed',error:message});
 }
}
export const maxDuration = 60;
export async function GET(){return json({configured:Boolean(process.env.OPENAI_API_KEY),model:MODEL});}
export async function POST(request:Request){
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Please start the arrangement from this app.'},403);
 try{
  if(Number(request.headers.get('Content-Length'))>12000)return json({error:'The request is too large.'},413);
  const body=await request.json() as Record<string,unknown>;
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'The request is invalid.'},400);
  const token=bearerToken(request);
  if(!token)return json({error:'Sign in from your home. Arranging uses credits.'},401);
  const {client,api}=await convexFor(token);
  const catalog=await loadCatalog(client);
  async function savedJob(arrangementId:string){
   const row=await client.query(api.arrangements.get,{arrangementId:arrangementId as never}).catch(()=>null) as {openaiResponseId:string|null;selection:{id:string;quantity:number}[];attempt:number}|null;
   if(!row?.openaiResponseId)throw new Error('This arrangement session is invalid.');
   if(typeof body.homeId!=='string')throw new Error('This home is not walkable yet.');
   const home=await loadHome(client,body.homeId);
   if(!home)throw new Error('This home is not walkable yet.');
   return {job:{id:row.openaiResponseId,arrangementId,homeId:body.homeId,selection:row.selection,attempt:row.attempt||0},home};
  }
  if(body.action==='status'||body.action==='cancel'||body.action==='revise'){
   if(typeof body.arrangementId!=='string')return json({error:'This arrangement session is invalid.'},400);
   const {job,home}=await savedJob(body.arrangementId);
   if(body.action==='cancel')return present(await openai('/'+encodeURIComponent(job.id)+'/cancel',{}),job,home,catalog,client);
   if(body.action==='revise'){
    if(job.attempt>=2)throw new Error('Please adjust your furniture selection before trying another arrangement.');
    const previous=await openai('/'+encodeURIComponent(job.id));
    const output=previous.output?.filter(o=>o.type==='message').flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text??'').join('');
    const checked=validatePlacementResult(JSON.parse(output??''),job.selection,home.plan,catalog);
    if(!checked.issues.length)return present(previous,job,home,catalog,client);
    const payload=requestBody(home,job.selection,catalog);
    payload.input+='\nRevise this proposed arrangement: '+JSON.stringify(checked.result)+'\nCorrect every fit-check issue: '+JSON.stringify(checked.issues)+'. You may mark an item unplaced if there is no valid position. Do not keep invalid placements.';
    const response=await openai('',payload);
    return present(response,{...job,id:response.id,attempt:job.attempt+1},home,catalog,client);
   }
   return present(await openai('/'+encodeURIComponent(job.id)),job,home,catalog,client);
  }
  if(body.action!=='create'||typeof body.homeId!=='string'||typeof body.recordId!=='string')return json({error:'Choose a floor plan that can be arranged in 3D.'},400);
  const home=await loadHome(client,body.homeId);
  if(!home)return json({error:'Choose a floor plan that can be arranged in 3D.'},400);
  const arrangementId=await client.mutation(api.arrangements.reserve,{homeId:body.recordId as never,style:typeof body.style==='string'?body.style:'Scandinavian'});
  try{
   const selection=validateSelection(body.selection,catalog),response=await openai('',requestBody(home,selection,catalog));
   await client.mutation(api.arrangements.complete,{arrangementId,summary:'Astra accepted the arrangement.'});
   return present(response,{id:response.id,arrangementId,homeId:body.homeId,selection,attempt:0},home,catalog,client);
  }catch(error){
   await client.mutation(api.arrangements.refund,{arrangementId,reason:error instanceof Error?error.message:'The arrangement did not start.'}).catch(()=>{});
   throw error;
  }
 }catch(error){
  if(error instanceof HttpError)return json({error:error.message,retryable:false},error.status);
  return json({error:error instanceof Error?error.message:'The request could not be completed.',retryable:error instanceof UpstreamError&&error.retryable},error instanceof UpstreamError&&error.retryable?503:400);
 }
}
