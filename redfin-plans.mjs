import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const rows=JSON.parse(await fs.readFile('.firecrawl/inventory.json','utf8'));
const found=[];
for(const r of rows){
 if(r.gallery?.length)continue;
 let search;try{search=JSON.parse(await fs.readFile(`.firecrawl/search-${r.slug}.json`,'utf8'));}catch{continue;}
 const result=search.data?.web?.find(x=>x.url.includes('redfin.com/CA/San-Francisco/')&&x.title.toLowerCase().includes(r.address.toLowerCase()));
 if(!result)continue;
 const file=`.firecrawl/redfin-${r.slug}.json`;
 try{
 try{await fs.access(file);}catch{await exec('firecrawl',['scrape',result.url,'--format','markdown,rawHtml','-o',file],{timeout:120000});await new Promise(r=>setTimeout(r,7000));}
 const h=JSON.parse(await fs.readFile(file,'utf8')).rawHtml;
 const line=h.split('\n').find(l=>l.startsWith('root.__reactServerState.InitialContext = '));
 if(!line)continue;
 const d=JSON.parse(line.slice(line.indexOf(' = ')+3).replace(/;$/,''));
 const plans=[];
 function walk(o){if(!o||typeof o!=='object')return;if(o.photoUrl&&o.tags?.includes('Floor plans'))plans.push(o.photoUrl);for(const v of Object.values(o)){if(typeof v==='string'&&v.startsWith('{')){try{walk(JSON.parse(v.replace(/^\{\}&&/,'')));}catch{}}else if(typeof v==='object')walk(v);}}
 walk(d);
 for(const [i,url] of [...new Set(plans)].entries()){
 const file=`${r.address.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-redfin-${i+1}.jpg`;
 const response=await fetch(url);if(!response.ok)continue;
 await fs.writeFile(`floor-plans/${file}`,Buffer.from(await response.arrayBuffer()));found.push({address:r.address,source:result.url,file,url});
 }
 console.log(r.address,plans.length,'plans');
 await fs.writeFile('.firecrawl/alternate-downloads.json',JSON.stringify(found,null,2));
 }catch(e){console.log(r.address,e.message.slice(0,100));}
}
