import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const rows=JSON.parse(await fs.readFile('.firecrawl/inventory.json','utf8'));
for(const r of rows){
 if(r.gallery?.length)continue;
 const file=`.firecrawl/search-${r.slug}.json`;
 try{await fs.access(file);continue;}catch{}
 try{await exec('firecrawl',['search',`"${r.address}" "San Francisco" floor plan`,'--limit','5','--json','-o',file],{timeout:90000});
 const d=JSON.parse(await fs.readFile(file,'utf8'));console.log(r.address,JSON.stringify(d.data?.web));
 }catch(e){console.log('ERROR',r.address);}
 await new Promise(r=>setTimeout(r,6500));
}
