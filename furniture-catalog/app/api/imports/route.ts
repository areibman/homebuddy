const MAX_BYTES=51*1024*1024;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function proxy(request:Request){
 const origin=request.headers.get('Origin');
 if(request.method==='POST'&&origin&&origin!==new URL(request.url).origin)return json({error:'Please upload from Homebuddy.'},403);
 const worker=process.env.ASSET_WORKER_URL,token=process.env.ASSET_WORKER_TOKEN;
 if(!worker||!token)return json({configured:false,error:'Asset generation is not connected. Start the Codex worker to enable uploads.'},503);
 try{
  let body:ReadableStream<Uint8Array>|undefined;
  if(request.method==='POST'){
   if(Number(request.headers.get('Content-Length'))>MAX_BYTES)return json({error:'Keep each upload under 50 MB in total.'},413);
   if(!request.body)return json({error:'Choose files to upload.'},400);
   let total=0;
   body=request.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){total+=chunk.byteLength;if(total>MAX_BYTES)throw new Error('Upload too large');controller.enqueue(chunk);}}));
  }
  const headers=new Headers({Authorization:`Bearer ${token}`});
  for(const name of ['Content-Type','Idempotency-Key']){const value=request.headers.get(name);if(value)headers.set(name,value);}
  const options:RequestInit & {duplex?:string}={method:request.method,headers,body:body as BodyInit|undefined,signal:AbortSignal.timeout(90000)};
  if(body)options.duplex='half';
  const response=await fetch(worker.replace(/\/$/,'')+'/'+new URL(request.url).search,options);
  const output=new Headers();for(const name of ['Content-Type','Cache-Control','X-Content-Type-Options']){const value=response.headers.get(name);if(value)output.set(name,value);}
  return new Response(response.body,{status:response.status,headers:output});
 }catch{return json({error:'The asset worker is unavailable. Your submitted generation may still be running; reconnect before starting again.'},503);}
}
export const GET=proxy;
export const POST=proxy;
