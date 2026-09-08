import fs from 'node:fs/promises';
const extras=[];
async function save(address,source,url,file){const r=await fetch(url);if(!r.ok){console.log('FAILED',file,r.status);return;}await fs.writeFile(`floor-plans/${file}`,Buffer.from(await r.arrayBuffer()));extras.push({address,source,url,file});console.log(file);}
const h=JSON.parse(await fs.readFile('.firecrawl/alternate-2751.json','utf8')).rawHtml;
for(const [i,url] of [...new Set(h.match(/https:\/\/cdn\.openhomesphotography\.com\/[^'"<> ]+\.pdf/g))].entries())await save('2751 15th Ave','https://www.2751-15thave.com/',url,`2751-15th-ave-${i+1}.pdf`);
for(const [address,source,path] of [
 ['119 Ellert St','https://www.119ellert.com/','.firecrawl/alternate-119-ellert.json'],
 ['953 Leavenworth St','http://www.949-953leavenworthst.com/','.firecrawl/949-953leavenworthst.com.md'],
 ['3913 26th St','https://www.3913-26th-street.com/','.firecrawl/3913-26th-street.com.md'],
 ['110 Pinehurst Way','https://www.110pinehurstway.com/','.firecrawl/110pinehurstway.com.md']]){
 let content=await fs.readFile(path,'utf8');if(path.endsWith('.json'))content=JSON.parse(content).markdown;
 const urls=[...new Set(content.match(/https:\/\/media\.relahq\.com\/[^\s)]+property-docs[^\s)]+/g)||[])];
 for(const [i,url] of urls.entries())await save(address,source,url,`${address.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${i+1}.jpg`);
}
await fs.writeFile('.firecrawl/extra-downloads.json',JSON.stringify(extras,null,2));
