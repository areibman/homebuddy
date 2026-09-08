import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const rows=JSON.parse(await fs.readFile('.firecrawl/inventory.json','utf8'));
const extras=JSON.parse(await fs.readFile('.firecrawl/extra-downloads.json','utf8'));
for(const r of rows){
 if(r.gallery?.length||extras.some(x=>x.address===r.address))continue;
 const file=`.firecrawl/search-${r.slug}.json`;
 let old;try{old=JSON.parse(await fs.readFile(file,'utf8'));}catch{}
 if(old?.data?.web?.some(x=>x.url.includes('redfin.com/CA/San-Francisco/')&&x.title.toLowerCase().includes(r.address.toLowerCase())))continue;
 try{
 await exec('firecrawl',['search',`${r.address} San Francisco site:redfin.com/CA/San-Francisco`,'--limit','3','--json','-o',`.firecrawl/target-${r.slug}.json`],{timeout:90000});
 const d=JSON.parse(await fs.readFile(`.firecrawl/target-${r.slug}.json`,'utf8'));
 await fs.writeFile(file,JSON.stringify({data:{web:[...(d.data?.web||[]),...(old?.data?.web||[])]}}));
 console.log(r.address,JSON.stringify(d.data?.web?.map(x=>({title:x.title,url:x.url}))));
 }catch(e){console.log('ERROR',r.address);}
 await new Promise(r=>setTimeout(r,6500));
}
