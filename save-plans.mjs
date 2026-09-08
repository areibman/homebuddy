import fs from 'node:fs/promises';
const rows=JSON.parse(await fs.readFile('.firecrawl/inventory.json','utf8'));
for(const r of rows){
 r.files=[];
 const urls=[...new Set((r.gallery||[]).flatMap(g=>g.photos.map(p=>p.href)))];
 for(const [i,original] of urls.entries()){
  const url=original.replace(/s\.jpg$/,'rd-w1920_h1440.jpg');
  const file=`${r.address.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${i+1}.jpg`;
  const response=await fetch(url);if(!response.ok)continue;
  await fs.writeFile(`floor-plans/${file}`,Buffer.from(await response.arrayBuffer()));
  r.files.push({file,url,original});console.log(file);
 }
 for(const plan of r.floorplans?.cubicasa_floorplan||[]){
  if(!plan.thumbnail_url)continue;
  const response=await fetch(plan.thumbnail_url);if(!response.ok)continue;
  const file=`${r.slug.toLowerCase()}-vector.svg`;
  await fs.writeFile(`floor-plans/${file}`,Buffer.from(await response.arrayBuffer()));r.files.push({file,url:plan.thumbnail_url});
 }
}
await fs.writeFile('floor-plans/manifest.json',JSON.stringify(rows.map(({address,url,files})=>({address,source:url,files,status:files.length?'Downloaded':'No floor plan available on supplied listing'})),null,2));
