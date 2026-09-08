import fs from 'node:fs/promises';
const rows=JSON.parse(await fs.readFile('floor-plans/manifest.json','utf8'));
for(const path of ['.firecrawl/extra-downloads.json','.firecrawl/alternate-downloads.json']){
 for(const item of JSON.parse(await fs.readFile(path,'utf8'))){const r=rows.find(x=>x.address===item.address);if(r&&!r.files.some(x=>x.file===item.file))r.files.push(item);}
}
const notes={
 '1618 Judah St':'The supplied link resolves to 1616 Judah St. Plans cover multiple levels of the building; unit attribution is unverified.',
 '953 Leavenworth St':'Plan covers the entire 949-953 Leavenworth building, including unit 953; the plan states 1,635 sq ft for unit 953, differing from the supplied table.',
 '2751 15th Ave':'Includes a floor-plan PDF and a site-plan PDF.',
 '525 7th Ave':'Supplied Realtor URL uses 523 7th Ave.',
 '1066 Bryant St':'Supplied Realtor URL uses 1070 Bryant St.'
};
for(const r of rows){r.status=r.files.length?'Downloaded':'Not recovered';r.notes=notes[r.address]||'';}
await fs.writeFile('floor-plans/manifest.json',JSON.stringify(rows,null,2));
const n=rows.filter(x=>x.files.length).length;
const count=rows.reduce((n,x)=>n+x.files.length,0);
const report=`# San Francisco floor plans\n\nChecked September 8, 2026. Downloaded ${count} files covering ${n} of ${rows.length} requested addresses.\n\nMany supplied listings now show one photo and no floor-plan download. Alternate property websites and Redfin galleries were checked. Some remaining floor-plan references return HTTP 404; they are not included as downloaded files. “Not recovered” does not establish that no plan exists elsewhere.\n\nThe supplied table was not independently verified. Building-wide plans and address discrepancies are noted below.\n\n| Requested address | Result | Files | Notes |\n| --- | --- | --- | --- |\n${rows.map(r=>`| [${r.address}](${r.source}) | ${r.status} | ${r.files.map(f=>`[${f.file}](${f.file})`).join(', ')} | ${r.notes} |`).join('\n')}\n\nDetailed image URLs and alternate source pages are recorded in manifest.json.\n`;
await fs.writeFile('floor-plans/README.md',report);
const allowed=new Set(rows.flatMap(x=>x.files.map(f=>f.file)));
for(const file of ['3052-sacramento-st.jpg','20-belvedere-st-1.jpg'])if(!allowed.has(file))await fs.unlink(`floor-plans/${file}`).catch(()=>{});
console.log({addresses:n,files:count,total:rows.length});
