import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAssetWorker,MODEL} from '../server/asset-worker.mjs';

const temporary=await mkdtemp(join(tmpdir(),'homebuddy-import-check-'));
const token=randomUUID();let worker;
try{
 const fixture=join(temporary,'codex-fixture');
 const item=JSON.parse(await readFile(resolve('app/catalog.json'),'utf8'))[0];
 const fixtureBody=`#!${process.execPath}
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const args=process.argv.slice(2);assert.equal(args[args.indexOf('--model')+1],${JSON.stringify(MODEL)});assert.equal(args[args.indexOf('--sandbox')+1],'workspace-write');
const output=args[args.indexOf('--add-dir')+1];
let prompt='';process.stdin.on('data',c=>prompt+=c);process.stdin.on('end',()=>{
 setTimeout(()=>{
 fs.copyFileSync(${JSON.stringify(resolve('public',item.files.glb.slice(1).split('?')[0]))},path.join(output,'test.glb'));
 fs.copyFileSync(${JSON.stringify(resolve('public',item.files.preview.slice(1).split('?')[0]))},path.join(output,'test.png'));
 fs.writeFileSync(path.join(output,'catalog.json'),JSON.stringify([{name:'Fixture asset',category:'Test',description:'Integration fixture only',materials:['Fabric'],dimensions_m:{width:2,depth:1,height:1},provenance:'Fixture',files:{glb:'test.glb',preview:'test.png'}}]));
 },100);
});`;
 await writeFile(fixture,fixtureBody);await chmod(fixture,0o700);
 const root=join(temporary,'jobs');
 worker=await createAssetWorker({root,token,command:fixture});
 const request=(query='',options={})=>fetch(worker.url+'/'+query,{...options,headers:{Authorization:'Bearer '+token,...options.headers}});
 const form=(name='My room',filename='floor.png')=>{const body=new FormData();body.set('name',name);body.append('files',new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0])]),filename);return body;};
 async function submit(body,key=randomUUID()){return request('',{method:'POST',headers:{'Idempotency-Key':key},body});}
 async function waitFor(id,status){for(let i=0;i<100;i++){const {jobs}=await(await request()).json();const job=jobs.find(j=>j.id===id);if(job?.status===status)return job;await new Promise(r=>setTimeout(r,30));}throw new Error('Job did not reach '+status);}
 assert.equal((await fetch(worker.url)).status,401);
 assert.equal((await submit(form('','a.png'))).status,400);
 assert.equal((await submit(form('Bad','script.html'))).status,400);
 const empty=new FormData();empty.set('name','Empty');assert.equal((await submit(empty)).status,400);
 const key=randomUUID();
 const submissions=await Promise.all([submit(form(),key),submit(form(),key)]);
 assert.equal(submissions[0].status,202);assert.equal(submissions[1].status,202);
 const job=await submissions[0].json();assert.equal((await submissions[1].json()).id,job.id,'Concurrent retries have one job');
 await waitFor(job.id,'completed');
 assert.equal((await(await request()).json()).jobs.length,1);
 const {items}=await(await request('?catalog=1')).json();assert.equal(items.length,1);assert.equal(items[0].source.retailer,'Your uploads');
 const model=await request(items[0].files.glb.slice('/api/imports'.length));assert.equal(model.status,200);assert.equal(Buffer.from(await model.arrayBuffer()).toString('utf8',0,4),'glTF');
 assert.equal((await request('?asset='+encodeURIComponent(job.id+'/../job.json'))).status,404);
 assert.equal((await request('?asset='+encodeURIComponent(job.id+'/catalog.json'))).status,404);
 // Exercise the hosted API proxy too; local Vite uses a streaming middleware.
 const {createServer}=await import('vite');
 const vite=await createServer({configFile:false,cacheDir:join(temporary,'vite-cache'),server:{middlewareMode:true},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]}});
 const priorUrl=process.env.ASSET_WORKER_URL,priorToken=process.env.ASSET_WORKER_TOKEN;
 try{
  const api=await vite.ssrLoadModule('/app/api/imports/route.ts');
  delete process.env.ASSET_WORKER_URL;delete process.env.ASSET_WORKER_TOKEN;
  assert.equal((await api.GET(new Request('http://app/api/imports'))).status,503);
  process.env.ASSET_WORKER_URL=worker.url;process.env.ASSET_WORKER_TOKEN=token;
  assert.equal((await api.GET(new Request('http://app/api/imports?catalog=1'))).status,200);
  assert.equal((await api.POST(new Request('http://app/api/imports',{method:'POST',headers:{Origin:'http://other-site'},body:form()}))).status,403);
  const proxied=await api.POST(new Request('http://app/api/imports',{method:'POST',headers:{Origin:'http://app','Idempotency-Key':key},body:form()}));
  assert.equal(proxied.status,202);assert.equal((await proxied.json()).id,job.id);
  assert.equal((await api.POST(new Request('http://app/api/imports',{method:'POST',headers:{'Content-Length':String(100*1024*1024)},body:'too large'}))).status,413);
 }finally{if(priorUrl===undefined)delete process.env.ASSET_WORKER_URL;else process.env.ASSET_WORKER_URL=priorUrl;if(priorToken===undefined)delete process.env.ASSET_WORKER_TOKEN;else process.env.ASSET_WORKER_TOKEN=priorToken;await vite.close();}
 await worker.close();worker=await createAssetWorker({root,token,command:fixture});
 assert.equal((await(await request('?catalog=1')).json()).items.length,1,'Catalog survives restart');
 assert.equal((await(await submit(form(),key)).json()).id,job.id,'Retry survives restart');
 await worker.close();
 const bad=join(temporary,'codex-failure');await writeFile(bad,`#!${process.execPath}\nprocess.exit(1);`);await chmod(bad,0o700);
 worker=await createAssetWorker({root,token,command:bad});
 const failed=await(await submit(form('Failed job'))).json();assert.match((await waitFor(failed.id,'failed')).error,/Codex/);
 assert.equal((await(await request('?catalog=1')).json()).items.length,1,'Failed jobs never enter catalog');
 await worker.close();
 const interrupted=randomUUID();await mkdir(join(root,interrupted));await writeFile(join(root,interrupted,'job.json'),JSON.stringify({id:interrupted,status:'running',name:'Interrupted',createdAt:new Date().toISOString()}));
 worker=await createAssetWorker({root,token,command:bad});assert.match((await waitFor(interrupted,'failed')).error,/interrupted/);
 console.log('PASS: validation, authorization, duplicate submissions, Astra command, completion, asset downloads, traversal protection, restart persistence, failed and interrupted jobs.');
}finally{await worker?.close();await rm(temporary,{recursive:true,force:true});}
