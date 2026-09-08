import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'vite';

// A config-free Vite server otherwise overwrites the running app's dependency
// cache, leaving browsers with 504 "Outdated Optimize Dep" module failures.
const cacheDir=await mkdtemp(join(tmpdir(),'homebuddy-astra-check-'));
let vite;
try{
 vite=await createServer({configFile:false,cacheDir,server:{middlewareMode:true},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]}});
 const {selectionTotal,validateSelection,selectionFromLayout,instances}=await vite.ssrLoadModule('/app/furnish/selection.ts');
 const {validatePlacementResult}=await vite.ssrLoadModule('/app/furnish/placement-geometry.ts');
 const {homeDefinitions}=await vite.ssrLoadModule('/app/decorate/home-definitions.ts');
 const {homeWithArrangement,homeWithSavedSuggestions}=await vite.ssrLoadModule('/app/furnish/arrangement.ts');
 const {GET,POST}=await vite.ssrLoadModule('/app/api/placements/route.ts');
 const home=homeDefinitions['15'];
 const savedHome=homeWithSavedSuggestions(home);
 assert.deepEqual(savedHome.plan.layouts.map(l=>l.id),['gather','retreat','saved-astra-city']);
 assert.equal(home.plan.layouts.length,2,'Saved suggestions do not mutate the original home');
 const savedAstra=savedHome.plan.layouts[2];
 assert.deepEqual(validatePlacementResult({summary:'Saved Astra layout',placements:savedAstra.furniture,unplaced:[]},selectionFromLayout(savedAstra.furniture),home.plan).issues,[],'Cached Astra layout still fits current architecture');
 const preview=homeWithArrangement(savedHome,{summary:'New result',placements:[],unplaced:[]});
 assert.deepEqual(preview.plan.layouts.map(l=>l.id),['astra','gather','retreat','saved-astra-city'],'Generated and saved suggestions remain selectable together');
 assert.deepEqual(selectionTotal([{id:'nightstand',quantity:4},{id:'coffee-table',quantity:1}]),{amount:549.95,count:5,unpriced:0});
 assert.deepEqual(selectionTotal([{id:'tv-cinema-65',quantity:1}]),{amount:0,count:1,unpriced:1});
 for(const bad of [[],[{id:'fake',quantity:1}],[{id:'bed',quantity:1.5}],[{id:'bed',quantity:-1}],[{id:'bed',quantity:1},{id:'bed',quantity:1}]])assert.throws(()=>validateSelection(bad));
 for(const layout of home.plan.layouts){
  const selection=selectionFromLayout(layout.furniture),counts={};
  const placements=layout.furniture.map(p=>({...p,instanceId:`${p.id}:${counts[p.id]=(counts[p.id]??0)+1}`}));
  const {issues}=validatePlacementResult({summary:'Checked reference',placements,unplaced:[]},selection,home.plan);
  assert.deepEqual(issues,[],layout.id+' reference fits');
 }
 const selected=[{id:'coffee-table',quantity:2}],first={id:'coffee-table',instanceId:'coffee-table:1',x:11.7,z:1.35,r:0};
 assert.throws(()=>validatePlacementResult({summary:'Missing',placements:[first],unplaced:[]},selected,home.plan));
 assert.throws(()=>validatePlacementResult({summary:'Unknown',placements:[{...first,id:'bed'}],unplaced:[]},[{id:'coffee-table',quantity:1}],home.plan));
 assert(validatePlacementResult({summary:'Overlap',placements:[first,{...first,instanceId:'coffee-table:2'}],unplaced:[]},selected,home.plan).issues.some(i=>i.includes('overlaps')));
 assert(validatePlacementResult({summary:'Outside',placements:[{...first,x:-10}],unplaced:[{instanceId:'coffee-table:2',reason:'No room'}]},selected,home.plan).issues.some(i=>i.includes('outside')));
 const simple={name:'Test apartment',height:2.7,footprint:[[0,0],[10,0],[10,10],[0,10]],floors:[[0,0,10,10]],walls:[[5,0,5,4.22],[5,5.78,5,10]],doors:[],fixtures:[],spawn:[2,5],rooms:[{name:'Far room',point:[8,5]}],furniture:[]};
 const blocking={summary:'Blocked passage',placements:[{id:'dresser',instanceId:'dresser:1',x:5,z:5,r:Math.PI/2}],unplaced:[]};
 assert(validatePlacementResult(blocking,[{id:'dresser',quantity:1}],simple).issues.some(i=>i.includes('walking path')),'Reject furniture that blocks a room');
 const originalFetch=globalThis.fetch,originalKey=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='test-only-key';let calls=0,upstreamState='queued',lastPayload;
 globalThis.fetch=async(url,options)=>{
  calls++;if(options.body)lastPayload=JSON.parse(options.body);
  assert(String(url).startsWith('https://api.openai.com/v1/responses'));
  return Response.json({id:'resp_test',status:String(url).endsWith('/cancel')?'cancelled':upstreamState,output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({summary:'Astra arranged the table.',placements:[first],unplaced:[]})}]}]});
 };
 const request=(body,origin='http://localhost')=>new Request('http://localhost/api/placements',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
 try{
  assert.equal((await GET().then(r=>r.json())).configured,true);
  assert.equal((await POST(request({action:'create',homeId:'15',selection:[{id:'bed',quantity:1}]},'https://another-site.test'))).status,403);assert.equal(calls,0);
  assert.equal((await POST(request({action:'create',homeId:'15',selection:[{id:'fake',quantity:1}]}))).status,400);assert.equal(calls,0);
  const created=await POST(request({action:'create',homeId:'15',selection:[{id:'coffee-table',quantity:1,price:0}]})).then(r=>r.json());
  assert.equal(created.status,'queued');assert(created.checkedAt>0,'Status includes the last OpenAI confirmation time');assert.equal(created.total.amount,29.99);assert.equal(lastPayload.model,'gpt-6-astra');assert.equal(lastPayload.background,true);assert.equal(lastPayload.text.format.strict,true);
  assert.equal(JSON.parse(lastPayload.input).selectedFurniture.length,1);
  assert.equal((await POST(request({action:'status',token:created.token+'tampered'}))).status,400);assert.equal(calls,1);
  upstreamState='in_progress';assert.equal((await POST(request({action:'status',token:created.token})).then(r=>r.json())).status,'in_progress');
  upstreamState='completed';const complete=await POST(request({action:'status',token:created.token})).then(r=>r.json());assert.equal(complete.status,'completed');assert.deepEqual(complete.result.placements,[first]);
  assert.equal((await POST(request({action:'cancel',token:created.token})).then(r=>r.json())).status,'cancelled');
  upstreamState='incomplete';assert.equal((await POST(request({action:'status',token:created.token})).then(r=>r.json())).status,'failed');
  globalThis.fetch=async()=>Response.json({error:{}},{status:429});const busy=await POST(request({action:'status',token:created.token}));assert.equal(busy.status,503);assert.equal((await busy.json()).retryable,true,'Rate limits preserve the pending request');
  delete process.env.OPENAI_API_KEY;assert.equal((await GET().then(r=>r.json())).configured,false);
  assert.equal((await POST(request({action:'create',homeId:'15',selection:[{id:'bed',quantity:1}]}))).status,400);
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;}
 console.log('PASS: accurate quantities/prices, both reference layouts, invalid placement rejection, server-only Astra requests, signed resume, cancellation, missing key, and failure states.');
}finally{try{await vite?.close();}finally{await rm(cacheDir,{recursive:true,force:true});}}
