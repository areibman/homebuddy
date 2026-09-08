import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec = promisify(execFile);
const rows = (await fs.readFile('properties.txt','utf8')).trim().split('\n').map(l=>{
  const [address,zip,slug,id]=l.split('|');
  return {address,zip,slug,id,url:`https://www.realtor.com/realestateandhomes-detail/${slug}_San-Francisco_CA_${zip}_${id}`};
});
await fs.mkdir('.firecrawl',{recursive:true});
await fs.mkdir('floor-plans',{recursive:true});
let cursor=0;
async function worker(){
  while(cursor<rows.length){
    const r=rows[cursor++];
    const file=`.firecrawl/${r.slug.toLowerCase()}.json`;
    try{
      try{await fs.access(file);}catch{
        for(let attempt=0;attempt<4;attempt++){
          try{await exec('firecrawl',['scrape',r.url,'--format','markdown,rawHtml','-o',file],{timeout:180000,maxBuffer:2000000});break;}
          catch(e){if(attempt===3)throw e;await new Promise(resolve=>setTimeout(resolve,20000));}
        }
        await new Promise(resolve=>setTimeout(resolve,7000));
      }
      const data=JSON.parse(await fs.readFile(file,'utf8'));
      const match=data.rawHtml?.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      const p=match?JSON.parse(match[1]).props.pageProps.initialReduxState.propertyDetails:null;
      r.photos=p?.photos||[];r.floorplans=p?.floorplans;r.gallery=p?.augmented_gallery?.filter(g=>/floor/i.test(g.key+' '+g.category));
      r.tours=p?.virtual_tours;r.status=p?'parsed':'no listing data';
      await fs.writeFile('.firecrawl/inventory.json',JSON.stringify(rows,null,2));
      console.log(r.address,r.photos.length,JSON.stringify(r.floorplans),JSON.stringify(r.gallery));
    }catch(e){r.status=e.message;console.log('ERROR',r.address,e.message.slice(0,150));}
  }
}
await Promise.all([worker(),worker()]);
await fs.writeFile('.firecrawl/inventory.json',JSON.stringify(rows,null,2));
