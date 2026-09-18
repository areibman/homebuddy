import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,mkdir,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAssetWorker,MODEL} from '../server/asset-worker.mjs';
import {createAssetStore} from '../server/asset-store.mjs';

// Exercises the worker without OpenAI or Convex: an injected `generate` writes fixture output, an
// injected local asset store stands in for S3, and jobs arrive through /adopt the way the web app
// pushes them after recording them in Convex.
const temporary=await mkdtemp(join(tmpdir(),'homebuddy-import-check-'));
const token=randomUUID();let worker;
try{
 const jsonChunk=Buffer.from(JSON.stringify({asset:{version:'2.0'},meshes:[{primitives:[{attributes:{}}]}]}));
 const padded=Buffer.concat([jsonChunk,Buffer.alloc((4-jsonChunk.length%4)%4,0x20)]);
 const bin=Buffer.alloc(4);
 const header=Buffer.alloc(12);header.write('glTF',0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+padded.length+8+bin.length,8);
 const jsonHead=Buffer.alloc(8);jsonHead.writeUInt32LE(padded.length,0);jsonHead.write('JSON',4);
 const binHead=Buffer.alloc(8);binHead.writeUInt32LE(bin.length,0);binHead.write('BIN\0',4);
 const glbPath=join(temporary,'fixture.glb'),pngPath=join(temporary,'fixture.png');
 await writeFile(glbPath,Buffer.concat([header,jsonHead,padded,binHead,bin]));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
 await writeFile(pngPath,png);
 const interior=JSON.stringify({name:'Fixture room',height:2.7,footprint:[[0,0],[4,0],[4,4],[0,4]],floors:[[0,0,4,4]],walls:[[0,0,4,0],[4,0,4,4],[4,4,0,4],[0,4,0,0]],fixtures:[],doors:[],furniture:[],spawn:[2,2]});
 const catalog=JSON.stringify([{name:'Fixture asset',category:'Test',description:'Integration fixture only',materials:['Fabric'],dimensions_m:{width:2,depth:1,height:1},provenance:'Fixture',files:{glb:'test.glb',preview:'test.png'}}]);

 const store=createAssetStore({mode:'local',root:join(temporary,'store')});
 const userId='user_fixture';
 const reference=await store.put(store.userKey(userId,'plan.png'),png,'image/png');
 const root=join(temporary,'jobs');

 const calls=[];
 const fullGenerate=async({output,model,prompt})=>{
  assert.equal(model,MODEL);calls.push(prompt.slice(0,40));
  await copyFile(glbPath,join(output,'test.glb'));await copyFile(pngPath,join(output,'test.png'));
  await writeFile(join(output,'interior.json'),interior);await writeFile(join(output,'catalog.json'),catalog);
 };
 const planOnlyGenerate=async({output,prompt})=>{
  if(prompt.startsWith('Reconstruct the architecture'))await writeFile(join(output,'interior.json'),interior);
  else throw new Error('Furniture pass fell over');
 };
 const furnitureOnlyGenerate=async({output,prompt})=>{
  if(prompt.startsWith('Generate catalog-ready')){await copyFile(glbPath,join(output,'test.glb'));await copyFile(pngPath,join(output,'test.png'));await writeFile(join(output,'catalog.json'),catalog);}
 };
 const failGenerate=async()=>{throw new Error('OpenAI sandbox could not complete generation. Check Astra access and the reference files, then upload again.');};

 const request=(path='',options={})=>fetch(worker.url+path,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers}});
 const adopt=(job)=>request('/adopt',{method:'POST',body:JSON.stringify({userId,name:'Fixture home',notes:'',inputKeys:[reference.key],...job})});
 async function waitFor(id,status){for(let i=0;i<200;i++){const {jobs}=await(await request()).json();const job=jobs.find(j=>j.id===id);if(job?.status===status)return job;if(job?.status==='failed'&&status!=='failed')throw new Error('Job failed: '+job.error);await new Promise(r=>setTimeout(r,25));}throw new Error('Job did not reach '+status);}

 // Full success: both passes run, models publish under the owner's prefix.
 worker=await createAssetWorker({root,token,generate:fullGenerate,store});
 assert.equal((await fetch(worker.url)).status,401,'Unauthenticated requests are rejected');
 assert.equal((await request('/adopt',{method:'POST',body:JSON.stringify({id:'job_noowner',inputKeys:[reference.key]})})).status,400,'Jobs need an owner');
 assert.equal((await adopt({id:'job_wrongowner',inputKeys:['homes/someone_else/x.png']})).status,400,'Inputs must belong to the owner');
 assert.equal((await adopt({id:'job_missing',inputKeys:['homes/user_fixture/missing.png']})).status,400,'Missing uploads are rejected');
 assert.equal((await adopt({id:'job_empty',inputKeys:[]})).status,400,'Jobs need references');
 const first=await adopt({id:'job_full'});assert.equal(first.status,202);
 const again=await adopt({id:'job_full'});assert.equal((await again.json()).id,'job_full','Adopting twice is idempotent');
 const done=await waitFor('job_full','completed');
 assert.equal(done.assetCount,1);assert.equal(done.interiorStatus,'ready');
 assert.equal(calls.length,2,'Architecture and furniture run as separate passes');
 assert.ok(await store.get(`homes/${userId}/catalog/job_full/test.glb`),'GLB published to the asset store');
 assert.ok(await store.get(`homes/${userId}/catalog/job_full/test.png`),'Preview published to the asset store');
 await worker.close();

 // A furniture failure leaves a walkable plan.
 worker=await createAssetWorker({root,token,generate:planOnlyGenerate,store});
 await adopt({id:'job_planonly'});
 const planOnly=await waitFor('job_planonly','completed');
 assert.equal(planOnly.interiorStatus,'ready');assert.equal(planOnly.assetCount,0);
 await worker.close();

 // A missing plan still publishes furniture and records why the plan failed.
 worker=await createAssetWorker({root,token,generate:furnitureOnlyGenerate,store});
 await adopt({id:'job_furnitureonly'});
 const furnitureOnly=await waitFor('job_furnitureonly','completed');
 assert.equal(furnitureOnly.interiorStatus,'failed');assert.equal(furnitureOnly.assetCount,1);assert.match(furnitureOnly.error,/walls and a footprint/);
 await worker.close();

 // Nothing usable fails the job with the upstream message.
 worker=await createAssetWorker({root,token,generate:failGenerate,store});
 await adopt({id:'job_failed'});
 assert.match((await waitFor('job_failed','failed')).error,/OpenAI sandbox/);
 assert.equal((await store.get(`homes/${userId}/catalog/job_failed/test.glb`)),null,'Failed jobs publish nothing');
 await worker.close();

 // Restart: finished jobs survive, in-flight jobs are marked failed.
 const interrupted='job_interrupted';await mkdir(join(root,interrupted));await writeFile(join(root,interrupted,'job.json'),JSON.stringify({id:interrupted,status:'running',name:'Interrupted',createdAt:new Date().toISOString()}));
 worker=await createAssetWorker({root,token,generate:failGenerate,store});
 const {jobs}=await(await request()).json();
 assert.equal(jobs.find(j=>j.id==='job_full').status,'completed','Completed jobs survive restart');
 assert.match(jobs.find(j=>j.id===interrupted).error,/interrupted/);
 assert.equal((await(await request('?asset=job_full/test.glb')).json()).configured,true,'The worker no longer serves files; every GET is the health report');
 await worker.close();

 // The web route enqueues only; without Convex it explains itself instead of proxying.
 const {createServer}=await import('vite');
 const vite=await createServer({configFile:false,cacheDir:join(temporary,'vite-cache'),server:{middlewareMode:true},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]},resolve:{alias:{'@':process.cwd()}}});
 const prior={url:process.env.ASSET_WORKER_URL,token:process.env.ASSET_WORKER_TOKEN,convex:[process.env.NEXT_PUBLIC_CONVEX_URL,process.env.CONVEX_URL,process.env.VITE_CONVEX_URL]};
 try{
  const api=await vite.ssrLoadModule('/app/api/imports/route.ts');
  delete process.env.ASSET_WORKER_URL;delete process.env.ASSET_WORKER_TOKEN;
  assert.deepEqual(await(await api.GET()).json(),{configured:false,model:MODEL},'Health reports a missing worker');
  assert.equal((await api.POST(new Request('http://app/api/imports',{method:'POST',headers:{Origin:'http://other-site','Content-Type':'application/json'},body:'{}'}))).status,403,'Cross-origin uploads are rejected');
  assert.equal((await api.POST(new Request('http://app/api/imports',{method:'POST',headers:{'Content-Type':'multipart/form-data'},body:'x'}))).status,415,'Multipart is no longer proxied');
  delete process.env.NEXT_PUBLIC_CONVEX_URL;delete process.env.CONVEX_URL;delete process.env.VITE_CONVEX_URL;
  assert.equal((await api.POST(new Request('http://app/api/imports',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer x'},body:'{}'}))).status,503,'Missing Convex is reported');
  process.env.CONVEX_URL='http://127.0.0.1:1';
  assert.equal((await api.POST(new Request('http://app/api/imports',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}))).status,401,'Sign-in is required');
 }finally{
  for(const [name,value] of [['ASSET_WORKER_URL',prior.url],['ASSET_WORKER_TOKEN',prior.token],['NEXT_PUBLIC_CONVEX_URL',prior.convex[0]],['CONVEX_URL',prior.convex[1]],['VITE_CONVEX_URL',prior.convex[2]]]){if(value===undefined)delete process.env[name];else process.env[name]=value;}
  await vite.close();
 }
 console.log('PASS: authorization, ownership checks, idempotent adoption, two-pass generation, partial results, failure reporting, restart handling, and the enqueue-only web route.');
}finally{await worker?.close();await rm(temporary,{recursive:true,force:true});}
